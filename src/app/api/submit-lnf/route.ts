import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Supabase 클라이언트 초기화 (서버 환경)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 보안을 위해 Service Role 키 사용
);

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const questionLetter = formData.get('question') as string;
    const userId = formData.get('userId') as string;

    if (!audioBlob || !questionLetter || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    // 1. 음성 파일을 Supabase Storage에 업로드
    const audioFileName = `lnf/${userId}/${Date.now()}.webm`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('student-recordings')
      .upload(audioFileName, audioBuffer, {
        contentType: 'audio/webm',
      });

    if (storageError) throw new Error(`Storage 업로드 실패: ${storageError.message}`);
    
    const audioUrl = storageData.path;

    // 2. OpenAI를 사용한 음성 인식 (STT)
    const transcriptionPrompt = "This is an English letter naming fluency test. The student will say the names of English letters, such as A, Bee, Cee, Dee, Ee, Eff, Gee, Aitche, I, Jay, Kay, Ell, Em, En, O, Pee, Queue, Ar, Ess, Tee, You, Vee, Double-U, Ex, Why, Zee.";

    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe', // 요청하신 모델명
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      language: 'en',
      prompt: transcriptionPrompt,
    });
    // [개선] 인식된 텍스트에서 구두점 및 공백을 제거하여 정확도 향상
    const studentAnswer = transcription.text.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");

    // --- 여기가 핵심 수정 포인트 ---
    // 3. LLM을 사용한 DIBELS 규칙 기반 상세 채점
    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini', // 요청하신 모델명
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 LNF test evaluator.
          - The target letter is: "${questionLetter}"
          - The student's response is: "${studentAnswer}"

          Analyze the student's response based on DIBELS rules and classify it into ONE of the following categories:
          1. "correct": The student correctly said the letter's name (e.g., for 'A', they said 'ay' or 'A').
          2. "letter_sound": The student said the letter's sound instead of its name (e.g., for 'B', they said 'buh'; for 'C' they said 'kuh').
          3. "incorrect_name": The student said a different letter's name (e.g., for 'C', they said 'dee').
          4. "unintelligible": The response is unclear, not a recognizable letter name/sound, or empty.

          Respond ONLY with a JSON object in the format: {"evaluation": "category_name"}. For example: {"evaluation": "correct"}.`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const scoringResult = JSON.parse(scoringResponse.choices[0].message.content || '{"evaluation": "unintelligible"}');
    const evaluation = scoringResult.evaluation;
    const isCorrect = evaluation === 'correct';
    // [추가] 정답이 아닐 경우, 그 이유(오류 유형)를 errorType에 저장
    const errorType = isCorrect ? null : evaluation;

    // 4. 채점 결과를 데이터베이스에 저장 (error_type 컬럼 추가)
    const { error: dbError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'LNF',
      question: questionLetter,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      error_type: errorType, // 오류 유형 저장
      audio_url: audioUrl,
    });

    if (dbError) throw new Error(`DB 저장 실패: ${dbError.message}`);

    // [수정] 프론트엔드에 isCorrect 대신 상세 평가 결과(evaluation)를 반환
    return NextResponse.json({
      studentAnswer,
      evaluation, // 'correct', 'letter_sound', 'incorrect_name' 등
      audioUrl,
    });

  } catch (error) {
    console.error('LNF API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}