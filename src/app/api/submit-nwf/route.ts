// src/app/api/submit-nwf/route.ts

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
    // 프론트엔드에서 음소 개수를 미리 계산하여 전달받습니다. (예: "hap" -> 3)
    const targetPhonemeCount = parseInt(formData.get('targetPhonemeCount') as string, 10); 

    if (!audioBlob || !questionWord || !userId || isNaN(targetPhonemeCount)) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    // 1. 음성 파일 업로드
    const audioFileName = `nwf/${userId}/${Date.now()}.webm`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('student-recordings')
      .upload(audioFileName, audioBuffer, { contentType: 'audio/webm' });

    if (storageError) throw new Error(`Storage 업로드 실패: ${storageError.message}`);
    const audioUrl = storageData.path;

    // 2. 음성 인식 (STT) - 무의미 단어 및 음소 분절에 대한 프롬프트
    const transcriptionPrompt = `The student is reading a nonsense word or segmenting its sounds. For example, for 'hap', they might say 'h-a-p' or 'hap'. Possible nonsense words and their segmentations: 'nuf' (n-u-f), 'tib' (t-i-b), 'vog' (v-o-g), 'jez' (j-e-z).`;
    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe', // 요청하신 모델명
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      language: 'en',
      prompt: transcriptionPrompt,
    });
    const studentAnswer = transcription.text;

    // 3. LLM을 사용한 복합 채점 (NWF에 특화된 프롬프트)
    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini', // 요청하신 모델명
      messages: [
        {
          role: 'system',
          content: `You are an English phonics assessment AI for Nonsense Word Fluency.
The target nonsense word to be assessed is "${questionWord}".
The individual phonemes of "${questionWord}" are assumed to be: ${questionWord.split('').map(p => `/${p}/`).join(', ')}.
The correct pronunciation of the combined whole word is "${questionWord}".

The student's transcribed response (what they said) is: "${studentAnswer}".

Based on the student's response, evaluate two distinct aspects:
1.  **Phonemic Segmentation Correctness:** Did the student correctly articulate *all* the individual phonemes of the word, clearly separating them? (e.g., for 'hap', correctly saying "h-a-p" or "h /a/ /p/").
2.  **Whole Word Pronunciation Correctness:** Did the student correctly pronounce the *entire nonsense word* as a combined unit? (e.g., for 'hap', correctly saying "hap").

Consider if the student's transcription contains clear evidence of both segmenting all phonemes AND pronouncing the whole word. Note that saying "h-a-p" is usually good for segmentation but not for whole word pronunciation, and vice versa.

Respond ONLY with a JSON object in the format:
{
  "is_phonemes_correct": boolean, // True if all phonemes were correctly and distinctly articulated
  "is_whole_word_correct": boolean // True if the entire word was pronounced correctly as a single unit
}`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const isPhonemesCorrect = scoringResult.is_phonemes_correct || false;
    const isWholeWordCorrect = scoringResult.is_whole_word_correct || false;

    // 4. 데이터베이스에 저장
    const { error: dbError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'NWF', // 시험 종류를 NWF로 명시
      question: questionWord,
      student_answer: studentAnswer,
      is_phonemes_correct: isPhonemesCorrect,
      is_whole_word_correct: isWholeWordCorrect,
      target_phoneme_count: targetPhonemeCount, // 음소 개수 저장
      audio_url: audioUrl,
    });

    if (dbError) throw new Error(`DB 저장 실패: ${dbError.message}`);

    return NextResponse.json({ 
      studentAnswer, 
      isPhonemesCorrect, 
      isWholeWordCorrect,
      audioUrl,
    });

  } catch (error) {
    console.error('NWF API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}