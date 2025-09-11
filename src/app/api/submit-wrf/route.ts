import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient as createClientSide } from '@/lib/supabase/client';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// [핵심 2] 백그라운드 함수가 supabase 클라이언트 객체를 인자로 받도록 수정합니다.
async function processWrfInBackground(supabase: SupabaseClient, userId: string, questionWord: string, arrayBuffer: ArrayBuffer) {
  try {
    // 3초 주저 등으로 빈 파일이 온 경우
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'WRF', question: questionWord, is_correct: false, error_type: 'hesitation'
      });
      console.log(`[WRF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: hesitation (empty audio)`);
      return;
    }

    const [storageResult, transcription] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(`wrf/${userId}/${Date.now()}.webm`, arrayBuffer, { 
          contentType: 'audio/webm',
          upsert: false
        }),
      openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        // 자동 언어 감지
        response_format: 'json',
        prompt: `This is a DIBELS WRF test for an EFL student. The student will read English sight words. Please transcribe exactly what they say, including:
        - Correct English words: "the", "is", "can", "little", "play"
        - Korean pronunciation: "더", "이즈", "캔", "리틀", "플레이"
        - Mixed responses: "더-이즈-캔"
        - Partial attempts: "th...", "c...an"
        - Mispronunciations: "teh" (for "the"), "cun" (for "can")
        Transcribe literally what you hear, preserving the reading attempt.`,
      })
    ]);
    
    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    let studentAnswer = "";
    
    if (transcription.text && transcription.text.trim()) {
        studentAnswer = transcription.text.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        console.log(`[WRF 음성 인식] 내용: "${studentAnswer}"`);
    } else {
        console.warn(`[WRF 경고] 음성 인식 실패 - 내용: "${transcription.text}"`);
        studentAnswer = "no_response";
    }

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 WRF test evaluator for EFL students. Analyze sight word reading with cultural flexibility.

          TARGET WORD: "${questionWord}"
          STUDENT RESPONSE: "${studentAnswer}"
          DETECTED LANGUAGE: "${detectedLanguage}"

          EVALUATION GUIDELINES:
          1. Accept various response formats:
             - Correct English: "the", "is", "can", "little", "play"
             - Korean pronunciation: "더", "이즈", "캔", "리틀", "플레이"
             - Mixed responses: "더-이즈-캔"
             - Partial attempts: "th...", "c...an"
             - Common mispronunciations: "teh" (for "the"), "cun" (for "can")
          2. Be flexible with pronunciation variations in EFL contexts
          3. Credit close approximations and partial attempts

          CATEGORIES:
          - "correct": Word read correctly or close approximation
          - "sounded_out": Student sounded out the word
          - "incorrect_word": Clearly wrong pronunciation
          - "unintelligible": Response too unclear to evaluate

          Respond with JSON: {"evaluation": "category_name", "notes": "brief explanation"}`,
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

    const resultMessage = isCorrect ? '정답' : `오답 (${evaluation})`;
    console.log(`[WRF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}`);

  } catch (error) {
    console.error(`[WRF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionWord = formData.get('question') as string;
    const userId = formData.get('userId') as string;
    const authToken = formData.get('authToken') as string;

    if (!audioBlob || !questionWord || !userId || !authToken) {
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

    // [핵심 4] 생성된 supabase 객체를 백그라운드 함수로 전달합니다.
    processWrfInBackground(supabase, userId, questionWord, arrayBuffer);

    // 프론트엔드에는 "파일 접수 완료" 신호를 즉시 보냄
    return NextResponse.json({ message: '요청이 성공적으로 접수되었습니다.' }, { status: 202 });

  } catch (error) {
    console.error('WRF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}