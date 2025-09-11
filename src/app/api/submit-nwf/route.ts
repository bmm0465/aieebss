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
async function processNwfInBackground(supabase: SupabaseClient, userId: string, questionWord: string, arrayBuffer: ArrayBuffer) {
  try {
    // 3초 주저 등으로 빈 파일이 온 경우
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
        user_id: userId, test_type: 'NWF', question: questionWord, is_correct: false,
        error_type: 'hesitation', correct_letter_sounds: 0, is_whole_word_correct: false
      });
      console.log(`[NWF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: hesitation (empty audio)`);
      return;
    }

    const [storageResult, transcription] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(`nwf/${userId}/${Date.now()}.webm`, arrayBuffer, { contentType: 'audio/webm' }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-mini-transcribe',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        language: 'en',
        prompt: `The student is reading a nonsense word or segmenting its sounds. For example, for 'hap', they might say 'h-a-p' or 'hap'.`,
      })
    ]);
    
    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    const studentAnswer = transcription.text.trim();

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 NWF test evaluator.
          - The target nonsense word is: "${questionWord}"
          - The student's response is: "${studentAnswer}"
          Analyze for two separate scores:
          1. Correct Letter Sounds (CLS): Count how many individual letter sounds the student produced correctly.
          2. Whole Word Read (WWR): Determine if the student read the entire word as a single, blended unit correctly.
          Respond ONLY with a JSON object in the format: {"correct_letter_sounds": number, "is_whole_word_correct": boolean}.`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{"correct_letter_sounds": 0, "is_whole_word_correct": false}');
    const correctLetterSounds = scoringResult.correct_letter_sounds || 0;
    const isWholeWordCorrect = scoringResult.is_whole_word_correct || false;

    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'NWF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: correctLetterSounds > 0 || isWholeWordCorrect,
      correct_letter_sounds: correctLetterSounds,
      is_whole_word_correct: isWholeWordCorrect,
      audio_url: audioUrl,
    });

    console.log(`[NWF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}`);

  } catch (error) {
    console.error(`[NWF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}`, error);
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
    processNwfInBackground(supabase, userId, questionWord, arrayBuffer);

    return NextResponse.json({ message: '요청이 성공적으로 접수되었습니다.' }, { status: 202 });

  } catch (error) {
    console.error('NWF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}