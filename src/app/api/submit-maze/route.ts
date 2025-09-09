// src/app/api/submit-maze/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { question, studentAnswer, correctAnswer, userId } = await request.json();

    if (!question || !studentAnswer || !correctAnswer || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const isCorrect = studentAnswer === correctAnswer;

    // 데이터베이스에 저장
    const { error: dbError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'MAZE', // 시험 종류를 MAZE로 명시
      question: question, // 문장 전체를 저장
      student_answer: studentAnswer, // 학생이 선택한 단어
      is_correct: isCorrect,
    });

    if (dbError) throw new Error(`DB 저장 실패: ${dbError.message}`);

    return NextResponse.json({ isCorrect });

  } catch (error) {
    console.error('MAZE API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}