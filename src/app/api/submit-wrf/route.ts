import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionWord = formData.get('question') as string;
    const userId = formData.get('userId') as string;

    if (!audioBlob || !questionWord || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    if (audioBlob.size === 0) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'WRF', question: questionWord, is_correct: false, error_type: 'hesitation'
      });
      return NextResponse.json({ evaluation: 'hesitation' });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    const audioFileName = `wrf/${userId}/${Date.now()}.webm`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('student-recordings')
      .upload(audioFileName, audioBuffer, { contentType: 'audio/webm' });

    if (storageError) throw new Error(`Storage 업로드 실패: ${storageError.message}`);
    const audioUrl = storageData.path;

    const transcriptionPrompt = "The student is reading English sight words, such as 'the', 'is', 'can', 'little', 'play'.";
    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe',
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      language: 'en',
      prompt: transcriptionPrompt,
    });
    const studentAnswer = transcription.text.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");

    // --- [핵심 수정] DIBELS WRF 규칙 기반의 상세 채점 프롬프트 ---
    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 WRF test evaluator.
          - The target word is: "${questionWord}"
          - The student's response is: "${studentAnswer}"

          Analyze the response and classify it into ONE of the following categories:
          1. "correct": The student read the whole word correctly.
          2. "sounded_out": The student said the individual sounds but did not blend them into the whole word (e.g., for 'cat', they said 'c-a-t'). This is considered incorrect.
          3. "incorrect_word": The student said a different word.
          4. "unintelligible": The response is unclear or not a word.

          Respond ONLY with a JSON object in the format: {"evaluation": "category_name"}.`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{"evaluation": "unintelligible"}');
    const evaluation = scoringResult.evaluation;
    const isCorrect = evaluation === 'correct';
    const errorType = isCorrect ? null : evaluation;

    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'WRF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: errorType,
      audio_url: audioUrl,
    });

    return NextResponse.json({ evaluation });

  } catch (error) {
    console.error('WRF API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}