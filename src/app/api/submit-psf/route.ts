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
async function processPsfInBackground(supabase: SupabaseClient, userId: string, questionWord: string, arrayBuffer: ArrayBuffer) {
  const startTime = Date.now();
  
  try {
    // 빈 오디오 파일 처리
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'PSF', question: questionWord, is_correct: false,
          error_type: 'hesitation', correct_segments: 0, target_segments: null,
          processing_time_ms: Date.now() - startTime
      });
      console.log(`[PSF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: hesitation, 처리시간: ${Date.now() - startTime}ms`);
      return;
    }

    // 오디오 파일 크기 검증 (최소 1KB, 최대 10MB)
    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'PSF', question: questionWord, is_correct: false,
          error_type: 'insufficient_audio', correct_segments: 0, target_segments: null,
          processing_time_ms: Date.now() - startTime
      });
      console.log(`[PSF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'PSF', question: questionWord, is_correct: false,
          error_type: 'audio_too_large', correct_segments: 0, target_segments: null,
          processing_time_ms: Date.now() - startTime
      });
      console.log(`[PSF 경고] 오디오 파일이 너무 큼: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    const storagePath = await generateStoragePath(userId, 'PSF');
    
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
        prompt: `This is a DIBELS 8th Phonemic Segmentation Fluency (PSF) test for Korean EFL students. The student will break words into individual phonemes (sounds).

TARGET WORD: "${questionWord}"

CRITICAL INSTRUCTIONS:
1. Accept Korean phoneme pronunciations:
   - /k/ → "크", "크어", "크으"
   - /æ/ → "애", "애이", "애으" 
   - /t/ → "트", "트으", "트어"
   - /m/ → "음", "엠", "므"
   - /p/ → "프", "피", "푸"
   - /b/ → "브", "비", "부"
   - /d/ → "드", "디", "두"
   - /g/ → "그", "기", "구"
   - /f/ → "프", "피", "푸"
   - /v/ → "브", "비", "부"
   - /s/ → "스", "시", "수"
   - /z/ → "즈", "지", "주"
   - /ʃ/ → "시", "쉬", "슈"
   - /ʒ/ → "지", "주", "즈"
   - /tʃ/ → "치", "추", "츠"
   - /dʒ/ → "지", "주", "즈"
   - /θ/ → "스", "시", "쓰"
   - /ð/ → "드", "디", "즈"
   - /n/ → "은", "엔", "느"
   - /ŋ/ → "응", "엥", "으"
   - /l/ → "을", "엘", "르"
   - /r/ → "르", "알", "어"
   - /w/ → "우", "워", "와"
   - /j/ → "이", "야", "여"
   - /h/ → "으", "허", "하"

2. Accept various response formats:
   - Korean phonemes: "크-애-트", "음-애-프"
   - English phonemes: "k-æ-t", "m-æ-p"
   - Mixed: "크-애-트", "음-애-프"
   - Space-separated: "k æ t", "m æ p"
   - Hyphen-separated: "k-æ-t", "m-æ-p"
   - Partial attempts: "크...트", "음...프"
   - Hesitations: "크...음...애...트"

3. Be extremely flexible with pronunciation variations
4. Preserve all segmentation attempts, hesitations, and repetitions
5. Return JSON: {"text": "exact transcription", "confidence": "high/medium/low", "phoneme_count": number}`,
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
      transcriptionData = { text: transcription.text, confidence: "medium", phoneme_count: 0 };
    }
    
    let studentAnswer = "";
    const confidence = transcriptionData.confidence || "medium";
    const phonemeCount = transcriptionData.phoneme_count || 0;
    
    if (transcriptionData.text && transcriptionData.text.trim()) {
        studentAnswer = transcriptionData.text.trim();
        console.log(`[PSF 음성 인식] 내용: "${studentAnswer}", 신뢰도: ${confidence}, 음소 수: ${phonemeCount}`);
    } else {
        console.warn(`[PSF 경고] 음성 인식 실패 - 내용: "${transcriptionData.text}"`);
        studentAnswer = "no_response";
    }

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 PSF test evaluator for EFL (English as a Foreign Language) students. Analyze the student's phonemic segmentation attempt with cultural and linguistic flexibility.

          TARGET WORD: "${questionWord}"
          STUDENT RESPONSE: "${studentAnswer}"

          EVALUATION GUIDELINES:
          1. Count total phonemes in the target word
          2. Accept various response formats:
             - English phonemes: "m-a-p", "b-e-e", "m a p", "b e e"
             - Korean pronunciation: "엠-에이-피", "비-이"
             - Mixed responses: "엠-에이-피"
             - Letter names: "em-ay-pee", "bee-ee-ee"
             - Partial attempts: "m...p" or "엠...피"
             - Space-separated: "s e p", "d o g"
             - Hyphen-separated: "m-a-p", "d-o-g"
          3. Be flexible with pronunciation variations common in EFL contexts
          4. Credit partial attempts and close approximations
          5. Consider cultural differences in sound production
          6. IMPORTANT: If student provides correct phoneme segmentation (even in different format), count as correct

          CATEGORIES:
          - "correct": All phonemes correctly identified in any valid format
          - "partial": Some phonemes correctly identified (1+ correct)
          - "whole_word": Student said the complete word instead of segments
          - "no_response": No clear segmentation attempt or empty response
          - "unclear": Response too unclear to evaluate

          Respond with JSON: {"evaluation": "category", "target_segments": number, "correct_segments": number, "notes": "brief explanation"}`
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const { evaluation, target_segments, correct_segments, notes } = scoringResult;
    
    // EFL 환경에 맞는 채점 기준
    const isCorrect = correct_segments > 0; // 1개 이상의 음소를 맞추면 부분 점수
    const isFullyCorrect = correct_segments === target_segments; // 모든 음소를 맞추면 완전 정답
    const errorType = !isCorrect ? evaluation : null;

    const processingTime = Date.now() - startTime;
    
    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'PSF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: errorType,
      correct_segments: correct_segments,
      target_segments: target_segments,
      audio_url: audioUrl,
      confidence_level: confidence,
      detected_phoneme_count: phonemeCount,
      processing_time_ms: processingTime,
    });

    // 더 상세한 로깅
    const resultMessage = isFullyCorrect ? '완전 정답' : 
                         isCorrect ? `부분 정답 (${correct_segments}/${target_segments})` : 
                         `오답 (${evaluation})`;
    
    console.log(`[PSF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`);
    if (notes) {
      console.log(`[PSF 채점 노트] ${notes}`);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[PSF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}, 처리시간: ${processingTime}ms`, error);
    
    // 오류 발생 시에도 데이터베이스에 기록
    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'PSF',
        question: questionWord,
        is_correct: false,
        error_type: 'processing_error',
        correct_segments: 0,
        target_segments: null,
        processing_time_ms: processingTime,
        error_details: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (dbError) {
      console.error(`[PSF 데이터베이스 오류 기록 실패] 사용자: ${userId}`, dbError);
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
    await processPsfInBackground(supabase, userId, questionWord, arrayBuffer);

    // 백그라운드 작업이 성공적으로 완료된 후 응답을 반환합니다.
    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });

  } catch (error) {
    console.error('PSF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}