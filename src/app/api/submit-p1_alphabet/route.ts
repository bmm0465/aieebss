import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import {
  hasHesitation,
  timelineToPrompt,
} from '@/lib/utils/dibelsTranscription';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { transcribeWithOpenAI } from '@/lib/services/transcriptionAdapters/openaiAdapter';

// OpenAI 클라이언트 초기화 (파일 최상단)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 규칙 셋 정의 (파일 최상단)
const letterNames: { [key: string]: string[] } = {
  A: ['a', 'ay', '에이'], B: ['b', 'bee', '비'], C: ['c', 'cee', 'see', '씨'], D: ['d', 'dee', '디'], E: ['e', 'ee', '이'],
  F: ['f', 'eff', '에프'], G: ['g', 'gee', '지'], H: ['h', 'aitch', 'haitch', '에이치'], I: ['i', 'eye', '아이'], J: ['j', 'jay', '제이'],
  K: ['k', 'kay', '케이'], L: ['l', 'ell', '엘'], M: ['m', 'em', '엠'], N: ['n', 'en', '엔'], O: ['o', 'oh', '오', '오우'],
  P: ['p', 'pee', '피'], Q: ['q', 'cue', 'que', '큐'], R: ['r', 'ar', '알'], S: ['s', 'ess', '에스'], T: ['t', 'tee', '티'],
  U: ['u', 'you', '유'], V: ['v', 'vee', '브이'], W: ['w', 'double u', 'doubleu', '더블유'], X: ['x', 'ex', '엑스'], Y: ['y', 'why', '와이'],
  Z: ['z', 'zee', 'zed', '지', '제트']
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

// Letter Names와 Letter Sounds가 유사한 알파벳 목록
// 발음이 유사하여 혼동될 수 있는 경우, Letter Name으로 인정
const similarLetterNames: { [key: string]: { names: string[], sounds: string[] } } = {
  O: {
    names: ['o', 'oh', '오', '오우'],
    sounds: ['ah', 'aw', 'uh', '아', '어', '으'] // 'oh'와 'ah'가 유사
  },
  I: {
    names: ['i', 'eye', '아이'], // '이'는 letter sound이므로 제외
    sounds: ['ih', 'i', '이'] // 'eye'와 'ih'가 유사하지만, '이'는 정확한 letter name이 아니므로 오답
  }
};

const normalizeResponse = (value: string | null | undefined) =>
  value ? value.trim().toLowerCase().replace(/[\s-]/g, '') : '';

const HESITATION_THRESHOLD_SECONDS = 5;

// [핵심 2] 백그라운드 함수가 supabase 클라이언트 객체를 인자로 받도록 수정합니다.
async function processLnfInBackground(supabase: SupabaseClient, userId: string, questionLetter: string, arrayBuffer: ArrayBuffer, isSkip: boolean = false) {
  const startTime = Date.now();
  
  try {
    // 스토리지 경로 생성 (오류가 발생해도 계속 진행)
    let storagePath;
    try {
      storagePath = await generateStoragePath(userId, 'p1_alphabet');
    } catch (storagePathError) {
      console.error('[p1_alphabet] 스토리지 경로 생성 실패:', storagePathError);
      storagePath = `p1_alphabet/${userId}/${Date.now()}.webm`; // 대체 경로 사용
    }
    // 빈 오디오 파일 처리
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'p1_alphabet', question: questionLetter,
          correct_answer: questionLetter,
          is_correct: false, error_type: isSkip ? 'Skipped' : 'Hesitation'
      });
      console.log(`[p1_alphabet 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionLetter}, 결과: ${isSkip ? 'skipped' : 'hesitation'}, 처리시간: ${Date.now() - startTime}ms`);
      return;
    }

    // 오디오 파일 크기 검증 (최소 1KB, 최대 10MB)
    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'p1_alphabet', question: questionLetter,
          is_correct: false, error_type: 'insufficient_audio'
      });
      console.log(`[p1_alphabet 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'p1_alphabet', question: questionLetter,
          is_correct: false, error_type: 'audio_too_large'
      });
      console.log(`[p1_alphabet 경고] 오디오 파일이 너무 큼: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    
    const [storageResult, transcriptionData] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(storagePath, arrayBuffer, { 
          contentType: 'audio/webm',
          upsert: false
        }),
      transcribeWithOpenAI(arrayBuffer, {
        language: 'en',
        prompt: `This is a DIBELS 8th edition Letter Naming Fluency (p1_alphabet) test for Korean EFL students. The student will name individual English letters.

CRITICAL INSTRUCTIONS:
1. Target letter: "${questionLetter}"
2. Accept Korean pronunciations: '에이' for A, '비' for B, '씨' for C, '디' for D, '이' for E, '에프' for F, '지' for G, '에이치' for H, '아이' for I, '제이' for J, '케이' for K, '엘' for L, '엠' for M, '엔' for N, '오' for O, '피' for P, '큐' for Q, '알' for R, '에스' for S, '티' for T, '유' for U, '브이' for V, '더블유' for W, '엑스' for X, '와이' for Y, '지' or '제트' for Z.
3. Accept English letter names: 'ay', 'bee', 'cee', 'dee', 'ee', 'eff', 'gee', 'aitch', 'eye', 'jay', 'kay', 'ell', 'em', 'en', 'oh', 'pee', 'cue', 'ar', 'ess', 'tee', 'you', 'vee', 'double-u', 'ex', 'why', 'zee'.
4. Be flexible with hesitations, repetitions, and partial attempts.
5. Return strict JSON with keys: "text" (string), "confidence" (string), and "segments" (array of {"start": number, "end": number, "text": string}) where start/end are seconds from audio start. Always include the segments array (empty if no speech).`,
        responseFormat: 'json',
        temperature: 0,
      }),
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    const timeline = transcriptionData.timeline;
    const confidence = transcriptionData.confidence ?? 'medium';
    const aggregatedTranscript = transcriptionData.text || '';

    // 무음 감지 강화: 타임라인이 비어있거나 실제 음성 구간이 없는 경우
    const hasActualSpeech = timeline.length > 0 && timeline.some(entry => {
      const duration = (entry.end || 0) - (entry.start || 0);
      return duration > 0.1; // 최소 0.1초 이상의 음성 구간이 있어야 함
    });

    // 전사 결과가 비어있거나 타임라인에 실제 음성이 없으면 무음으로 처리
    if (!aggregatedTranscript.trim() || !hasActualSpeech) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'p1_alphabet',
        question: questionLetter,
        correct_answer: questionLetter,
        student_answer: 'no_response',
        is_correct: false,
        error_type: isSkip ? 'Skipped' : 'Omissions',
        audio_url: audioUrl,
        transcription_results: {
          openai: {
            text: transcriptionData.text,
            confidence: transcriptionData.confidence,
            timeline: transcriptionData.timeline,
          },
        },
      });
      console.log(`[p1_alphabet 무음 감지] 사용자: ${userId}, 문제: ${questionLetter}, 타임라인: ${timeline.length}개, 전사: "${aggregatedTranscript}"`);
      return;
    }

    const cleanedAnswer = aggregatedTranscript
      ? aggregatedTranscript.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      : '';
    const studentAnswerRaw = cleanedAnswer || 'no_response';

    const upperCaseQuestion = questionLetter.toUpperCase();
    const hesitationDetected = hasHesitation(timeline, HESITATION_THRESHOLD_SECONDS);

    // 신뢰도가 낮고 타임라인에 실제 음성이 거의 없으면 오답 처리
    const totalSpeechDuration = timeline.reduce((sum, entry) => {
      return sum + Math.max(0, (entry.end || 0) - (entry.start || 0));
    }, 0);

    // 음성 구간이 0.3초 미만이면 너무 짧은 응답으로 간주
    if (totalSpeechDuration < 0.3 && confidence === 'low') {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'p1_alphabet',
        question: questionLetter,
        correct_answer: questionLetter,
        student_answer: studentAnswerRaw,
        is_correct: false,
        error_type: isSkip ? 'Skipped' : 'Omissions',
        audio_url: audioUrl,
        transcription_results: {
          openai: {
            text: transcriptionData.text,
            confidence: transcriptionData.confidence,
            timeline: transcriptionData.timeline,
          },
        },
      });
      console.log(`[p1_alphabet 짧은 응답 감지] 사용자: ${userId}, 문제: ${questionLetter}, 음성 길이: ${totalSpeechDuration.toFixed(2)}초, 신뢰도: ${confidence}`);
      return;
    }

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
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a DIBELS 8th edition Letter Naming Fluency (p1_alphabet) scorer for Korean EFL students.

