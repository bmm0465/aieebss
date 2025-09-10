// src/app/api/submit-nwf/route.ts

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
        user_id: userId, test_type: 'NWF', question: questionWord, is_correct: false,
        error_type: 'hesitation', correct_letter_sounds: 0, is_whole_word_correct: false
      });
      return NextResponse.json({ evaluation: 'hesitation', correctLetterSounds: 0, wholeWordRead: false });
    }
    
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    const audioFileName = `nwf/${userId}/${Date.now()}.webm`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('student-recordings')
      .upload(audioFileName, audioBuffer, { contentType: 'audio/webm' });

    if (storageError) throw new Error(`Storage 업로드 실패: ${storageError.message}`);
    const audioUrl = storageData.path;

    const transcriptionPrompt = `The student is reading a nonsense word or segmenting its sounds. For example, for 'hap', they might say 'h-a-p' or 'hap'. Possible nonsense words and their segmentations: 'nuf' (n-u-f), 'tib' (t-i-b), 'vog' (v-o-g), 'jez' (j-e-z).`;
    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe',
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      language: 'en',
      prompt: transcriptionPrompt,
    });
    const studentAnswer = transcription.text.trim();

    // --- [핵심 수정] DIBELS NWF 규칙 기반의 이중 채점 프롬프트 ---
    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 NWF test evaluator.
          - The target nonsense word is: "${questionWord}"
          - The student's response is: "${studentAnswer}"

          Analyze the response based on DIBELS rules for two separate scores:
          1.  **Correct Letter Sounds (CLS):** Count how many individual letter sounds the student produced correctly. For "${questionWord}", the individual sounds are ${questionWord.split('').join(', ')}. Compare the student's response to these sounds.
          2.  **Whole Word Read (WWR):** Determine if the student read the entire word as a single, blended unit correctly.
          
          Respond ONLY with a JSON object in the format: 
          {
            "correct_letter_sounds": number, // The count of correctly produced letter sounds.
            "is_whole_word_correct": boolean // True if the whole word was read correctly.
          }`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{"correct_letter_sounds": 0, "is_whole_word_correct": false}');
    const correctLetterSounds = scoringResult.correct_letter_sounds || 0;
    const isWholeWordCorrect = scoringResult.is_whole_word_correct || false;

    // 4. 데이터베이스에 상세 결과 저장
    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'NWF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: correctLetterSounds > 0 || isWholeWordCorrect, // 둘 중 하나라도 맞으면 일단 '정답'으로 간주
      correct_letter_sounds: correctLetterSounds,
      is_whole_word_correct: isWholeWordCorrect,
      audio_url: audioUrl,
    });

    return NextResponse.json({ correctLetterSounds, isWholeWordCorrect });

  } catch (error) {
    console.error('NWF API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}