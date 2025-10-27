import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient as createClientSide } from '@/lib/supabase/client';
import { generateStoragePath } from '@/lib/storage-path';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// [핵심 2] 백그라운드 함수가 supabase 클라이언트 객체를 인자로 받도록 수정합니다.
async function processWrfInBackground(supabase: SupabaseClient, userId: string, questionWord: string, arrayBuffer: ArrayBuffer) {
  const startTime = Date.now();
  
  try {
    // 빈 오디오 파일 처리
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'WRF', question: questionWord, is_correct: false, error_type: 'hesitation',
        processing_time_ms: Date.now() - startTime
      });
      console.log(`[WRF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: hesitation, 처리시간: ${Date.now() - startTime}ms`);
      return;
    }

    // 오디오 파일 크기 검증 (최소 1KB, 최대 10MB)
    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'WRF', question: questionWord, is_correct: false,
        error_type: 'insufficient_audio', processing_time_ms: Date.now() - startTime
      });
      console.log(`[WRF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'WRF', question: questionWord, is_correct: false,
        error_type: 'audio_too_large', processing_time_ms: Date.now() - startTime
      });
      console.log(`[WRF 경고] 오디오 파일이 너무 큼: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    const storagePath = await generateStoragePath(userId, 'WRF');
    
    const [storageResult, transcription] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(storagePath, arrayBuffer, { 
          contentType: 'audio/webm',
          upsert: false
        }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-transcribe',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        language: 'en',
        response_format: 'json',
        prompt: `This is a DIBELS 8th Word Reading Fluency (WRF) test for Korean EFL students. The student will read English sight words.

TARGET WORD: "${questionWord}"

CRITICAL INSTRUCTIONS:
1. Accept Korean pronunciations for sight words:
   - "the" → "더", "디", "드"
   - "is" → "이즈", "이스", "즈"
   - "can" → "캔", "칸", "컨"
   - "little" → "리틀", "리틀", "리틀"
   - "play" → "플레이", "플레이", "플레이"
   - "said" → "세드", "세이드", "세드"
   - "have" → "해브", "해브", "해브"
   - "and" → "앤드", "앤", "앤드"
   - "with" → "위드", "위드", "위드"
   - "for" → "포", "포어", "포"

2. Accept various response formats:
   - Correct English: "the", "is", "can", "little", "play"
   - Korean pronunciation: "더", "이즈", "캔", "리틀", "플레이"
   - Mixed responses: "더-이즈-캔"
   - Partial attempts: "th...", "c...an", "l...ittle"
   - Common mispronunciations: "teh" (for "the"), "cun" (for "can"), "sed" (for "said")
   - Sounding out: "티-에이치-이", "아이-에스", "씨-에이-엔"
   - Hesitations: "더...이즈...캔"

3. Be extremely flexible with pronunciation variations
4. Preserve all reading attempts, hesitations, and repetitions
5. Return JSON: {"text": "exact transcription", "confidence": "high/medium/low", "pronunciation_type": "english/korean/mixed"}`
      })
    ]);
    
    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    // JSON 응답 파싱
    let transcriptionData;
    try {
      transcriptionData = JSON.parse(transcription.text);
    } catch {
      // JSON 파싱 실패 시 기본 텍스트 사용
      transcriptionData = { text: transcription.text, confidence: "medium", pronunciation_type: "mixed" };
    }
    
    let studentAnswer = "";
    const confidence = transcriptionData.confidence || "medium";
    const pronunciationType = transcriptionData.pronunciation_type || "mixed";
    
    if (transcriptionData.text && transcriptionData.text.trim()) {
        studentAnswer = transcriptionData.text.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        console.log(`[WRF 음성 인식] 내용: "${studentAnswer}", 신뢰도: ${confidence}, 발음 유형: ${pronunciationType}`);
    } else {
        console.warn(`[WRF 경고] 음성 인식 실패 - 내용: "${transcriptionData.text}"`);
        studentAnswer = "no_response";
    }

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 WRF test evaluator for EFL students. Analyze sight word reading with cultural flexibility.

          TARGET WORD: "${questionWord}"
          STUDENT RESPONSE: "${studentAnswer}"

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

    const processingTime = Date.now() - startTime;
    
    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'WRF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: errorType,
      audio_url: audioUrl,
      confidence_level: confidence,
      pronunciation_type: pronunciationType,
      processing_time_ms: processingTime,
    });

    const resultMessage = isCorrect ? '정답' : `오답 (${evaluation})`;
    console.log(`[WRF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[WRF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}, 처리시간: ${processingTime}ms`, error);
    
    // 오류 발생 시에도 데이터베이스에 기록
    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'WRF',
        question: questionWord,
        is_correct: false,
        error_type: 'processing_error',
        processing_time_ms: processingTime,
        error_details: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (dbError) {
      console.error(`[WRF 데이터베이스 오류 기록 실패] 사용자: ${userId}`, dbError);
    }
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

    // [핵심 4] 생성된 supabase 객체를 백그라운드 함수로 전달하고, 작업이 끝날 때까지 기다립니다.
    await processWrfInBackground(supabase, userId, questionWord, arrayBuffer);

    // 백그라운드 작업이 성공적으로 완료된 후 응답을 반환합니다.
    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });

  } catch (error) {
    console.error('WRF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}