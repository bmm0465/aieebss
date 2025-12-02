import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  hasHesitation,
} from '@/lib/utils/dibelsTranscription';
import { transcribeAll, getPrimaryTranscription } from '@/lib/services/transcriptionService';

const HESITATION_THRESHOLD_SECONDS = 5;

async function processReadingInBackground(
  supabase: SupabaseClient,
  userId: string,
  question: string,
  testType: 'nwf' | 'wrf' | 'orf',
  arrayBuffer: ArrayBuffer,
  isSkip: boolean = false,
) {
  const startTime = Date.now();

  try {
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'p4_phonics',
        question: question,
        correct_answer: question,
        is_correct: false,
        error_type: isSkip ? 'Skipped' : 'Hesitation',
        processing_time_ms: Date.now() - startTime,
      });
      return;
    }

    if (arrayBuffer.byteLength < 1024 || arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'p4_phonics',
        question: question,
        correct_answer: question,
        is_correct: false,
        error_type: 'insufficient_audio',
        processing_time_ms: Date.now() - startTime,
      });
      return;
    }

    const storagePath = await generateStoragePath(userId, testType);

    const [storageResult, allTranscriptions] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(storagePath, arrayBuffer, {
          contentType: 'audio/webm',
          upsert: false,
        }),
      transcribeAll(arrayBuffer, {
        language: 'en',
        prompt: `This is a reading fluency test for Korean EFL students. The student will read ${testType === 'nwf' ? 'a nonsense word' : testType === 'wrf' ? 'a real word' : 'a sentence'}.

TARGET: "${question}"

Accept Korean-accented pronunciations and be flexible with variations.`,
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
    const studentAnswer = transcriptionData.text?.trim() || 'no_response';
    const hesitationDetected = hasHesitation(timeline, HESITATION_THRESHOLD_SECONDS);

    // 간단한 정확도 평가
    const isCorrect = !hesitationDetected && studentAnswer.toLowerCase().includes(question.toLowerCase().split(' ')[0]);

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
      test_type: testType,
      question: question,
      correct_answer: question,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: isSkip ? 'Skipped' : (hesitationDetected ? 'Hesitation' : (isCorrect ? null : 'Other')),
      audio_url: audioUrl,
      confidence_level: confidence,
      processing_time_ms: Date.now() - startTime,
      transcription_results: transcriptionResults,
    });

    console.log(
      `[${testType} 제출 완료] 사용자: ${userId}, 문제: ${question}, 결과: ${isCorrect ? '정답' : '오답'}`,
    );
  } catch (error) {
    console.error(`[${testType} 비동기 처리 에러]`, error);
    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: 'p4_phonics',
        question: question,
        correct_answer: question,
        is_correct: false,
        error_type: isSkip ? 'Skipped' : 'processing_error',
        processing_time_ms: Date.now() - startTime,
        error_details: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (dbError) {
      console.error(`[${testType} 데이터베이스 오류 기록 실패]`, dbError);
    }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const question = formData.get('question') as string;
    const testType = formData.get('testType') as 'nwf' | 'wrf' | 'orf';
    const userId = formData.get('userId') as string;
    const isSkip = formData.get('skip') === 'true'; // 넘어가기 플래그

    if (!audioBlob || !question || !testType || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const arrayBuffer = await audioBlob.arrayBuffer();

    await processReadingInBackground(serviceClient, userId, question, testType, arrayBuffer, isSkip);

    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('Reading API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

