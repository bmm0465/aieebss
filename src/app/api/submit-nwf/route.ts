import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateStoragePath } from '@/lib/storage-path';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// [핵심 2] 백그라운드 함수가 supabase 클라이언트 객체를 인자로 받도록 수정합니다.
async function processNwfInBackground(supabase: SupabaseClient, userId: string, questionWord: string, arrayBuffer: ArrayBuffer) {
  const startTime = Date.now();
  
  try {
    // 빈 오디오 파일 처리
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'NWF', question: questionWord, is_correct: false,
        error_type: 'hesitation', correct_letter_sounds: 0, is_whole_word_correct: false,
        processing_time_ms: Date.now() - startTime
      });
      console.log(`[NWF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: hesitation, 처리시간: ${Date.now() - startTime}ms`);
      return;
    }

    // 오디오 파일 크기 검증 (최소 1KB, 최대 10MB)
    if (arrayBuffer.byteLength < 1024) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'NWF', question: questionWord, is_correct: false,
        error_type: 'insufficient_audio', correct_letter_sounds: 0, is_whole_word_correct: false,
        processing_time_ms: Date.now() - startTime
      });
      console.log(`[NWF 경고] 오디오 파일이 너무 작음: ${arrayBuffer.byteLength} bytes`);
      return;
    }

    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'NWF', question: questionWord, is_correct: false,
        error_type: 'audio_too_large', correct_letter_sounds: 0, is_whole_word_correct: false,
        processing_time_ms: Date.now() - startTime
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
          upsert: false
        }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-transcribe',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        language: 'en',
        response_format: 'json',
        prompt: `This is a DIBELS 8th edition Nonsense Word Fluency (NWF) test for Korean EFL students. The student will read made-up words or segment their sounds.

TARGET WORD: "${questionWord}"

CRITICAL INSTRUCTIONS:
1. Accept Korean pronunciations for nonsense words:
   - "hap" → "합", "햅", "핍"
   - "bim" → "빔", "빔", "빔"
   - "tog" → "톡", "톡", "톡"
   - "fip" → "핍", "핍", "핍"
   - "gup" → "갑", "갑", "갑"
   - "vot" → "봇", "봇", "봇"

2. Accept various response formats:
   - Complete nonsense words: "합", "빔", "톡", "핍"
   - Segmented sounds: "합-에이-피", "빔-아이-엠", "톡-오-지"
   - English phonemes: "h-a-p", "b-i-m", "t-o-g"
   - Mixed responses: "합-에이-피", "빔-아이-엠"
   - Letter names: "에이치-에이-피", "비-아이-엠"
   - Blended attempts: "합", "빔" (whole word reading)
   - Partial attempts: "합...피", "빔...엠"

3. Be extremely flexible with pronunciation variations
4. Preserve all reading attempts, hesitations, and repetitions
5. Return JSON: {"text": "exact transcription", "confidence": "high/medium/low", "reading_type": "whole_word/segmented/mixed"}`
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
      transcriptionData = { text: transcription.text, confidence: "medium", reading_type: "mixed" };
    }
    
    let studentAnswer = "";
    const confidence = transcriptionData.confidence || "medium";
    const readingType = transcriptionData.reading_type || "mixed";
    
    if (transcriptionData.text && transcriptionData.text.trim()) {
        studentAnswer = transcriptionData.text.trim();
        console.log(`[NWF 음성 인식] 내용: "${studentAnswer}", 신뢰도: ${confidence}, 읽기 유형: ${readingType}`);
    } else {
        console.warn(`[NWF 경고] 음성 인식 실패 - 내용: "${transcriptionData.text}"`);
        studentAnswer = "no_response";
    }

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8th edition NWF test evaluator for EFL students. Analyze the student's nonsense word reading with cultural flexibility.

          TARGET WORD: "${questionWord}"
          STUDENT RESPONSE: "${studentAnswer}"

          EVALUATION GUIDELINES (DIBELS 8th Edition Official):
          
          According to the official DIBELS 8th edition administration guide, students can respond in multiple ways:
          1. Individual letter sounds: "/h/ /a/ /p/" (each sound separately)
          2. Whole word reading: "hap" (blended as one word)
          3. Both combined: "/h/ /a/ /p/, hap" (sounds then whole word)
          
          Accept various response formats:
          - Complete word: "hap", "bim", "tog"
          - Segmented sounds: "/h/ /a/ /p/", "h-a-p", "b-i-m"
          - Korean pronunciation: "합", "빔", "톡"
          - Mixed responses: "/h/ /a/ /p/, 합" or "합-에이-피"
          - Letter names: "aitch-ay-pee"
          
          SCORING RULES (DIBELS 8th edition NWF Standard):
          
          1. CLS (Correct Letter Sounds): Count individual letter sounds produced correctly
             - Give 1 point for each accurate letter sound, regardless of blending
             - Example: Student says "/h/ /a/ /p/, hap" → count 3 CLS points
             - Example: Student says just "hap" → count 3 CLS points (all sounds present)
             - Example: Student says "/h/ /a/" → count 2 CLS points
          
          2. WRC (Words Read Correctly): Count words read correctly or recoded accurately  
             - Give 1 point if student successfully reads the whole word (either initially sounded out or blended)
             - Student can get BOTH CLS points AND WRC points for the same word
             - Example: "/h/ /a/ /p/, hap" → CLS: 3, WRC: 1

          IMPORTANT: Following official DIBELS 8 guidelines, both CLS and WRC should be scored 
          even if the student provides both individual sounds and whole word reading.

          Respond with JSON: {
            "correct_letter_sounds": number, 
            "is_whole_word_correct": boolean,
            "words_read_correctly": number,
            "notes": "brief explanation"
          }`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || 
      '{"correct_letter_sounds": 0, "is_whole_word_correct": false, "words_read_correctly": 0}');
    
    const correctLetterSounds = scoringResult.correct_letter_sounds || 0;
    const isWholeWordCorrect = scoringResult.is_whole_word_correct || false;
    const wordsReadCorrectly = scoringResult.words_read_correctly || (isWholeWordCorrect ? 1 : 0);

    // 이미지 규칙에 따라: CLS와 WRC는 별도로 측정되며, 둘 다 점수를 받을 수 있음
    const processingTime = Date.now() - startTime;
    
    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'NWF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: correctLetterSounds > 0 || isWholeWordCorrect,
      correct_letter_sounds: correctLetterSounds,
      is_whole_word_correct: isWholeWordCorrect,
      audio_url: audioUrl,
      confidence_level: confidence,
      reading_type: readingType,
      processing_time_ms: processingTime,
    });

    // 이미지 규칙에 따른 결과 메시지: CLS와 WRC를 별도로 표시
    const clsScore = correctLetterSounds;
    const wrcScore = wordsReadCorrectly;
    const resultMessage = `CLS: ${clsScore}, WRC: ${wrcScore}${isWholeWordCorrect ? ' (단어 전체 정답)' : ''}`;
    
    console.log(`[NWF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}, 처리시간: ${processingTime}ms, 신뢰도: ${confidence}`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[NWF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}, 처리시간: ${processingTime}ms`, error);
    
    // 오류 발생 시에도 데이터베이스에 기록
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
        error_details: error instanceof Error ? error.message : 'Unknown error'
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
    await processNwfInBackground(serviceClient, userId, questionWord, arrayBuffer);

    // 백그라운드 작업이 성공적으로 완료된 후 응답을 반환합니다.
    return NextResponse.json({ message: '요청이 성공적으로 처리되었습니다.' }, { status: 200 });

  } catch (error) {
    console.error('NWF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}