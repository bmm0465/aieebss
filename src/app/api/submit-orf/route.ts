import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// [핵심 2] 오래 걸리는 모든 작업을 처리하는 별도의 비동기 함수
async function processOrfInBackground(supabase: SupabaseClient, userId: string, questionPassage: string, arrayBuffer: ArrayBuffer, timeTaken: number) {
  const startTime = Date.now();
  
  try {
    // 빈 오디오 파일 처리
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'ORF', question: questionPassage, is_correct: false,
        error_type: 'hesitation', wcpm: 0, accuracy: 0, time_taken: timeTaken,
        processing_time_ms: Date.now() - startTime
      });
      console.log(`[ORF 비동기 처리 완료] 사용자: ${userId}, 결과: hesitation, 처리시간: ${Date.now() - startTime}ms`);
      return;
    }

    // 오디오 파일 크기 검증 (최소 1KB, 최대 10MB)
    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'ORF', question: questionPassage, is_correct: false,
        error_type: 'insufficient_audio', wcpm: 0, accuracy: 0, time_taken: timeTaken,
        processing_time_ms: Date.now() - startTime
      });
      console.log(`[ORF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'ORF', question: questionPassage, is_correct: false,
        error_type: 'audio_too_large', wcpm: 0, accuracy: 0, time_taken: timeTaken,
        processing_time_ms: Date.now() - startTime
      });
      console.log(`[ORF 경고] 오디오 파일이 너무 큼: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    const storagePath = await generateStoragePath(userId, 'ORF');
    
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
        prompt: `This is a DIBELS 8th edition Oral Reading Fluency (ORF) test for Korean EFL students. The student will read a passage aloud.

ORIGINAL PASSAGE: "${questionPassage}"

CRITICAL INSTRUCTIONS:
1. Accept Korean pronunciations for common English words:
   - "the" → "더", "디", "드"
   - "cat" → "캣", "캣", "캣"
   - "sat" → "샛", "샛", "샛"
   - "on" → "온", "온", "온"
   - "mat" → "맷", "맷", "맷"
   - "dog" → "독", "독", "독"
   - "big" → "빅", "빅", "빅"
   - "red" → "레드", "레드", "레드"
   - "blue" → "블루", "블루", "블루"
   - "green" → "그린", "그린", "그린"

2. Accept various response formats:
   - Correct English: "The cat sat on the mat."
   - Korean pronunciation: "더 캣 샛 온 더 맷"
   - Mixed responses: "더 cat sat on 더 mat"
   - Mispronunciations: "The cat sit on the mat"
   - Partial attempts: "더 캣... 샛... 온..."
   - Hesitations: "더 캣, 음, 샛 온 더 맷"
   - Word substitutions: "더 독 샛 온 더 맷" (for "cat")
   - Word omissions: "더 캣 샛 더 맷" (missing "on")
   - Word additions: "더 캣 샛 다운 온 더 맷"
   - Repetitions: "더 캣, 더 캣 샛 온 더 맷"

3. Be extremely flexible with pronunciation variations
4. Preserve all reading attempts, hesitations, and natural reading patterns
5. Return JSON: {"text": "exact transcription", "confidence": "high/medium/low", "reading_fluency": "fluent/hesitant/choppy"}`
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
      transcriptionData = { text: transcription.text, confidence: "medium", reading_fluency: "hesitant" };
    }
    
    let studentAnswer = "";
    const confidence = transcriptionData.confidence || "medium";
    const readingFluency = transcriptionData.reading_fluency || "hesitant";
    
    if (transcriptionData.text && transcriptionData.text.trim()) {
        studentAnswer = transcriptionData.text;
        console.log(`[ORF 음성 인식] 내용: "${studentAnswer}", 신뢰도: ${confidence}, 읽기 유창성: ${readingFluency}`);
    } else {
        console.warn(`[ORF 경고] 음성 인식 실패 - 내용: "${transcriptionData.text}"`);
        studentAnswer = "no_response";
    }
    
    const passageWords = questionPassage.split(/\s+/);

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert DIBELS 8th edition ORF test evaluator for EFL students. Analyze oral reading fluency with cultural flexibility.

          ORIGINAL PASSAGE: "${questionPassage}"
          STUDENT READING: "${studentAnswer}"
          TIME TAKEN: ${timeTaken} seconds

          EVALUATION GUIDELINES:
          1. Accept various response formats:
             - Correct English reading: "The cat sat on the mat."
             - Korean pronunciation: "더 캣 샛 온 더 맷"
             - Mixed responses: "더 cat sat on 더 mat"
             - Mispronunciations: "The cat sit on the mat"
             - Hesitations: "The cat, um, sat on the mat"
          2. Be flexible with pronunciation variations in EFL contexts
          3. Credit partial attempts and close approximations
          4. Consider cultural differences in reading fluency

          DIBELS ORF RULES:
          - Count words read correctly
          - Apply discontinue rule if needed
          - Analyze error patterns

          Respond with JSON:
          {
            "words_correct": integer,
            "discontinue_rule_met": boolean,
            "error_details": { ... },
            "notes": "brief explanation"
          }`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const wordsCorrect = scoringResult.words_correct || 0;
    const errorDetails = scoringResult.error_details || {};
    
    const wcpm = timeTaken > 0 ? Math.round((wordsCorrect / timeTaken) * 60) : 0;
    const accuracy = passageWords.length > 0 ? wordsCorrect / passageWords.length : 0;

    const processingTime = Date.now() - startTime;
    
    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'ORF',
      question: questionPassage,
      student_answer: studentAnswer,
      wcpm: wcpm,
      accuracy: accuracy,
      time_taken: timeTaken,
      error_details: errorDetails,
      audio_url: audioUrl,
      confidence_level: confidence,
      reading_fluency: readingFluency,
      processing_time_ms: processingTime,
    });

    const accuracyPercent = Math.round((wordsCorrect / passageWords.length) * 100);
    console.log(`[ORF 비동기 처리 완료] 사용자: ${userId}, 결과: ${wordsCorrect}개 단어 정확 (WCPM: ${wcpm}, 정확도: ${accuracyPercent}%), 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[ORF 비동기 처리 에러] 사용자: ${userId}, 처리시간: ${processingTime}ms`, error);
    
    // 오류 발생 시에도 데이터베이스에 기록
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
        error_details: error instanceof Error ? error.message : 'Unknown error'
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

    if (!audioBlob || !questionPassage || !userId || isNaN(timeTaken)) {
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

    // [핵심 4] 오래 걸리는 작업을 백그라운드에서 실행하되, 스토리지 저장은 먼저 완료
    await processOrfInBackground(serviceClient, userId, questionPassage, arrayBuffer, timeTaken);

    // 스토리지 저장이 완료된 후 응답 반환
    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });

  } catch (error) {
    console.error('ORF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}