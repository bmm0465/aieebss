import { NextResponse } from 'next/server';
// [핵심 1] 새로운 서버용 클라이언트와 cookies를 import 합니다.
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
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
        .upload(`psf/${userId}/${Date.now()}.webm`, arrayBuffer, { contentType: 'audio/webm' }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-mini-transcribe',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        language: 'en',
        response_format: 'verbose_json', 
        prompt: `This is a Phonemic Segmentation Fluency test for a child learning English. The student will try to say the individual sounds of an English word. For example, for the word 'map', they might say 'm-a-p' or 'm / a / p'. The output MUST be in English letters only. Do not translate or transcribe into any other language like Japanese or Korean.`,
      })
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    let studentAnswer = "";
    if (transcription.language === 'en' && transcription.text) {
        studentAnswer = transcription.text.trim();
    } else {
        console.warn(`[PSF 경고] 영어가 아닌 언어 감지됨: ${transcription.language}, 내용: ${transcription.text}`);
    }

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 PSF test evaluator. Analyze the student's attempt to segment a word into phonemes.
          - Target Word: "${questionWord}"
          - Student's Response: "${studentAnswer}"
          First, identify and count the total number of phonemes in the target word.
          Next, count how many of those phonemes the student produced correctly.
          Finally, determine if the student just repeated the whole word.
          Respond ONLY with a JSON object in the format: {"evaluation": "category", "target_segments": number, "correct_segments": number}.`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const { evaluation, target_segments, correct_segments } = scoringResult;
    const isCorrect = correct_segments > 0;
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

    console.log(`[PSF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${evaluation}`);

  } catch (error) {
    console.error(`[PSF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}`, error);
  }
}

export async function POST(request: Request) {
  // [핵심 3] POST 함수 내부에서만 supabase 클라이언트를 생성합니다.
  const supabase = createClient();

  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionWord = formData.get('question') as string;
    const userId = formData.get('userId') as string;

    if (!audioBlob || !questionWord || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }
    
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