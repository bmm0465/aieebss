import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient as createClientSide } from '@/lib/supabase/client';
import { generateStoragePath } from '@/lib/storage-path';
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

    const storagePath = await generateStoragePath(userId, 'NWF');
    
    const [storageResult, transcription] = await Promise.all([
      supabase.storage
        .from('student-recordings')
        .upload(storagePath, arrayBuffer, { 
          contentType: 'audio/webm',
          upsert: false
        }),
      openai.audio.transcriptions.create({
        model: 'gpt-4o-mini-transcribe',
        file: new File([arrayBuffer], "audio.webm", { type: "audio/webm" }),
        // 자동 언어 감지
        response_format: 'json',
        prompt: `This is a DIBELS 8th Nonsense Word Fluency (NWF) test for EFL students. The student will read made-up words or segment their sounds. Accept various response formats:
        - Complete nonsense words: "hap", "bim", "tog", "fip"
        - Segmented sounds: "h-a-p", "b-i-m", "t-o-g", "f-i-p"
        - Korean pronunciation: "합", "빔", "톡", "핍"
        - Mixed responses: "합-에이-피", "빔-아이-엠"
        - Letter names: "aitch-ay-pee", "bee-eye-em"
        - Blended attempts: "hap", "bim" (whole word reading)
        Transcribe exactly what you hear, preserving all reading attempts and pronunciation variations.`,
      })
    ]);
    
    const { data: storageData, error: storageError } = storageResult;
    if (storageError) throw storageError;
    const audioUrl = storageData.path;

    let studentAnswer = "";
    
    if (transcription.text && transcription.text.trim()) {
        studentAnswer = transcription.text.trim();
        console.log(`[NWF 음성 인식] 내용: "${studentAnswer}"`);
    } else {
        console.warn(`[NWF 경고] 음성 인식 실패 - 내용: "${transcription.text}"`);
        studentAnswer = "no_response";
    }

    const scoringResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DIBELS 8 NWF test evaluator for EFL students. Analyze the student's nonsense word reading with cultural flexibility.

          TARGET WORD: "${questionWord}"
          STUDENT RESPONSE: "${studentAnswer}"

          EVALUATION GUIDELINES (DIBELS 8th Edition Official):
          
          According to the official DIBELS 8 administration guide, students can respond in multiple ways:
          1. Individual letter sounds: "/h/ /a/ /p/" (each sound separately)
          2. Whole word reading: "hap" (blended as one word)
          3. Both combined: "/h/ /a/ /p/, hap" (sounds then whole word)
          
          Accept various response formats:
          - Complete word: "hap", "bim", "tog"
          - Segmented sounds: "/h/ /a/ /p/", "h-a-p", "b-i-m"
          - Korean pronunciation: "합", "빔", "톡"
          - Mixed responses: "/h/ /a/ /p/, 합" or "합-에이-피"
          - Letter names: "aitch-ay-pee"
          
          SCORING RULES (DIBELS 8 NWF Standard):
          
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

    // 이미지 규칙에 따른 결과 메시지: CLS와 WRC를 별도로 표시
    const clsScore = correctLetterSounds;
    const wrcScore = wordsReadCorrectly;
    const resultMessage = `CLS: ${clsScore}, WRC: ${wrcScore}${isWholeWordCorrect ? ' (단어 전체 정답)' : ''}`;
    
    console.log(`[NWF 비동기 처리 완료] 사용자: ${userId}, 문제: ${questionWord}, 결과: ${resultMessage}`);

  } catch (error) {
    console.error(`[NWF 비동기 처리 에러] 사용자: ${userId}, 문제: ${questionWord}`, error);
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
    processNwfInBackground(supabase, userId, questionWord, arrayBuffer);

    return NextResponse.json({ message: '요청이 성공적으로 접수되었습니다.' }, { status: 202 });

  } catch (error) {
    console.error('NWF API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}