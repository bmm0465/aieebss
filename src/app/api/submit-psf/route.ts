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

type PsfOverall = 'correct' | 'partial' | 'incorrect';

type PsfErrorCategory =
  | 'Mispronounced segment'
  | 'No segmentation'
  | 'Spelling'
  | 'Omissions'
  | 'Hesitation'
  | 'Other'
  | null;

interface PsfEvaluation {
  overall: PsfOverall;
  correct_segments: number;
  target_segments: number;
  error_category: PsfErrorCategory;
  used_self_correction: boolean;
  self_correction_within_seconds: number | null;
  notes?: string;
}

async function processPsfInBackground(
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
        test_type: 'PSF',
        question: questionWord,
        is_correct: false,
        error_type: 'Hesitation',
        correct_segments: 0,
        target_segments: null,
        processing_time_ms: Date.now() - startTime,
      });
      console.log(
        `[PSF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: Hesitation (빈 오디오), 처리시간: ${Date.now() - startTime}ms`,
      );
      return;
    }

    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'PSF',
        question: questionWord,
        is_correct: false,
        error_type: 'insufficient_audio',
        correct_segments: 0,
        target_segments: null,
        processing_time_ms: Date.now() - startTime,
      });
      console.log(`[PSF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'PSF',
        question: questionWord,
        is_correct: false,
        error_type: 'audio_too_large',
        correct_segments: 0,
        target_segments: null,
        processing_time_ms: Date.now() - startTime,
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
          upsert: false,
        }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-transcribe',
        file: new File([arrayBuffer], 'audio.webm', { type: 'audio/webm' }),
        language: 'en',
        response_format: 'json',
        temperature: 0,
        prompt: `This is a DIBELS 8th edition Phonemic Segmentation Fluency (PSF) test for Korean EFL students. The student will break words into individual phonemes (sounds).

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
5. Return strict JSON with keys: "text" (string), "confidence" (string), and "segments" (array of {"start": number, "end": number, "text": string}) where times are in seconds from audio start. Always include the segments array (empty if no speech).`,
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
    const detectedPhonemeCount = timeline.length;

    const hesitationDetected = hasHesitation(timeline, HESITATION_THRESHOLD_SECONDS);

    let evaluation: PsfEvaluation = {
      overall: hesitationDetected ? 'incorrect' : 'incorrect',
      correct_segments: 0,
      target_segments: 0,
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
              content: `You are a DIBELS 8th edition Phonemic Segmentation Fluency (PSF) scorer for Korean EFL students.

Scoring instructions:
- Classify overall as "correct" when all phonemes are segmented correctly, "partial" when at least one phoneme is correct but the response is incomplete, and "incorrect" when no phonemes are accurate.
- Treat "partial" as acceptable for credit; leave error_category null and set notes to "Partial segmentation".
- Hesitation threshold is ${HESITATION_THRESHOLD_SECONDS} seconds from audio start to the first meaningful attempt.
- Count self-corrections that arrive at a correct segmentation within ${HESITATION_THRESHOLD_SECONDS} seconds as correct and set "used_self_correction" to true.
- Ignore minor schwa sounds and harmless additions.

Choose an error_category ONLY when overall is "incorrect" using these labels:
- "Mispronounced segment"
- "No segmentation"
- "Spelling"
- "Omissions"
- "Hesitation"
- "Other"

Return strict JSON:
{
  "overall": "correct" | "partial" | "incorrect",
  "correct_segments": number,
  "target_segments": number,
  "error_category": null | "Mispronounced segment" | "No segmentation" | "Spelling" | "Omissions" | "Hesitation" | "Other",
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
            '{"overall":"incorrect","correct_segments":0,"target_segments":0,"error_category":"Other","used_self_correction":false,"self_correction_within_seconds":null}',
        );

        const overall: PsfOverall =
          parsedEvaluation.overall === 'correct' || parsedEvaluation.overall === 'partial'
            ? parsedEvaluation.overall
            : 'incorrect';

        const allowedErrorCategories = new Set<PsfErrorCategory>([
          'Mispronounced segment',
          'No segmentation',
          'Spelling',
          'Omissions',
          'Hesitation',
          'Other',
          null,
        ]);

        evaluation = {
          overall,
          correct_segments: Number.isFinite(parsedEvaluation.correct_segments)
            ? Number(parsedEvaluation.correct_segments)
            : 0,
          target_segments: Number.isFinite(parsedEvaluation.target_segments)
            ? Number(parsedEvaluation.target_segments)
            : 0,
          error_category:
            overall === 'incorrect'
              ? allowedErrorCategories.has(parsedEvaluation.error_category)
                ? (parsedEvaluation.error_category as PsfErrorCategory)
                : 'Other'
              : null,
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

        if (evaluation.overall !== 'incorrect') {
          evaluation.error_category = null;
        }
      } catch (scoringError) {
        console.warn('[PSF 평가 경고]', scoringError);
      }
    }

    const isCorrect = evaluation.overall !== 'incorrect';
    const isFullyCorrect = evaluation.overall === 'correct';
    const correctSegments = Math.max(0, evaluation.correct_segments);
    const rawTargetSegments = evaluation.target_segments;
    const lettersOnly = questionWord ? questionWord.replace(/[^a-z]/gi, '') : '';
    const fallbackTargetSegments = Math.max(lettersOnly.length, correctSegments);
    const targetSegments =
      rawTargetSegments && rawTargetSegments > 0
        ? rawTargetSegments
        : fallbackTargetSegments > 0
          ? fallbackTargetSegments
          : null;
    const errorType = isCorrect ? null : evaluation.error_category;

    const processingTime = Date.now() - startTime;

    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'PSF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: errorType,
      correct_segments: correctSegments,
      target_segments: targetSegments,
      audio_url: audioUrl,
      confidence_level: confidence,
      detected_phoneme_count: detectedPhonemeCount,
      processing_time_ms: processingTime,
    });

    const ratioLabel = targetSegments ? `${correctSegments}/${targetSegments}` : `${correctSegments}`;
    const resultMessage = isFullyCorrect
      ? `완전 정답 (${ratioLabel})`
      : isCorrect
        ? `부분 정답 (${ratioLabel})`
        : `오답 (${errorType ?? 'Other'})`;

    console.log(
      `[PSF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}, Self-correction: ${evaluation.used_self_correction}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`,
    );
    if (evaluation.notes) {
      console.log(`[PSF 채점 노트] ${evaluation.notes}`);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[PSF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}, 처리시간: ${processingTime}ms`, error);

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
        error_details: error instanceof Error ? error.message : 'Unknown error',
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

    await processPsfInBackground(serviceClient, userId, questionWord, arrayBuffer);

    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('PSF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}