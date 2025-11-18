import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  hasHesitation,
  parseTranscriptionResult,
} from '@/lib/utils/dibelsTranscription';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const HESITATION_THRESHOLD_SECONDS = 5;

async function processReadingInBackground(
  supabase: SupabaseClient,
  userId: string,
  question: string,
  testType: 'NWF' | 'WRF' | 'ORF',
  arrayBuffer: ArrayBuffer,
) {
  const startTime = Date.now();

  try {
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: testType,
        question: question,
        is_correct: false,
        error_type: 'Hesitation',
        processing_time_ms: Date.now() - startTime,
      });
      return;
    }

    if (arrayBuffer.byteLength < 1024 || arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: testType,
        question: question,
        is_correct: false,
        error_type: 'insufficient_audio',
        processing_time_ms: Date.now() - startTime,
      });
      return;
    }

    const storagePath = await generateStoragePath(userId, testType);

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
        prompt: `This is a reading fluency test for Korean EFL students. The student will read ${testType === 'NWF' ? 'a nonsense word' : testType === 'WRF' ? 'a real word' : 'a sentence'}.

TARGET: "${question}"

Accept Korean-accented pronunciations and be flexible with variations.`,
      }),
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    const transcriptionData = parseTranscriptionResult(transcription);
    const timeline = transcriptionData.timeline;
    const confidence = transcriptionData.confidence ?? 'medium';
    const studentAnswer = transcriptionData.text?.trim() || 'no_response';
    const hesitationDetected = hasHesitation(timeline, HESITATION_THRESHOLD_SECONDS);

    // 간단한 정확도 평가
    const isCorrect = !hesitationDetected && studentAnswer.toLowerCase().includes(question.toLowerCase().split(' ')[0]);

    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: testType,
      question: question,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: hesitationDetected ? 'Hesitation' : (isCorrect ? null : 'Other'),
      audio_url: audioUrl,
      confidence_level: confidence,
      processing_time_ms: Date.now() - startTime,
    });

    console.log(
      `[${testType} 제출 완료] 사용자: ${userId}, 문제: ${question}, 결과: ${isCorrect ? '정답' : '오답'}`,
    );
  } catch (error) {
    console.error(`[${testType} 비동기 처리 에러]`, error);
    try {
      await supabase.from('test_results').insert({
        user_id: userId,
        test_type: testType,
        question: question,
        is_correct: false,
        error_type: 'processing_error',
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
    const testType = formData.get('testType') as 'NWF' | 'WRF' | 'ORF';
    const userId = formData.get('userId') as string;

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

    await processReadingInBackground(serviceClient, userId, question, testType, arrayBuffer);

    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('Reading API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

