import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  hasHesitation,
  parseTranscriptionResult,
  timelineToPrompt,
} from '@/lib/utils/dibelsTranscription';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const HESITATION_THRESHOLD_SECONDS = 5;

type NwfOverall = 'correct' | 'partial' | 'incorrect';

type NwfErrorCategory =
  | 'Partially correct responses'
  | 'Sounds out of order'
  | 'Inserted Sounds'
  | 'Omissions'
  | 'Hesitation'
  | 'Other'
  | null;

type NwfReadingType = 'whole_word' | 'segmented' | 'mixed' | 'other';

interface NwfEvaluation {
  correct_letter_sounds: number;
  words_read_correctly: number;
  is_whole_word_correct: boolean;
  reading_type: NwfReadingType;
  overall: NwfOverall;
  error_category: NwfErrorCategory;
  used_self_correction: boolean;
  self_correction_within_seconds: number | null;
  notes?: string;
}

async function processNwfInBackground(
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
        test_type: 'NWF',
        question: questionWord,
        is_correct: false,
        error_type: 'Hesitation',
        correct_letter_sounds: 0,
        is_whole_word_correct: false,
        processing_time_ms: Date.now() - startTime,
      });
      console.log(
        `[NWF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: Hesitation (빈 오디오), 처리시간: ${Date.now() - startTime}ms`,
      );
      return;
    }

    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'NWF',
        question: questionWord,
        is_correct: false,
        error_type: 'insufficient_audio',
        correct_letter_sounds: 0,
        is_whole_word_correct: false,
        processing_time_ms: Date.now() - startTime,
      });
      console.log(`[NWF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'NWF',
        question: questionWord,
        is_correct: false,
        error_type: 'audio_too_large',
        correct_letter_sounds: 0,
        is_whole_word_correct: false,
        processing_time_ms: Date.now() - startTime,
      });
      console.log(`[NWF 경고] 오디오 파일이 너무 큼: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    const storagePath = await generateStoragePath(userId, 'NWF');

    const [storageResult, transcription] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(storagePath, arrayBuffer, {
          contentType: 'audio/webm',
          upsert: false,
        }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-transcribe',
        file: new File([arrayBuffer], 'audio.webm', { type: 'audio/webm' }),
        language: 'en',
        response_format: 'json',
        temperature: 0,
        prompt: `This is a DIBELS 8th edition Nonsense Word Fluency (NWF) test for Korean EFL students. The student will read made-up words or segment their sounds.

TARGET WORD: "${questionWord}"

CRITICAL INSTRUCTIONS:
1. Accept Korean pronunciations for nonsense words and blended attempts.
2. Capture both segmented sounds and whole-word readings.
3. Preserve hesitations, repetitions, and partial attempts.
4. Return strict JSON with keys: "text" (string), "confidence" (string), and "segments" (array of {"start": number, "end": number, "text": string}) where times are in seconds from audio start. Always include the segments array (empty if no speech).`,
      }),
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    const transcriptionData = parseTranscriptionResult(transcription);
    const timeline = transcriptionData.timeline;
    const confidence = transcriptionData.confidence ?? 'medium';
    const aggregatedTranscript = transcriptionData.text?.trim() ?? '';
    const studentAnswer = aggregatedTranscript || 'no_response';

    const hesitationDetected = hasHesitation(timeline, HESITATION_THRESHOLD_SECONDS);

    let evaluation: NwfEvaluation = {
      correct_letter_sounds: 0,
      words_read_correctly: 0,
      is_whole_word_correct: false,
      reading_type: 'mixed',
      overall: hesitationDetected ? 'incorrect' : 'incorrect',
      error_category: hesitationDetected ? 'Hesitation' : 'Other',
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
              content: `You are a DIBELS 8th edition Nonsense Word Fluency (NWF) scorer for Korean EFL students.

Scoring instructions:
- Provide counts for CLS (correct letter sounds) and WRC (words read correctly).
- Determine reading_type as "whole_word", "segmented", "mixed", or "other".
- Classify overall as:
  * "correct" when all letter sounds are accurate and in order or the whole word is read correctly.
  * "partial" when at least one letter sound is correct but the whole word is not accurate.
  * "incorrect" when no letter sounds are accurate.
- Hesitation threshold is ${HESITATION_THRESHOLD_SECONDS} seconds from audio start to the first meaningful attempt.
- Self-corrections that reach a correct reading within ${HESITATION_THRESHOLD_SECONDS} seconds of the initial error should be marked as "correct" with used_self_correction true.
- When overall is "partial", use error_category "Partially correct responses".
- When overall is "incorrect", choose error_category from: "Partially correct responses", "Sounds out of order", "Inserted Sounds", "Omissions", "Hesitation", "Other".

Return strict JSON:
{
  "correct_letter_sounds": number,
  "words_read_correctly": number,
  "is_whole_word_correct": boolean,
  "reading_type": "whole_word" | "segmented" | "mixed" | "other",
  "overall": "correct" | "partial" | "incorrect",
  "error_category": null | "Partially correct responses" | "Sounds out of order" | "Inserted Sounds" | "Omissions" | "Hesitation" | "Other",
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
            '{"correct_letter_sounds":0,"words_read_correctly":0,"is_whole_word_correct":false,"reading_type":"mixed","overall":"incorrect","error_category":"Other","used_self_correction":false,"self_correction_within_seconds":null}',
        );

        const overall: NwfOverall =
          parsedEvaluation.overall === 'correct' || parsedEvaluation.overall === 'partial'
            ? parsedEvaluation.overall
            : 'incorrect';

        const allowedErrorCategories = new Set<NwfErrorCategory>([
          'Partially correct responses',
          'Sounds out of order',
          'Inserted Sounds',
          'Omissions',
          'Hesitation',
          'Other',
          null,
        ]);

        evaluation = {
          correct_letter_sounds: Number.isFinite(parsedEvaluation.correct_letter_sounds)
            ? Number(parsedEvaluation.correct_letter_sounds)
            : 0,
          words_read_correctly: Number.isFinite(parsedEvaluation.words_read_correctly)
            ? Number(parsedEvaluation.words_read_correctly)
            : 0,
          is_whole_word_correct: Boolean(parsedEvaluation.is_whole_word_correct),
          reading_type:
            parsedEvaluation.reading_type === 'whole_word' ||
            parsedEvaluation.reading_type === 'segmented' ||
            parsedEvaluation.reading_type === 'mixed'
              ? parsedEvaluation.reading_type
              : 'other',
          overall,
          error_category:
            overall === 'correct'
              ? null
              : overall === 'partial'
                ? 'Partially correct responses'
                : allowedErrorCategories.has(parsedEvaluation.error_category)
                  ? (parsedEvaluation.error_category as NwfErrorCategory)
                  : 'Other',
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

        if (evaluation.overall === 'correct') {
          evaluation.error_category = null;
        }
      } catch (scoringError) {
        console.warn('[NWF 평가 경고]', scoringError);
      }
    }

    const correctLetterSounds = Math.max(0, evaluation.correct_letter_sounds);
    const wordsReadCorrectly = Math.max(0, evaluation.words_read_correctly);
    const isWholeWordCorrect = evaluation.is_whole_word_correct || wordsReadCorrectly > 0;
    const readingType: NwfReadingType =
      evaluation.reading_type === 'whole_word' ||
      evaluation.reading_type === 'segmented' ||
      evaluation.reading_type === 'mixed'
        ? evaluation.reading_type
        : 'mixed';

    const isCorrect = evaluation.overall === 'correct';
    const errorType: NwfErrorCategory = isCorrect ? null : evaluation.error_category ?? 'Other';

    const processingTime = Date.now() - startTime;

    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'NWF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: errorType,
      correct_letter_sounds: correctLetterSounds,
      is_whole_word_correct: isWholeWordCorrect,
      audio_url: audioUrl,
      confidence_level: confidence,
      reading_type: readingType,
      processing_time_ms: processingTime,
    });

    const resultMessage = isCorrect
      ? `정답 (CLS: ${correctLetterSounds}, WRC: ${wordsReadCorrectly})`
      : evaluation.overall === 'partial'
        ? `부분 정답 (CLS: ${correctLetterSounds}, WRC: ${wordsReadCorrectly}, 오류: ${errorType ?? 'Partially correct responses'})`
        : `오답 (${errorType ?? 'Other'}, CLS: ${correctLetterSounds}, WRC: ${wordsReadCorrectly})`;

    console.log(
      `[NWF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}, Self-correction: ${evaluation.used_self_correction}, 읽기 유형: ${readingType}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`,
    );
    if (evaluation.notes) {
      console.log(`[NWF 채점 노트] ${evaluation.notes}`);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[NWF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}, 처리시간: ${processingTime}ms`, error);

    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'NWF',
        question: questionWord,
        is_correct: false,
        error_type: 'processing_error',
        correct_letter_sounds: 0,
        is_whole_word_correct: false,
        processing_time_ms: processingTime,
        error_details: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (dbError) {
      console.error(`[NWF 데이터베이스 오류 기록 실패] 사용자: ${userId}`, dbError);
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

    await processNwfInBackground(serviceClient, userId, questionWord, arrayBuffer);

    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('NWF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}