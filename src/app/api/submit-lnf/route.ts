import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import {
  hasHesitation,
  parseTranscriptionResult,
  timelineToPrompt,
} from '@/lib/utils/dibelsTranscription';
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
  K: ['k', 'kay'], L: ['l', 'ell'], M: ['m', 'em'], N: ['n', 'en'], O: ['o', 'oh', '오', '오우'],
  P: ['p', 'pee'], Q: ['q', 'cue', 'que'], R: ['r', 'ar'], S: ['s', 'ess'], T: ['t', 'tee'],
  U: ['u', 'you'], V: ['v', 'vee'], W: ['w', 'double u', 'doubleu'], X: ['x', 'ex'], Y: ['y', 'why'],
  Z: ['z', 'zee', 'zed']
};
// 알파벳 발음 (letterSounds) - LNF에서는 발음은 오답 처리
// 참고: 모든 알파벳에 대해 정의하여 발음으로 답변한 경우 일관되게 감지
const letterSounds: { [key: string]: string[] } = {
  A: ['ah', 'a', '애'], B: ['buh', 'b', '브'], C: ['kuh', 'k', '크', '쓰'], D: ['duh', 'd', '드'], 
  E: ['eh', 'e', '에'], F: ['fuh', 'f', '프'], G: ['guh', 'g', '그'], H: ['huh', 'h', '흐'],
  I: ['ih', 'i', '이'], J: ['juh', 'j', '즈'], K: ['kuh', 'k', '크'], L: ['luh', 'l', '을'],
  M: ['muh', 'm', '음'], N: ['nuh', 'n', '은'], O: ['ah', 'aw', 'uh', '아', '어', '으'], P: ['puh', 'p', '프'],
  Q: ['kwuh', 'qu', '쿠'], R: ['ruh', 'r', '르'], S: ['suh', 's', '스'], T: ['tuh', 't', '트'],
  U: ['uh', 'u', '어'], V: ['vuh', 'v', '브'], W: ['wuh', 'w', '우'], X: ['ks', 'x', '엑스'],
  Y: ['yuh', 'y', '이'], Z: ['zuh', 'z', '즈']
};

const normalizeResponse = (value: string | null | undefined) =>
  value ? value.trim().toLowerCase().replace(/[\s-]/g, '') : '';

