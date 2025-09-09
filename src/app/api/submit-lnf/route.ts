import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Supabase 클라이언트 초기화 (서버 환경)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 보안을 위해 Service Role 키 사용
);

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionLetter = formData.get('question') as string;
    const userId = formData.get('userId') as string;

    if (!audioBlob || !questionLetter || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    // 1. 음성 파일을 Supabase Storage에 업로드
    const audioFileName = `lnf/${userId}/${Date.now()}.webm`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('student-recordings')
      .upload(audioFileName, audioBuffer, {
        contentType: 'audio/webm',
      });

    if (storageError) throw new Error(`Storage 업로드 실패: ${storageError.message}`);
    
    const audioUrl = storageData.path;

    // 2. OpenAI를 사용한 음성 인식 (STT) - 영어로만 인식하도록 프롬프트 추가
    const transcriptionPrompt = "This is an English letter naming fluency test. The student will say the names of English letters, such as A, Bee, Cee, Dee, Ee, Eff, Gee, Aitche, I, Jay, Kay, Ell, Em, En, O, Pee, Queue, Ar, Ess, Tee, You, Vee, Double-U, Ex, Why, Zee.";

    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe', // 요청하신 모델명
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      language: 'en',
      prompt: transcriptionPrompt,
    });
    const studentAnswer = transcription.text;

    // 3. LLM을 사용한 채점
    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini', // 요청하신 모델명
      messages: [
        {
          role: 'system',
          content: `You are an English phonics assessment AI. A student was shown the letter "${questionLetter}" and said "${studentAnswer}". Determine if the student's answer is correct. The student must say the letter name, not the letter sound. Respond ONLY with a JSON object in the format: {"is_correct": boolean}. For example, if the letter is 'A' and the student says 'ay', it's correct. If they say 'apple' or 'ah', it's incorrect.`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const isCorrect = scoringResult.is_correct || false;

    // 4. 채점 결과를 데이터베이스에 저장
    const { error: dbError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'LNF',
      question: questionLetter,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      audio_url: audioUrl,
    });

    if (dbError) throw new Error(`DB 저장 실패: ${dbError.message}`);

    // 프론트엔드에 결과 반환
    return NextResponse.json({
      studentAnswer,
      isCorrect,
      audioUrl,
    });

  } catch (error) {
    console.error('LNF API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}