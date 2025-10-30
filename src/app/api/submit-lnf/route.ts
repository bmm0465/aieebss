import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

// OpenAI 클라이언트 초기화 (파일 최상단)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 규칙 셋 정의 (파일 최상단)
const letterNames: { [key: string]: string[] } = {
  A: ['a', 'ay'], B: ['b', 'bee'], C: ['c', 'cee', 'see'], D: ['d', 'dee'], E: ['e', 'ee'],
  F: ['f', 'eff'], G: ['g', 'gee'], H: ['h', 'aitch', 'haitch'], I: ['i'], J: ['j', 'jay'],
  K: ['k', 'kay'], L: ['l', 'ell'], M: ['m', 'em'], N: ['n', 'en'], O: ['o'],
  P: ['p', 'pee'], Q: ['q', 'cue', 'que'], R: ['r', 'ar'], S: ['s', 'ess'], T: ['t', 'tee'],
  U: ['u', 'you'], V: ['v', 'vee'], W: ['w', 'double u', 'doubleu'], X: ['x', 'ex'], Y: ['y', 'why'],
  Z: ['z', 'zee', 'zed']
};
const letterSounds: { [key: string]: string[] } = {
  A: ['a', 'ah'], B: ['b', 'buh'], C: ['k', 'kuh'], D: ['d', 'duh'], E: ['e', 'eh'], F: ['f', 'fuh'],
};

