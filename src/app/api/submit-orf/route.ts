import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient as createClientSide } from '@/lib/supabase/client';
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
        .upload(`orf/${userId}/${Date.now()}.webm`, arrayBuffer, { 
          contentType: 'audio/webm',
          upsert: false
        }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-mini-transcribe',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        // 자동 언어 감지
        response_format: 'json',
        prompt: `This is a DIBELS 8th Oral Reading Fluency (ORF) test for EFL students. The student will read a passage aloud. Accept various response formats:
        - Correct English reading: "The cat sat on the mat."
        - Korean pronunciation: "더 캣 샛 온 더 맷"
        - Mixed responses: "더 cat sat on 더 mat"
        - Mispronunciations: "The cat sit on the mat"
        - Partial attempts: "The cat... sat... on..."
        - Hesitations and corrections: "The cat, um, sat on the mat"
        - Word substitutions: "The dog sat on the mat" (for "cat")
        - Word omissions: "The cat sat the mat" (missing "on")
        - Word additions: "The cat sat down on the mat"
        - Repetitions: "The cat, the cat sat on the mat"
        Transcribe exactly what you hear, preserving all reading attempts, hesitations, and natural reading patterns.`,
      })
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    let studentAnswer = "";
    
    if (transcription.text && transcription.text.trim()) {
        studentAnswer = transcription.text;
        console.log(`[ORF 음성 인식] 내용: "${studentAnswer}"`);
    } else {
        console.warn(`[ORF 경고] 음성 인식 실패 - 내용: "${transcription.text}"`);
        studentAnswer = "no_response";
    }
    
    const passageWords = questionPassage.split(/\s+/);

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert DIBELS 8 ORF test evaluator for EFL students. Analyze oral reading fluency with cultural flexibility.

          ORIGINAL PASSAGE: "${questionPassage}"
          STUDENT READING: "${studentAnswer}"
          TIME TAKEN: ${timeTaken} seconds

          EVALUATION GUIDELINES:
          1. Accept various response formats:
             - Correct English reading: "The cat sat on the mat."
             - Korean pronunciation: "더 캣 샛 온 더 맷"
             - Mixed responses: "더 cat sat on 더 mat"
             - Mispronunciations: "The cat sit on the mat"
             - Hesitations: "The cat, um, sat on the mat"
          2. Be flexible with pronunciation variations in EFL contexts
          3. Credit partial attempts and close approximations
          4. Consider cultural differences in reading fluency

          DIBELS ORF RULES:
          - Count words read correctly
          - Apply discontinue rule if needed
          - Analyze error patterns

          Respond with JSON:
          {
            "words_correct": integer,
            "discontinue_rule_met": boolean,
            "error_details": { ... },
            "notes": "brief explanation"
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

    const accuracyPercent = Math.round((wordsCorrect / passageWords.length) * 100);
    console.log(`[ORF 비동기 처리 완료] 사용자: ${userId}, 결과: ${wordsCorrect}개 단어 정확 (WCPM: ${wcpm}, 정확도: ${accuracyPercent}%)`);

  } catch (error) {
    console.error(`[ORF 비동기 처리 에러] 사용자: ${userId}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionPassage = formData.get('question') as string;
    const userId = formData.get('userId') as string;
    const timeTaken = parseInt(formData.get('timeTaken') as string, 10);
    const authToken = formData.get('authToken') as string;

    if (!audioBlob || !questionPassage || !userId || isNaN(timeTaken) || !authToken) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    // 클라이언트 사이드 클라이언트로 사용자 인증 확인
    const supabaseClient = createClientSide();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authToken);
    
    if (userError || !user || user.id !== userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 서버 클라이언트 생성 (관리자 권한으로 Storage 접근)
    const supabase = createServiceClient();

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