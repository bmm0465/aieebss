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
    const questionPassage = formData.get('question') as string;
    const userId = formData.get('userId') as string;
    // [핵심 수정] 프론트엔드로부터 'time_taken' 값을 받음
    const timeTaken = parseInt(formData.get('timeTaken') as string, 10);

    if (!audioBlob || !questionPassage || !userId || isNaN(timeTaken)) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    // 1. 음성 파일 업로드 (이전과 동일)
    const audioFileName = `orf/${userId}/${Date.now()}.webm`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('student-recordings')
      .upload(audioFileName, audioBuffer, { contentType: 'audio/webm' });

    if (storageError) throw new Error(`Storage 업로드 실패: ${storageError.message}`);
    const audioUrl = storageData.path;

    // 2. 음성 인식 (STT) (이전과 동일)
    const transcriptionPrompt = "The student is reading a short story passage aloud for an oral reading fluency test.";
    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe',
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      language: 'en',
      prompt: transcriptionPrompt,
    });
    const studentAnswer = transcription.text;

    // --- 여기가 핵심 수정 포인트 ---
    // 3. LLM을 사용한 심층 분석 및 채점
    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert evaluator for an Oral Reading Fluency (ORF) test.
          - The original passage is: "${questionPassage}"
          - The student's transcribed reading is: "${studentAnswer}"

          Your task is to perform a detailed analysis of the student's reading.
          1.  Calculate the number of correctly read words. A word is correct if pronounced correctly. Minor accent variations are acceptable. Do not penalize self-corrections.
          2.  Identify specific errors: omissions (skipped words), substitutions (wrong words), and significant mispronunciations.
          3.  The total number of words in the original passage is ${questionPassage.split(/\s+/).length}.

          Respond ONLY with a JSON object in the following format:
          {
            "words_correct": integer,
            "total_words_in_passage": integer,
            "error_details": {
              "omissions": ["word1", "word2"],
              "substitutions": [{"original": "word", "student_said": "word"}],
              "mispronunciations": ["word1", "word2"]
            }
          }`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{}');
    const wordsCorrect = scoringResult.words_correct || 0;
    const totalWords = scoringResult.total_words_in_passage || questionPassage.split(/\s+/).length;
    const errorDetails = scoringResult.error_details || {};
    
    // WCPM 계산: 1분 테스트이므로 wordsCorrect와 같지만, 
    // 만약 1분 이내에 읽기를 마쳤다면, WCPM = (wordsCorrect / timeTaken) * 60
    const wcpm = timeTaken > 0 ? Math.round((wordsCorrect / timeTaken) * 60) : 0;
    const accuracy = totalWords > 0 ? wordsCorrect / totalWords : 0;

    // 4. 데이터베이스에 저장 (새로운 컬럼 추가)
    const { error: dbError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'ORF',
      question: questionPassage,
      student_answer: studentAnswer,
      wcpm: wcpm,
      accuracy: accuracy,
      time_taken: timeTaken, // 소요 시간 저장
      error_details: errorDetails, // 오류 상세 내역 저장
      audio_url: audioUrl,
    });

    if (dbError) throw new Error(`DB 저장 실패: ${dbError.message}`);

    return NextResponse.json({ studentAnswer, wcpm, accuracy, errorDetails, audioUrl });

  } catch (error) {
    console.error('ORF API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}