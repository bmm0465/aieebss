import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  hasHesitation,
  timelineToPrompt,
} from '@/lib/utils/dibelsTranscription';
import { transcribeAll, getPrimaryTranscription } from '@/lib/services/transcriptionService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const HESITATION_THRESHOLD_SECONDS = 5;

type WrfOverall = 'correct' | 'incorrect';

type WrfErrorCategory =
  | 'Mispronounced words'
  | 'Sounded out words'
  | 'Word order'
  | 'Omissions'
  | 'Hesitation'
  | 'Other'
  | null;

type WrfPronunciationType = 'english' | 'korean' | 'mixed' | 'other';

interface WrfEvaluation {
  overall: WrfOverall;
  error_category: WrfErrorCategory;
  pronunciation_type: WrfPronunciationType;
  used_self_correction: boolean;
  self_correction_within_seconds: number | null;
  notes?: string;
}

async function processWrfInBackground(
  supabase: SupabaseClient,
  userId: string,
  questionWord: string,
  arrayBuffer: ArrayBuffer,
) {
  const startTime = Date.now();

  try {
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'WRF',
        question: questionWord,
        is_correct: false,
        error_type: 'Hesitation',
        processing_time_ms: Date.now() - startTime,
      });
      console.log(
        `[WRF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: Hesitation (빈 오디오), 처리시간: ${Date.now() - startTime}ms`,
      );
      return;
    }

    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'WRF',
        question: questionWord,
        is_correct: false,
        error_type: 'insufficient_audio',
        processing_time_ms: Date.now() - startTime,
      });
      console.log(`[WRF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'WRF',
        question: questionWord,
        is_correct: false,
        error_type: 'audio_too_large',
        processing_time_ms: Date.now() - startTime,
      });
      console.log(`[WRF 경고] 오디오 파일이 너무 큼: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    const storagePath = await generateStoragePath(userId, 'WRF');

    const [storageResult, allTranscriptions] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(storagePath, arrayBuffer, {
          contentType: 'audio/webm',
          upsert: false,
        }),
      transcribeAll(arrayBuffer, {
        language: 'en',
        prompt: `This is a DIBELS 8th edition Word Reading Fluency (WRF) test for Korean EFL students. The student will read English sight words.

TARGET WORD: "${questionWord}"

CRITICAL INSTRUCTIONS:
1. Accept Korean pronunciations and mixed readings.
2. Capture hesitations, repetitions, and partial attempts.
3. Return strict JSON with keys: "text" (string), "confidence" (string), and "segments" (array of {"start": number, "end": number, "text": string}) where times are in seconds from audio start. Always include the segments array (empty if no speech).`,
        responseFormat: 'json',
        temperature: 0,
      }),
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    // Use OpenAI result as primary for backward compatibility
    const transcriptionData = getPrimaryTranscription(allTranscriptions);
    if (!transcriptionData) {
      throw new Error('OpenAI transcription failed - primary transcription is required');
    }

    const timeline = transcriptionData.timeline;
    const confidence = transcriptionData.confidence ?? 'medium';
    const aggregatedTranscript = transcriptionData.text?.trim() ?? '';
    const cleanedAnswer = aggregatedTranscript
      ? aggregatedTranscript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      : '';
    const studentAnswer = cleanedAnswer || 'no_response';

    const hesitationDetected = hasHesitation(timeline, HESITATION_THRESHOLD_SECONDS);

    let evaluation: WrfEvaluation = {
      overall: hesitationDetected ? 'incorrect' : 'incorrect',
      error_category: hesitationDetected ? 'Hesitation' : 'Other',
      pronunciation_type: 'mixed',
      used_self_correction: false,
      self_correction_within_seconds: null,
      notes: hesitationDetected ? 'No response within 5 seconds' : undefined,
    };

    if (!hesitationDetected) {
      try {
        const scoringResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a DIBELS 8th edition Word Reading Fluency (WRF) scorer for Korean EFL students.

Scoring instructions:
- Classify as "correct" when the student reads the target word accurately, including acceptable Korean pronunciations, or sounds out phonemes and then blends them into the correct word.
- If the student only produces segmented sounds without blending, classify as "Sounded out words".
- Use error categories: "Mispronounced words", "Sounded out words", "Word order", "Omissions", "Hesitation", "Other".
- Hesitation threshold is ${HESITATION_THRESHOLD_SECONDS} seconds from audio start to the first meaningful attempt.
- Self-corrections resolving an error within ${HESITATION_THRESHOLD_SECONDS} seconds should be credited and set used_self_correction true.
- Determine pronunciation_type as "english", "korean", "mixed", or "other".

Return strict JSON:
{
  "overall": "correct" | "incorrect",
  "error_category": null | "Mispronounced words" | "Sounded out words" | "Word order" | "Omissions" | "Hesitation" | "Other",
  "pronunciation_type": "english" | "korean" | "mixed" | "other",
  "used_self_correction": boolean,
  "self_correction_within_seconds": number | null,
  "notes": string | null
}`,
            },
            {
              role: 'user',
              content: `Target word: ${questionWord}
Aggregated transcript: ${aggregatedTranscript}
Timeline JSON: ${timelineToPrompt(timeline)}
Hesitation threshold seconds: ${HESITATION_THRESHOLD_SECONDS}`,
            },
          ],
          response_format: { type: 'json_object' },
        });

        const parsedEvaluation = JSON.parse(
          scoringResponse.choices[0].message.content ||
            '{"overall":"incorrect","error_category":"Other","pronunciation_type":"mixed","used_self_correction":false,"self_correction_within_seconds":null}',
        );

        evaluation = {
          overall: parsedEvaluation.overall === 'correct' ? 'correct' : 'incorrect',
          error_category:
            parsedEvaluation.overall === 'correct'
              ? null
              : (['Mispronounced words', 'Sounded out words', 'Word order', 'Omissions', 'Hesitation', 'Other'].includes(
                  parsedEvaluation.error_category,
                )
                  ? (parsedEvaluation.error_category as WrfErrorCategory)
                  : 'Other'),
          pronunciation_type:
            parsedEvaluation.pronunciation_type === 'english' ||
            parsedEvaluation.pronunciation_type === 'korean' ||
            parsedEvaluation.pronunciation_type === 'mixed'
              ? parsedEvaluation.pronunciation_type
              : 'other',
          used_self_correction: Boolean(parsedEvaluation.used_self_correction),
          self_correction_within_seconds:
            typeof parsedEvaluation.self_correction_within_seconds === 'number'
              ? parsedEvaluation.self_correction_within_seconds
              : null,
          notes:
            typeof parsedEvaluation.notes === 'string' && parsedEvaluation.notes.trim().length > 0
              ? parsedEvaluation.notes.trim()
              : undefined,
        };
      } catch (scoringError) {
        console.warn('[WRF 평가 경고]', scoringError);
      }
    }

    const isCorrect = evaluation.overall === 'correct';
    const errorType: WrfErrorCategory = isCorrect ? null : evaluation.error_category ?? 'Other';
    const pronunciationType: WrfPronunciationType =
      evaluation.pronunciation_type === 'english' ||
      evaluation.pronunciation_type === 'korean' ||
      evaluation.pronunciation_type === 'mixed'
        ? evaluation.pronunciation_type
        : 'mixed';

    const processingTime = Date.now() - startTime;

    // Prepare transcription_results JSONB data
    const transcriptionResults = {
      openai: allTranscriptions.openai.success && allTranscriptions.openai.result
        ? {
            text: allTranscriptions.openai.result.text,
            confidence: allTranscriptions.openai.result.confidence,
            timeline: allTranscriptions.openai.result.timeline,
          }
        : { error: allTranscriptions.openai.error },
      gemini: allTranscriptions.gemini.success && allTranscriptions.gemini.result
        ? {
            text: allTranscriptions.gemini.result.text,
            confidence: allTranscriptions.gemini.result.confidence,
            timeline: allTranscriptions.gemini.result.timeline,
          }
        : { error: allTranscriptions.gemini.error },
      aws: allTranscriptions.aws.success && allTranscriptions.aws.result
        ? {
            text: allTranscriptions.aws.result.text,
            confidence: allTranscriptions.aws.result.confidence,
            timeline: allTranscriptions.aws.result.timeline,
          }
        : { error: allTranscriptions.aws.error },
      azure: allTranscriptions.azure.success && allTranscriptions.azure.result
        ? {
            text: allTranscriptions.azure.result.text,
            confidence: allTranscriptions.azure.result.confidence,
            timeline: allTranscriptions.azure.result.timeline,
          }
        : { error: allTranscriptions.azure.error },
    };

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
      transcription_results: transcriptionResults,
    });

    const resultMessage = isCorrect ? '정답' : `오답 (${errorType ?? 'Other'})`;
    console.log(
      `[WRF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}, 발음 유형: ${pronunciationType}, Self-correction: ${evaluation.used_self_correction}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`,
    );
    if (evaluation.notes) {
      console.log(`[WRF 채점 노트] ${evaluation.notes}`);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[WRF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}, 처리시간: ${processingTime}ms`, error);

    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'WRF',
        question: questionWord,
        is_correct: false,
        error_type: 'processing_error',
        processing_time_ms: processingTime,
        error_details: error instanceof Error ? error.message : 'Unknown error',
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

    if (!audioBlob || !questionWord || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== userId) {
      console.log('API: Auth failed - user:', user?.id, 'userId:', userId, 'error:', userError);
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const arrayBuffer = await audioBlob.arrayBuffer();

    await processWrfInBackground(serviceClient, userId, questionWord, arrayBuffer);

    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('WRF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}