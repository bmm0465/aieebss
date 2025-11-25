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

const ORF_ALLOWED_ERROR_CATEGORIES = new Set<Exclude<OrfErrorCategory, null> | 'Other'>([
  'Mispronounced words',
  'Sounded out words',
  'Word order',
  'Omissions',
  'Hesitation',
  'Other',
]);

type OrfErrorCategory =
  | 'Mispronounced words'
  | 'Sounded out words'
  | 'Word order'
  | 'Omissions'
  | 'Hesitation'
  | 'Other'
  | null;

type OrfReadingFluency = 'fluent' | 'hesitant' | 'choppy' | 'other';

interface OrfEvaluation {
  words_correct: number;
  error_breakdown: Array<{
    word: string;
    error_category: Exclude<OrfErrorCategory, null> | 'Other';
    notes?: string;
  }>;
  overall_error_category: OrfErrorCategory;
  reading_fluency: OrfReadingFluency;
  used_self_correction: boolean;
  self_correction_within_seconds: number | null;
  notes?: string;
}

async function processOrfInBackground(
  supabase: SupabaseClient,
  userId: string,
  questionPassage: string,
  arrayBuffer: ArrayBuffer,
  timeTaken: number,
) {
  const startTime = Date.now();

  try {
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'ORF',
        question: questionPassage,
        is_correct: false,
        error_type: 'Hesitation',
        wcpm: 0,
        accuracy: 0,
        time_taken: timeTaken,
        processing_time_ms: Date.now() - startTime,
      });
      console.log(
        `[ORF 비동기 처리 완료] 사용자: ${userId}, 결과: Hesitation (빈 오디오), 처리시간: ${Date.now() - startTime}ms`,
      );
      return;
    }

    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'ORF',
        question: questionPassage,
        is_correct: false,
        error_type: 'insufficient_audio',
        wcpm: 0,
        accuracy: 0,
        time_taken: timeTaken,
        processing_time_ms: Date.now() - startTime,
      });
      console.log(`[ORF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'ORF',
        question: questionPassage,
        is_correct: false,
        error_type: 'audio_too_large',
        wcpm: 0,
        accuracy: 0,
        time_taken: timeTaken,
        processing_time_ms: Date.now() - startTime,
      });
      console.log(`[ORF 경고] 오디오 파일이 너무 큼: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    const storagePath = await generateStoragePath(userId, 'ORF');

    const [storageResult, allTranscriptions] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(storagePath, arrayBuffer, {
          contentType: 'audio/webm',
          upsert: false,
        }),
      transcribeAll(arrayBuffer, {
        language: 'en',
        prompt: `This is a DIBELS 8th edition Oral Reading Fluency (ORF) test for Korean EFL students. The student will read a passage aloud.

CRITICAL INSTRUCTIONS:
1. Accept Korean pronunciations and mixed language readings.
2. Preserve hesitations, repetitions, and substitutions.
3. Provide accurate timestamps for each utterance`,
        responseFormat: 'verbose_json',
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
    const aggregatedTranscript = transcriptionData.text ?? '';
    const studentAnswer = aggregatedTranscript || 'no_response';

    const hesitationDetected = hasHesitation(timeline, HESITATION_THRESHOLD_SECONDS);
    const passageWords = questionPassage.split(/\s+/);

    let evaluation: OrfEvaluation = {
      words_correct: 0,
      error_breakdown: [],
      overall_error_category: hesitationDetected ? 'Hesitation' : null,
      reading_fluency: 'other',
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
              content: `You are an expert DIBELS 8th edition ORF scorer for Korean EFL students.

Scoring instructions:
- Count words read correctly (WCPM) and evaluate accuracy.
- Ignore repetitions and insertions.
- Use error categories: "Mispronounced words", "Sounded out words", "Word order", "Omissions", "Hesitation", "Other".
- Hesitation threshold is ${HESITATION_THRESHOLD_SECONDS} seconds from audio start to the first meaningful attempt.
- Self-corrections resolving an error within ${HESITATION_THRESHOLD_SECONDS} seconds should be credited and mark used_self_correction true.
- Provide an error_breakdown array describing notable errors.
- Determine reading_fluency as "fluent", "hesitant", "choppy", or "other".

Return strict JSON:
{
  "words_correct": number,
  "error_breakdown": [
    {"word": string, "error_category": "Mispronounced words" | "Sounded out words" | "Word order" | "Omissions" | "Other", "notes": string | null}
  ],
  "overall_error_category": null | "Mispronounced words" | "Sounded out words" | "Word order" | "Omissions" | "Hesitation" | "Other",
  "reading_fluency": "fluent" | "hesitant" | "choppy" | "other",
  "used_self_correction": boolean,
  "self_correction_within_seconds": number | null,
  "notes": string | null
}`,
            },
            {
              role: 'user',
              content: `Original passage: ${questionPassage}
Student transcript: ${aggregatedTranscript}
Timeline JSON: ${timelineToPrompt(timeline)}
Time taken seconds: ${timeTaken}
Hesitation threshold seconds: ${HESITATION_THRESHOLD_SECONDS}`,
            },
          ],
          response_format: { type: 'json_object' },
        });

        const parsedEvaluation = JSON.parse(
          scoringResponse.choices[0].message.content ||
            '{"words_correct":0,"error_breakdown":[],"overall_error_category":null,"reading_fluency":"other","used_self_correction":false,"self_correction_within_seconds":null}',
        );

        evaluation = {
          words_correct: Number.isFinite(parsedEvaluation.words_correct)
            ? Number(parsedEvaluation.words_correct)
            : 0,
          error_breakdown: Array.isArray(parsedEvaluation.error_breakdown)
            ? parsedEvaluation.error_breakdown.map((entry: unknown) => {
                const record = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
                const rawWord = record.word;
                const rawCategory = record.error_category;
                const rawNotes = record.notes;

                const word = typeof rawWord === 'string' ? rawWord : '';
                const categoryCandidate = typeof rawCategory === 'string' ? rawCategory : 'Other';
                const errorCategory = ORF_ALLOWED_ERROR_CATEGORIES.has(
                  categoryCandidate as Exclude<OrfErrorCategory, null> | 'Other',
                )
                  ? (categoryCandidate as Exclude<OrfErrorCategory, null> | 'Other')
                  : 'Other';
                const notes =
                  typeof rawNotes === 'string' && rawNotes.trim().length > 0 ? rawNotes.trim() : undefined;

                return {
                  word,
                  error_category: errorCategory,
                  notes,
                };
              })
            : [],
          overall_error_category: ORF_ALLOWED_ERROR_CATEGORIES.has(
            parsedEvaluation.overall_error_category as Exclude<OrfErrorCategory, null> | 'Other',
          )
            ? (parsedEvaluation.overall_error_category as OrfErrorCategory)
            : null,
          reading_fluency:
            parsedEvaluation.reading_fluency === 'fluent' ||
            parsedEvaluation.reading_fluency === 'hesitant' ||
            parsedEvaluation.reading_fluency === 'choppy'
              ? parsedEvaluation.reading_fluency
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
        console.warn('[ORF 평가 경고]', scoringError);
      }
    }

    const wordsCorrect = Math.max(0, evaluation.words_correct);
    const wcpm = timeTaken > 0 ? Math.round((wordsCorrect / timeTaken) * 60) : 0;
    const accuracy = passageWords.length > 0 ? wordsCorrect / passageWords.length : 0;
    const readingFluency: OrfReadingFluency =
      evaluation.reading_fluency === 'fluent' ||
      evaluation.reading_fluency === 'hesitant' ||
      evaluation.reading_fluency === 'choppy'
        ? evaluation.reading_fluency
        : 'other';
    const errorType: OrfErrorCategory = evaluation.overall_error_category;

    const processingTime = Date.now() - startTime;

    const errorDetails = {
      ...evaluation,
      hesitation_detected: hesitationDetected,
      passage_word_count: passageWords.length,
    };

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
      test_type: 'ORF',
      question: questionPassage,
      student_answer: studentAnswer,
      wcpm,
      accuracy,
      time_taken: timeTaken,
      error_details: errorDetails,
      error_type: errorType,
      audio_url: audioUrl,
      confidence_level: confidence,
      reading_fluency: readingFluency,
      processing_time_ms: processingTime,
      transcription_results: transcriptionResults,
    });

    const accuracyPercent = passageWords.length > 0 ? Math.round(accuracy * 100) : 0;
    const resultLabel = errorType ? `${wordsCorrect}개 단어 정확 (오류: ${errorType})` : `${wordsCorrect}개 단어 정확`;
    console.log(
      `[ORF 비동기 처리 완료] 사용자: ${userId}, 결과: ${resultLabel} (WCPM: ${wcpm}, 정확도: ${accuracyPercent}%), Self-correction: ${evaluation.used_self_correction}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`,
    );
    if (evaluation.notes) {
      console.log(`[ORF 채점 노트] ${evaluation.notes}`);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[ORF 비동기 처리 에러] 사용자: ${userId}, 처리시간: ${processingTime}ms`, error);

    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'ORF',
        question: questionPassage,
        is_correct: false,
        error_type: 'processing_error',
        wcpm: 0,
        accuracy: 0,
        time_taken: timeTaken,
        processing_time_ms: processingTime,
        error_details: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (dbError) {
      console.error(`[ORF 데이터베이스 오류 기록 실패] 사용자: ${userId}`, dbError);
    }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionPassage = formData.get('question') as string;
    const userId = formData.get('userId') as string;
    const timeTaken = parseInt(formData.get('timeTaken') as string, 10);

    if (!audioBlob || !questionPassage || !userId || Number.isNaN(timeTaken)) {
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

    await processOrfInBackground(serviceClient, userId, questionPassage, arrayBuffer, timeTaken);

    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('ORF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}