const HESITATION_THRESHOLD_SECONDS = 5;

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
          is_correct: false, error_type: 'Hesitation'
      });
      console.log(`[LNF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionLetter}, 결과: hesitation, 처리시간: ${Date.now() - startTime}ms`);
      return;
    }

    // 오디오 파일 크기 검증 (최소 1KB, 최대 10MB)
    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'LNF', question: questionLetter,
          is_correct: false, error_type: 'insufficient_audio'
      });
      console.log(`[LNF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'LNF', question: questionLetter,
          is_correct: false, error_type: 'audio_too_large'
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
        file: new File([arrayBuffer], 'audio.webm', { type: 'audio/webm' }),
        language: 'en',
        response_format: 'json',
        temperature: 0,
        prompt: `This is a DIBELS 8th edition Letter Naming Fluency (LNF) test for Korean EFL students. The student will name individual English letters.

CRITICAL INSTRUCTIONS:
1. Target letter: "${questionLetter}"
2. Accept Korean pronunciations: '에이' for A, '비' for B, '씨' for C, '디' for D, '이' for E, '에프' for F, '지' for G, '에이치' for H, '아이' for I, '제이' for J, '케이' for K, '엘' for L, '엠' for M, '엔' for N, '오' for O, '피' for P, '큐' for Q, '알' for R, '에스' for S, '티' for T, '유' for U, '브이' for V, '더블유' for W, '엑스' for X, '와이' for Y, '지' for Z.
3. Accept English letter names: 'ay', 'bee', 'cee', 'dee', 'ee', 'eff', 'gee', 'aitch', 'eye', 'jay', 'kay', 'ell', 'em', 'en', 'oh', 'pee', 'cue', 'ar', 'ess', 'tee', 'you', 'vee', 'double-u', 'ex', 'why', 'zee'.
4. Be flexible with hesitations, repetitions, and partial attempts.
5. Return strict JSON with keys: "text" (string), "confidence" (string), and "segments" (array of {"start": number, "end": number, "text": string}) where start/end are seconds from audio start. Always include the segments array (empty if no speech).`,
      })
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    const transcriptionData = parseTranscriptionResult(transcription);
    const timeline = transcriptionData.timeline;
    const confidence = transcriptionData.confidence ?? 'medium';
    const aggregatedTranscript = transcriptionData.text || '';

    const cleanedAnswer = aggregatedTranscript
      ? aggregatedTranscript.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      : '';
    const studentAnswerRaw = cleanedAnswer || 'no_response';

    const upperCaseQuestion = questionLetter.toUpperCase();
    const hesitationDetected = hasHesitation(timeline, HESITATION_THRESHOLD_SECONDS);

    type LnfEvaluation = {
      final_score: 'correct' | 'incorrect';
      error_category: 'Letter reversals' | 'Letter sounds' | 'Omissions' | 'Hesitation' | 'Other' | null;
      used_self_correction: boolean;
      self_correction_within_seconds: number | null;
      recognized_form?: string | null;
      notes?: string;
    };

    let evaluation: LnfEvaluation = {
      final_score: 'incorrect',
      error_category: hesitationDetected ? 'Hesitation' : 'Other',
      used_self_correction: false,
      self_correction_within_seconds: null,
      recognized_form: null,
      notes: hesitationDetected ? 'No response within 5 seconds' : undefined,
    };

    if (!hesitationDetected) {
      try {
        const scoringResponse = await openai.chat.completions.create({
          model: 'gpt-5',
          messages: [
            {
              role: 'system',
              content: `You are a DIBELS 8th edition Letter Naming Fluency (LNF) scorer for Korean EFL students.

Scoring rules:
- ONLY letter NAMES are correct. Letter sounds must be categorised as "Letter sounds".
- Accept Korean pronunciations of letter names (예: '에이', '비', '씨', ...).
- Hesitation threshold is ${HESITATION_THRESHOLD_SECONDS} seconds from audio start to first meaningful attempt.
- If a student self-corrects to the correct letter name within ${HESITATION_THRESHOLD_SECONDS} seconds of their first incorrect attempt, mark the response correct and set "used_self_correction" to true.
- If the first meaningful attempt occurs after ${HESITATION_THRESHOLD_SECONDS} seconds, the correct response is overridden by "Hesitation".
- Error categories must be one of: "Letter reversals", "Letter sounds", "Omissions", "Hesitation", "Other". Use "Other" only when no other category fits.

Return strict JSON: {
  "final_score": "correct" | "incorrect",
  "error_category": null | "Letter reversals" | "Letter sounds" | "Omissions" | "Hesitation" | "Other",
  "used_self_correction": boolean,
  "self_correction_within_seconds": number | null,
  "recognized_form": string | null,
  "notes": string | null
}`,
            },
            {
              role: 'user',
              content: `Target letter: ${upperCaseQuestion}
Acceptable letter names: ${JSON.stringify(letterNames[upperCaseQuestion] ?? [])}
Letter sounds (incorrect category): ${JSON.stringify(letterSounds[upperCaseQuestion] ?? [])}
Aggregated transcript: ${aggregatedTranscript}
Timeline JSON: ${timelineToPrompt(timeline)}
Hesitation threshold seconds: ${HESITATION_THRESHOLD_SECONDS}`,
            },
          ],
          response_format: { type: 'json_object' },
        });

        const parsedEvaluation = JSON.parse(
          scoringResponse.choices[0].message.content ||
            '{"final_score":"incorrect","error_category":"Other","used_self_correction":false,"self_correction_within_seconds":null}'
        );

        evaluation = {
          final_score: parsedEvaluation.final_score === 'correct' ? 'correct' : 'incorrect',
          error_category:
            parsedEvaluation.final_score === 'correct'
              ? null
              : (parsedEvaluation.error_category as LnfEvaluation['error_category']) ?? 'Other',
          used_self_correction: Boolean(parsedEvaluation.used_self_correction),
          self_correction_within_seconds:
            typeof parsedEvaluation.self_correction_within_seconds === 'number'
              ? parsedEvaluation.self_correction_within_seconds
              : null,
          recognized_form:
            typeof parsedEvaluation.recognized_form === 'string'
              ? parsedEvaluation.recognized_form
              : null,
          notes:
            typeof parsedEvaluation.notes === 'string' && parsedEvaluation.notes.length > 0
              ? parsedEvaluation.notes
              : undefined,
        };
      } catch (scoringError) {
        console.warn('[LNF 평가 경고]', scoringError);
      }
    }

    const acceptedNamesNormalized = (letterNames[upperCaseQuestion] ?? []).map(normalizeResponse);
    const normalizedStudentAnswer = normalizeResponse(studentAnswerRaw);
    const normalizedRecognizedForm = normalizeResponse(evaluation.recognized_form);
    const shouldOverrideToCorrect =
      evaluation.final_score !== 'correct' &&
      ((normalizedStudentAnswer && acceptedNamesNormalized.includes(normalizedStudentAnswer)) ||
        (normalizedRecognizedForm && acceptedNamesNormalized.includes(normalizedRecognizedForm)));

    if (shouldOverrideToCorrect) {
      evaluation = {
        ...evaluation,
        final_score: 'correct',
        error_category: null,
        notes: evaluation.notes ?? '자동 보정: 허용된 문자 이름과 일치하는 응답',
      };
    }

    const isCorrect = evaluation.final_score === 'correct';
    const errorType = isCorrect ? null : evaluation.error_category;

    const processingTime = Date.now() - startTime;
    
    const { error: insertError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'LNF',
      question: questionLetter,
      student_answer: studentAnswerRaw,
      is_correct: isCorrect,
      error_type: errorType,
      audio_url: audioUrl,
    });

    if (insertError) {
      console.error(`[LNF 데이터베이스 저장 실패] 사용자: ${userId}, 문제: ${questionLetter}, 에러:`, insertError);
      throw insertError;
    }

    const logLabel = evaluation.error_category ? `${evaluation.final_score} (${evaluation.error_category})` : evaluation.final_score;
    console.log(`[LNF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionLetter}, 결과: ${logLabel}, Self-correction: ${evaluation.used_self_correction}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`);
    if (evaluation.notes) {
      console.log(`[LNF 채점 노트] ${evaluation.notes}`);
    }

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
        error_type: 'processing_error'
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