// [핵심 2] 백그라운드 함수가 supabase 클라이언트 객체를 인자로 받도록 수정합니다.
async function processLnfInBackground(supabase: SupabaseClient, userId: string, questionLetter: string, arrayBuffer: ArrayBuffer) {
  const startTime = Date.now();
  
  try {
    // 스토리지 경로 생성 (오류가 발생해도 계속 진행)
    let storagePath;
    try {
      storagePath = await generateStoragePath(userId, 'LNF');
    } catch (storagePathError) {
      console.error('[LNF] 스토리지 경로 생성 실패:', storagePathError);
      storagePath = `lnf/${userId}/${Date.now()}.webm`; // 대체 경로 사용
    }
    // 빈 오디오 파일 처리
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'LNF', question: questionLetter,
          is_correct: false, error_type: 'hesitation',
          processing_time_ms: Date.now() - startTime
      });
      console.log(`[LNF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionLetter}, 결과: hesitation, 처리시간: ${Date.now() - startTime}ms`);
      return;
    }

    // 오디오 파일 크기 검증 (최소 1KB, 최대 10MB)
    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'LNF', question: questionLetter,
          is_correct: false, error_type: 'insufficient_audio',
          processing_time_ms: Date.now() - startTime
      });
      console.log(`[LNF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'LNF', question: questionLetter,
          is_correct: false, error_type: 'audio_too_large',
          processing_time_ms: Date.now() - startTime
      });
      console.log(`[LNF 경고] 오디오 파일이 너무 큼: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    
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
        prompt: `This is a DIBELS 8th Letter Naming Fluency (LNF) test for Korean EFL students. The student will name individual English letters.

CRITICAL INSTRUCTIONS:
1. Target letter: "${questionLetter}"
2. Accept Korean pronunciations: '에이' for A, '비' for B, '씨' for C, '디' for D, '이' for E, '에프' for F, '지' for G, '에이치' for H, '아이' for I, '제이' for J, '케이' for K, '엘' for L, '엠' for M, '엔' for N, '오' for O, '피' for P, '큐' for Q, '알' for R, '에스' for S, '티' for T, '유' for U, '브이' for V, '더블유' for W, '엑스' for X, '와이' for Y, '지' for Z
3. Accept English letter names: 'ay' for A, 'bee' for B, 'cee' for C, 'dee' for D, 'ee' for E, 'eff' for F, 'gee' for G, 'aitch' for H, 'eye' for I, 'jay' for J, 'kay' for K, 'ell' for L, 'em' for M, 'en' for N, 'oh' for O, 'pee' for P, 'cue' for Q, 'ar' for R, 'ess' for S, 'tee' for T, 'you' for U, 'vee' for V, 'double-u' for W, 'ex' for X, 'why' for Y, 'zee' for Z
4. Accept letter sounds: 'ah' for A, 'buh' for B, 'kuh' for C, 'duh' for D, 'eh' for E, 'fuh' for F, 'guh' for G, 'huh' for H, 'ih' for I, 'juh' for J, 'kuh' for K, 'luh' for L, 'muh' for M, 'nuh' for N, 'oh' for O, 'puh' for P, 'qu' for Q, 'ruh' for R, 'suh' for S, 'tuh' for T, 'uh' for U, 'vuh' for V, 'wuh' for W, 'ks' for X, 'yuh' for Y, 'zuh' for Z
5. Be flexible with hesitations, repetitions, and partial attempts
6. Return JSON: {"text": "exact transcription", "confidence": "high/medium/low"}`,
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
      transcriptionData = { text: transcription.text, confidence: "medium" };
    }
    
    const studentAnswerRaw = transcriptionData.text?.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") || "";
    const studentAnswer = studentAnswerRaw.toLowerCase();
    const confidence = transcriptionData.confidence || "medium";

    let evaluation: string;
    const upperCaseQuestion = questionLetter.toUpperCase();

    if (letterNames[upperCaseQuestion]?.includes(studentAnswer)) {
      evaluation = 'correct';
    } else if (letterSounds[upperCaseQuestion]?.includes(studentAnswer)) {
      evaluation = 'letter_sound';
    } else {
      const scoringResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [ 
          { role: 'system', content: `You are a DIBELS 8 LNF test evaluator. Please respond with a JSON object containing the evaluation result.` },
          { role: 'user', content: `Evaluate this student's pronunciation of letter "${questionLetter}": "${studentAnswer}". Return JSON with "evaluation" field.` }
        ],
        response_format: { type: 'json_object' },
      });
      const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{"evaluation": "unintelligible"}');
      evaluation = scoringResult.evaluation;
    }
    
    const isCorrect = evaluation === 'correct';
    const errorType = isCorrect ? null : evaluation;

    const processingTime = Date.now() - startTime;
    
    const { error: insertError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'LNF',
      question: questionLetter,
      student_answer: studentAnswerRaw,
      is_correct: isCorrect,
      error_type: errorType,
      audio_url: audioUrl,
      confidence_level: confidence,
      processing_time_ms: processingTime,
    });

    if (insertError) {
      console.error(`[LNF 데이터베이스 저장 실패] 사용자: ${userId}, 문제: ${questionLetter}, 에러:`, insertError);
      throw insertError;
    }

    console.log(`[LNF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionLetter}, 결과: ${evaluation}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[LNF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionLetter}, 처리시간: ${processingTime}ms`, error);
    
    // 오류 발생 시에도 데이터베이스에 기록
    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'LNF',
        question: questionLetter,
        is_correct: false,
        error_type: 'processing_error',
        processing_time_ms: processingTime,
        error_details: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (dbError) {
      console.error(`[LNF 데이터베이스 오류 기록 실패] 사용자: ${userId}`, dbError);
    }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionLetter = formData.get('question') as string;
    const userId = formData.get('userId') as string;

    if (!audioBlob || !questionLetter || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    // 서버 사이드 클라이언트로 사용자 인증 확인
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user || user.id !== userId) {
      console.log('API: Auth failed - user:', user?.id, 'userId:', userId, 'error:', userError);
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 서버 클라이언트 생성 (관리자 권한으로 Storage 접근)
    const serviceClient = createServiceClient();
    
    const arrayBuffer = await audioBlob.arrayBuffer();

    // [핵심 4] 생성된 supabase 객체를 백그라운드 함수로 전달하고, 작업이 끝날 때까지 기다립니다.
    await processLnfInBackground(serviceClient, userId, questionLetter, arrayBuffer);

    // 백그라운드 작업이 성공적으로 완료된 후 응답을 반환합니다.
    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });

  } catch (error) {
    console.error('LNF API 요청 처리 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}