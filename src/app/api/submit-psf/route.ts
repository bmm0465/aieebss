// src/app/api/submit-psf/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionWord = formData.get('question') as string;
    const userId = formData.get('userId') as string;

    if (!audioBlob || !questionWord || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    // 1. 음성 파일 업로드
    const audioFileName = `psf/${userId}/${Date.now()}.webm`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('student-recordings')
      .upload(audioFileName, audioBuffer, { contentType: 'audio/webm' });

    if (storageError) throw new Error(`Storage 업로드 실패: ${storageError.message}`);
    const audioUrl = storageData.path;

    // 2. 음성 인식 (STT)
    const transcriptionPrompt = "The student is segmenting an English word into its individual phonemes. For example, for the word 'map', they might say 'm-a-p' or 'm / a / p'.";
    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe', // 요청하신 모델명
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      language: 'en',
      prompt: transcriptionPrompt,
    });
    const studentAnswer = transcription.text;

    // 3. LLM을 사용한 채점 (PSF에 특화된 프롬프트)
    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini', // 요청하신 모델명
      messages: [
        {
          role: 'system',
          content: `You are a phonemic segmentation fluency (PSF) assessment AI. The target word was "${questionWord}". The student responded with "${studentAnswer}". Determine if the student correctly segmented the word into its individual phonemes. For example, if the word is 'cat', a correct answer would be 'c-a-t' or 'c a t'. An incorrect answer would be 'cat' or 'c-at'. Respond ONLY with a JSON object in the format: {"is_correct": boolean}.`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const isCorrect = scoringResult.is_correct || false;

    // 4. 데이터베이스에 저장
    const { error: dbError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'PSF', // 시험 종류를 PSF로 명시
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      audio_url: audioUrl,
    });

    if (dbError) throw new Error(`DB 저장 실패: ${dbError.message}`);

    return NextResponse.json({ studentAnswer, isCorrect, audioUrl });

  } catch (error) {
    console.error('PSF API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}