Scoring rules:
- ONLY letter NAMES are correct. Letter sounds must be categorised as "Letter sounds".
- Accept Korean pronunciations of letter names ONLY when they match the exact letter name (예: '에이' for A, '비' for B, '씨' for C, '디' for D, '이' for E, '에프' for F, '지' for G, '에이치' for H, '아이' for I, '제이' for J, '케이' for K, '엘' for L, '엠' for M, '엔' for N, '오' for O, '피' for P, '큐' for Q, '알' for R, '에스' for S, '티' for T, '유' for U, '브이' for V, '더블유' for W, '엑스' for X, '와이' for Y, '지' or '제트' for Z).
- CRITICAL: For letter 'E', accept '이' (i) as correct Korean pronunciation. This is the Korean way of pronouncing the letter name 'E'.
- CRITICAL: For letter 'D', only accept '디' (di) as correct Korean pronunciation. '드' (duh) is a letter sound and must be marked as incorrect. If the transcript shows 'D' but the pronunciation sounds like '드' (duh), mark it as incorrect.
- CRITICAL: For letter 'I', only accept '아이' (ai) as correct Korean pronunciation. '이' (i) is a letter sound and must be marked as incorrect. However, note that '이' is correct for letter 'E', not for 'I'.
- CRITICAL: For letter 'S', only accept '에스' (es) as correct Korean pronunciation. '스' (s) is a letter sound and must be marked as incorrect. If the transcript shows 'S' but the pronunciation sounds like '스' (s), mark it as incorrect.
- CRITICAL: If the transcript shows a letter name (e.g., 'J', 'Q', 'R') but the timeline shows no actual speech segments or very short duration (< 0.2 seconds), mark as "Omissions" (incorrect). This indicates the transcription might be hallucinated or from background noise.
- CRITICAL: If the transcript shows the correct letter name but the timeline segments are empty or show no meaningful speech, mark as "Omissions" (incorrect). Do not trust transcripts that have no corresponding speech segments.
- SPECIAL RULE for similar-sounding letters: For letters where the letter name and letter sound are phonetically similar (e.g., 'O': "oh" vs "ah", 'I': "eye/아이" vs "ih/이"), if the student's response is phonetically close to the letter name, accept it as correct. However, for 'I', '이' is NOT acceptable - only '아이' is correct.
- IMPORTANT: When the transcript shows a single letter (e.g., 'D', 'S'), you must analyze the actual pronunciation from the audio context. If it sounds like a letter sound (e.g., '드', '스') rather than a letter name (e.g., '디', '에스'), mark it as incorrect.
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
${similarLetterNames[upperCaseQuestion] ? `Note: This letter has similar-sounding name and sound. Similar names: ${JSON.stringify(similarLetterNames[upperCaseQuestion].names)}, similar sounds: ${JSON.stringify(similarLetterNames[upperCaseQuestion].sounds)}. If the response is phonetically close to the letter name, accept it as correct.` : ''}
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
        console.warn('[p1_alphabet 평가 경고]', scoringError);
      }
    }

    const acceptedNamesNormalized = (letterNames[upperCaseQuestion] ?? []).map(normalizeResponse);
    const normalizedStudentAnswer = normalizeResponse(studentAnswerRaw);
    const normalizedRecognizedForm = normalizeResponse(evaluation.recognized_form);
    
    // 전사 결과가 정확히 타겟 알파벳 이름과 일치하는지 엄격하게 검증
    const matchesTargetLetter = normalizedStudentAnswer && acceptedNamesNormalized.includes(normalizedStudentAnswer);
    const matchesTargetByRecognizedForm = normalizedRecognizedForm && acceptedNamesNormalized.includes(normalizedRecognizedForm);
    
    // 전사 결과가 타겟과 일치하지 않으면 오답 처리 (오버라이드 방지)
    const shouldOverrideToCorrect =
      evaluation.final_score !== 'correct' &&
      matchesTargetLetter &&
      !hesitationDetected && // hesitation이 있으면 오버라이드 안 함
      totalSpeechDuration >= 0.2; // 최소 음성 길이 확인

    // 전사 결과가 타겟 알파벳 이름과 전혀 다르면 오답으로 강제 설정
    if (evaluation.final_score === 'correct' && !matchesTargetLetter && !matchesTargetByRecognizedForm) {
      // GPT가 잘못 판단한 경우: 전사 결과가 정답 목록에 없으면 오답
      const allLetterNamesFlat = Object.values(letterNames).flat().map(normalizeResponse);
      const isAnyLetterName = allLetterNamesFlat.includes(normalizedStudentAnswer);
      
      if (!isAnyLetterName && normalizedStudentAnswer !== 'noresponse') {
        // 전사 결과가 알파벳 이름도 아니면 완전히 다른 응답으로 간주
        evaluation = {
          ...evaluation,
          final_score: 'incorrect',
          error_category: 'Other',
          notes: `전사 결과 "${studentAnswerRaw}"가 타겟 알파벳 "${questionLetter}"의 이름과 일치하지 않음`,
        };
      } else if (isAnyLetterName && !matchesTargetLetter) {
        // 다른 알파벳 이름을 말한 경우
        evaluation = {
          ...evaluation,
          final_score: 'incorrect',
          error_category: 'Other',
          notes: `전사 결과 "${studentAnswerRaw}"는 다른 알파벳의 이름입니다`,
        };
      }
    }

    if (shouldOverrideToCorrect) {
      evaluation = {
        ...evaluation,
        final_score: 'correct',
        error_category: null,
        notes: evaluation.notes ?? '자동 보정: 허용된 문자 이름과 일치하는 응답',
      };
    }

    const isCorrect = evaluation.final_score === 'correct';
    const errorType = isSkip ? 'Skipped' : (isCorrect ? null : evaluation.error_category);

    const processingTime = Date.now() - startTime;
    
    // Prepare transcription_results JSONB data (OpenAI only)
    const transcriptionResults = {
      openai: {
        text: transcriptionData.text,
        confidence: transcriptionData.confidence,
        timeline: transcriptionData.timeline,
      },
    };
    
    const { error: insertError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'p1_alphabet',
      question: questionLetter,
      correct_answer: questionLetter,
      student_answer: studentAnswerRaw,
      is_correct: isCorrect,
      error_type: errorType,
      audio_url: audioUrl,
      transcription_results: transcriptionResults,
    });

    if (insertError) {
      console.error(`[p1_alphabet 데이터베이스 저장 실패] 사용자: ${userId}, 문제: ${questionLetter}, 에러:`, insertError);
      throw insertError;
    }

    const logLabel = evaluation.error_category ? `${evaluation.final_score} (${evaluation.error_category})` : evaluation.final_score;
    console.log(`[p1_alphabet 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionLetter}, 결과: ${logLabel}, Self-correction: ${evaluation.used_self_correction}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`);
    if (evaluation.notes) {
      console.log(`[p1_alphabet 채점 노트] ${evaluation.notes}`);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[p1_alphabet 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionLetter}, 처리시간: ${processingTime}ms`, error);
    
    // 오류 발생 시에도 데이터베이스에 기록
    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'p1_alphabet',
        question: questionLetter,
        correct_answer: questionLetter,
        is_correct: false,
        error_type: isSkip ? 'Skipped' : 'processing_error'
      });
    } catch (dbError) {
      console.error(`[p1_alphabet 데이터베이스 오류 기록 실패] 사용자: ${userId}`, dbError);
    }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionLetter = formData.get('question') as string;
    const userId = formData.get('userId') as string;
    const isSkip = formData.get('skip') === 'true'; // 넘어가기 플래그

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
    await processLnfInBackground(serviceClient, userId, questionLetter, arrayBuffer, isSkip);

    // 백그라운드 작업이 성공적으로 완료된 후 응답을 반환합니다.
    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });

  } catch (error) {
    console.error('p1_alphabet API 요청 처리 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}