import { NextResponse } from 'next/server';
// [핵심 1] 새로운 서버용 클라이언트와 cookies를 import 합니다.
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js'; // SupabaseClient 타입을 import

// OpenAI 클라이언트 초기화 (파일 최상단)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 규칙 셋 정의 (파일 최상단)
const letterNames: { [key: string]: string[] } = {
  A: ['a', 'ay'], B: ['b', 'bee'], C: ['c', 'cee', 'see'], D: ['d', 'dee'], E: ['e', 'ee'],
  F: ['f', 'eff'], G: ['g', 'gee'], H: ['h', 'aitch', 'haitch'], I: ['i'], J: ['j', 'jay'],
  K: ['k', 'kay'], L: ['l', 'ell'], M: ['m', 'em'], N: ['n', 'en'], O: ['o'],
  P: ['p', 'pee'], Q: ['q', 'cue', 'que'], R: ['r', 'ar'], S: ['s', 'ess'], T: ['t', 'tee'],
  U: ['u', 'you'], V: ['v', 'vee'], W: ['w', 'double u', 'doubleu'], X: ['x', 'ex'], Y: ['y', 'why'],
  Z: ['z', 'zee', 'zed']
};
const letterSounds: { [key: string]: string[] } = {
  A: ['a', 'ah'], B: ['b', 'buh'], C: ['k', 'kuh'], D: ['d', 'duh'], E: ['e', 'eh'], F: ['f', 'fuh'],
};

// [핵심 2] 백그라운드 함수가 supabase 클라이언트 객체를 인자로 받도록 수정합니다.
async function processLnfInBackground(supabase: SupabaseClient, userId: string, questionLetter: string, arrayBuffer: ArrayBuffer) {
  try {
    if (arrayBuffer.byteLength === 0) {
      await supabase.from('test_results').insert({
          user_id: userId, test_type: 'LNF', question: questionLetter,
          is_correct: false, error_type: 'hesitation'
      });
      console.log(`[LNF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionLetter}, 결과: hesitation`);
      return;
    }

    const [storageResult, transcription] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(`lnf/${userId}/${Date.now()}.webm`, arrayBuffer, { contentType: 'audio/webm' }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-mini-transcribe',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        language: 'en',
        prompt: "This is an English letter naming fluency test...",
      })
    ]);

    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    const studentAnswerRaw = transcription.text.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const studentAnswer = studentAnswerRaw.toLowerCase();

    let evaluation: string;
    const upperCaseQuestion = questionLetter.toUpperCase();

    if (letterNames[upperCaseQuestion]?.includes(studentAnswer)) {
      evaluation = 'correct';
    } else if (letterSounds[upperCaseQuestion]?.includes(studentAnswer)) {
      evaluation = 'letter_sound';
    } else {
      const scoringResponse = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [ { role: 'system', content: `You are a DIBELS 8 LNF test evaluator...` } ],
        response_format: { type: 'json_object' },
      });
      const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{"evaluation": "unintelligible"}');
      evaluation = scoringResult.evaluation;
    }
    
    const isCorrect = evaluation === 'correct';
    const errorType = isCorrect ? null : evaluation;

    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'LNF',
      question: questionLetter,
      student_answer: studentAnswerRaw,
      is_correct: isCorrect,
      error_type: errorType,
      audio_url: audioUrl,
    });

    console.log(`[LNF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionLetter}, 결과: ${evaluation}`);

  } catch (error) {
    console.error(`[LNF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionLetter}`, error);
  }
}

export async function POST(request: Request) {
  // [핵심 3] POST 함수 내부에서만 supabase 클라이언트를 생성합니다.
  const supabase = createClient();
  
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionLetter = formData.get('question') as string;
    const userId = formData.get('userId') as string;

    if (!audioBlob || !questionLetter || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }
    
    const arrayBuffer = await audioBlob.arrayBuffer();

    // [핵심 4] 생성된 supabase 객체를 백그라운드 함수로 전달합니다.
    processLnfInBackground(supabase, userId, questionLetter, arrayBuffer);

    return NextResponse.json({ message: '요청이 성공적으로 접수되었습니다.' }, { status: 202 });

  } catch (error) {
    console.error('LNF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
