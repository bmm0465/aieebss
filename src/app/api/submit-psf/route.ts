import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient as createClientSide } from '@/lib/supabase/client';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// [핵심 2] 백그라운드 함수가 supabase 클라이언트 객체를 인자로 받도록 수정합니다.
async function processPsfInBackground(supabase: SupabaseClient, userId: string, questionWord: string, arrayBuffer: ArrayBuffer) {
  try {
    // 3초 주저 등으로 빈 파일이 온 경우
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'PSF', question: questionWord, is_correct: false,
          error_type: 'hesitation', correct_segments: 0, target_segments: null
      });
      console.log(`[PSF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: hesitation`);
      return;
    }

    const [storageResult, transcription] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(`psf/${userId}/${Date.now()}.webm`, arrayBuffer, { 
          contentType: 'audio/webm',
          upsert: false
        }),
      openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        // language 필드 제거 - 자동 감지가 기본값
        response_format: 'json', 
        prompt: `This is a Phonemic Segmentation Fluency test for an EFL student learning English. The student might respond in Korean, English, or mixed language. Please transcribe exactly what they say, including:
        - English phonemes like "m-a-p" or "b-e-e"
        - Korean sounds like "엠-에이-피" or "비-이"
        - Mixed responses like "엠-에이-피"
        - Silence or unclear sounds
        Transcribe literally what you hear, preserving the segmentation attempt.`,
      })
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    let studentAnswer = "";
    
    if (transcription.text && transcription.text.trim()) {
        studentAnswer = transcription.text.trim();
        console.log(`[PSF 음성 인식] 내용: "${studentAnswer}"`);
    } else {
        console.warn(`[PSF 경고] 음성 인식 실패 - 내용: "${transcription.text}"`);
        studentAnswer = "no_response";
    }

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 PSF test evaluator for EFL (English as a Foreign Language) students. Analyze the student's phonemic segmentation attempt with cultural and linguistic flexibility.

          TARGET WORD: "${questionWord}"
          STUDENT RESPONSE: "${studentAnswer}"
          DETECTED LANGUAGE: "${detectedLanguage}"

          EVALUATION GUIDELINES:
          1. Count total phonemes in the target word
          2. Accept various response formats:
             - English phonemes: "m-a-p", "b-e-e", "m a p", "b e e"
             - Korean pronunciation: "엠-에이-피", "비-이"
             - Mixed responses: "엠-에이-피"
             - Letter names: "em-ay-pee", "bee-ee-ee"
             - Partial attempts: "m...p" or "엠...피"
             - Space-separated: "s e p", "d o g"
             - Hyphen-separated: "m-a-p", "d-o-g"
          3. Be flexible with pronunciation variations common in EFL contexts
          4. Credit partial attempts and close approximations
          5. Consider cultural differences in sound production
          6. IMPORTANT: If student provides correct phoneme segmentation (even in different format), count as correct

          CATEGORIES:
          - "correct": All phonemes correctly identified in any valid format
          - "partial": Some phonemes correctly identified (1+ correct)
          - "whole_word": Student said the complete word instead of segments
          - "no_response": No clear segmentation attempt or empty response
          - "unclear": Response too unclear to evaluate

          Respond with JSON: {"evaluation": "category", "target_segments": number, "correct_segments": number, "notes": "brief explanation"}`
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const { evaluation, target_segments, correct_segments, notes } = scoringResult;
    
    // EFL 환경에 맞는 채점 기준
    const isCorrect = correct_segments > 0; // 1개 이상의 음소를 맞추면 부분 점수
    const isFullyCorrect = correct_segments === target_segments; // 모든 음소를 맞추면 완전 정답
    const errorType = !isCorrect ? evaluation : null;

    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'PSF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: errorType,
      correct_segments: correct_segments,
      target_segments: target_segments,
      audio_url: audioUrl,
    });

    // 더 상세한 로깅
    const resultMessage = isFullyCorrect ? '완전 정답' : 
                         isCorrect ? `부분 정답 (${correct_segments}/${target_segments})` : 
                         `오답 (${evaluation})`;
    
    console.log(`[PSF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}`);
    if (notes) {
      console.log(`[PSF 채점 노트] ${notes}`);
    }

  } catch (error) {
    console.error(`[PSF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionWord = formData.get('question') as string;
    const userId = formData.get('userId') as string;
    const authToken = formData.get('authToken') as string;

    if (!audioBlob || !questionWord || !userId || !authToken) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    // 클라이언트 사이드 클라이언트로 사용자 인증 확인
    const supabaseClient = createClientSide();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authToken);
    
    if (userError || !user || user.id !== userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 서버 클라이언트 생성 (관리자 권한으로 Storage 접근)
    const supabase = createServiceClient();
    
    const arrayBuffer = await audioBlob.arrayBuffer();

    // [핵심 4] 생성된 supabase 객체를 백그라운드 함수로 전달합니다.
    processPsfInBackground(supabase, userId, questionWord, arrayBuffer);

    return NextResponse.json({ message: '요청이 성공적으로 접수되었습니다.' }, { status: 202 });

  } catch (error) {
    console.error('PSF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}