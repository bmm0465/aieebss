import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dialogueOrStory, question, selectedAnswer, correctAnswer, userId, authToken, skip } = body;

    if (!dialogueOrStory || !question || !selectedAnswer || !correctAnswer || !userId || !authToken) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== userId || user.id !== authToken) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const isCorrect = selectedAnswer === correctAnswer;
    const isSkip = skip === true; // 넘어가기 플래그

    const { data: insertData, error: insertError } = await serviceClient.from('test_results').insert({
      user_id: userId,
      test_type: 'p6_comprehension',
      question: `${dialogueOrStory} | ${question}`,
      student_answer: selectedAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      accuracy: isCorrect ? 100 : 0,
      error_type: isSkip ? 'Skipped' : null,
    }).select();

    if (insertError) {
      console.error('[p6_comprehension 저장 오류]', insertError);
      throw new Error(`데이터베이스 저장 실패: ${insertError.message}`);
    }

    console.log(
      `[p6_comprehension 제출 완료] 사용자: ${userId}, 질문: ${question}, 선택: ${selectedAnswer}, 정답: ${correctAnswer}, 결과: ${isCorrect ? '정답' : '오답'}, 저장된 ID: ${insertData?.[0]?.id || 'N/A'}`,
    );

    return NextResponse.json(
      { message: '요청이 성공적으로 처리되었습니다.', isCorrect },
      { status: 200 },
    );
  } catch (error) {
    console.error('p6_comprehension API 요청 접수 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

