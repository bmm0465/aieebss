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

// 단어의 음소 개수를 추정하는 간단한 헬퍼 함수
const countPhonemes = (word: string): number => {
    // 이 로직은 실제로는 더 정교한 라이브러리(e.g., CMU Pronouncing Dictionary)가 필요하지만,
    // 여기서는 CVC 패턴과 일반적인 규칙을 기반으로 한 추정치를 사용합니다.
    const lowerWord = word.toLowerCase();
    // 'sh', 'ch', 'th', 'ph', 'ng' 같은 이중음자 처리
    let count = lowerWord.replace(/sh|ch|th|ph|ng/g, '1').length;
    // 'silent e' 처리 (예: 'like')
    if (/[aeiou]gh/.test(lowerWord) || /e$/.test(lowerWord) && !/le$/.test(lowerWord)) {
        count--;
    }
    return Math.max(1, count); // 최소 1개
};


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionWord = formData.get('question') as string;
    const userId = formData.get('userId') as string;

    if (!audioBlob || !questionWord || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }
    
    // 3초 주저 등으로 빈 파일이 온 경우
    if (audioBlob.size === 0) {
        await supabase.from('test_results').insert({
            user_id: userId, test_type: 'PSF', question: questionWord, is_correct: false,
            error_type: 'hesitation', correct_segments: 0, target_segments: countPhonemes(questionWord)
        });
        return NextResponse.json({ evaluation: 'hesitation', correctSegments: 0 });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    const audioFileName = `psf/${userId}/${Date.now()}.webm`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('student-recordings')
      .upload(audioFileName, audioBuffer, { contentType: 'audio/webm' });

    if (storageError) throw new Error(`Storage 업로드 실패: ${storageError.message}`);
    const audioUrl = storageData.path;

    const transcriptionPrompt = "The student is segmenting an English word into its individual phonemes. For example, for the word 'map', they might say 'm-a-p' or 'm / a / p'.";
    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe',
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      language: 'en',
      prompt: transcriptionPrompt,
    });
    const studentAnswer = transcription.text.trim();

    // --- [핵심 수정] DIBELS PSF 규칙 기반의 상세 채점 프롬프트 ---
    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 PSF test evaluator.
          - The target word is: "${questionWord}" (It has approximately ${countPhonemes(questionWord)} phonemes).
          - The student's response is: "${studentAnswer}"

          Analyze the student's response based on DIBELS rules:
          1. Count the number of individual phonemes the student produced correctly.
          2. Determine if the student repeated the whole word instead of segmenting it.
          
          Respond ONLY with a JSON object in the format: 
          {
            "evaluation": "category", // "correct", "incorrect", or "repeated_word"
            "correct_segments": number // The count of correctly produced sound segments.
          }`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{"evaluation": "incorrect", "correct_segments": 0}');
    const evaluation = scoringResult.evaluation;
    const correctSegments = scoringResult.correct_segments || 0;
    const isCorrect = correctSegments > 0;
    const errorType = evaluation !== 'correct' ? evaluation : null;

    // 4. 데이터베이스에 상세 결과 저장
    await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'PSF',
      question: questionWord,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: errorType,
      correct_segments: correctSegments,
      target_segments: countPhonemes(questionWord),
      audio_url: audioUrl,
    });

    return NextResponse.json({ evaluation, correctSegments });

  } catch (error) {
    console.error('PSF API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}