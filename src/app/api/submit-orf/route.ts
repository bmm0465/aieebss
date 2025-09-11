import { NextResponse } from 'next/server';
// [핵심 1] 새로운 서버용 클라이언트와 cookies를 import 합니다.
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// [핵심 2] 오래 걸리는 모든 작업을 처리하는 별도의 비동기 함수
async function processOrfInBackground(supabase: SupabaseClient, userId: string, questionPassage: string, arrayBuffer: ArrayBuffer, timeTaken: number) {
  try {
    const [storageResult, transcription] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(`orf/${userId}/${Date.now()}.webm`, arrayBuffer, { contentType: 'audio/webm' }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-mini-transcribe',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        language: 'en',
        prompt: "The student is reading a short story passage aloud for an oral reading fluency test.",
      })
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    const studentAnswer = transcription.text;
    const passageWords = questionPassage.split(/\s+/);

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert DIBELS 8 ORF test evaluator.
          - The original passage is: "${questionPassage}"
          - The student's transcribed reading is: "${studentAnswer}"
          Analyze the student's reading based on DIBELS ORF rules...
          Respond ONLY with a JSON object in the format:
          {
            "words_correct": integer,
            "discontinue_rule_met": boolean,
            "error_details": { ... }
          }`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const wordsCorrect = scoringResult.words_correct || 0;
    const errorDetails = scoringResult.error_details || {};
    
    const wcpm = timeTaken > 0 ? Math.round((wordsCorrect / timeTaken) * 60) : 0;
    const accuracy = passageWords.length > 0 ? wordsCorrect / passageWords.length : 0;

    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'ORF',
      question: questionPassage,
      student_answer: studentAnswer,
      wcpm: wcpm,
      accuracy: accuracy,
      time_taken: timeTaken,
      error_details: errorDetails,
      audio_url: audioUrl,
    });

    console.log(`[ORF 비동기 처리 완료] 사용자: ${userId}`);

  } catch (error) {
    console.error(`[ORF 비동기 처리 에러] 사용자: ${userId}`, error);
  }
}

export async function POST(request: Request) {
  // [핵심 3] POST 함수 내부에서만 supabase 클라이언트를 생성합니다.
  const supabase = createClient();
  
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionPassage = formData.get('question') as string;
    const userId = formData.get('userId') as string;
    const timeTaken = parseInt(formData.get('timeTaken') as string, 10);

    if (!audioBlob || !questionPassage || !userId || isNaN(timeTaken)) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const arrayBuffer = await audioBlob.arrayBuffer();

    // [핵심 4] 오래 걸리는 작업을 '기다리지 않고' 백그라운드에서 실행하도록 호출
    processOrfInBackground(supabase, userId, questionPassage, arrayBuffer, timeTaken);

    // 프론트엔드에는 "파일 접수 완료" 신호를 즉시 보냄
    return NextResponse.json({ message: '요청이 성공적으로 접수되었습니다.' }, { status: 202 });

  } catch (error) {
    console.error('ORF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}