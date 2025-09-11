import { NextResponse } from 'next/server';
// [핵심 1] 새로운 서버용 클라이언트와 cookies를 import 합니다.
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  // [핵심 2] POST 함수 내부에서만 supabase 클라이언트를 생성합니다.
  const supabase = createClient();

  try {
    const { question, studentAnswer, correctAnswer, userId } = await request.json();

    if (!question || !studentAnswer || !correctAnswer || !userId) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const isCorrect = studentAnswer === correctAnswer;

    // 데이터베이스에 저장
    const { error: dbError } = await supabase.from('test_results').insert({
      user_id: userId,
      test_type: 'MAZE',
      question: question,
      student_answer: studentAnswer,
      is_correct: isCorrect,
    });

    if (dbError) {
      // 에러를 더 자세히 로그로 남깁니다.
      console.error('Supabase DB 저장 실패:', dbError.message);
      throw new Error(`DB 저장 실패: ${dbError.message}`);
    }

    // 프론트엔드에는 간단한 성공 여부만 반환합니다.
    return NextResponse.json({ isCorrect });

  } catch (error) {
    console.error('MAZE API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}