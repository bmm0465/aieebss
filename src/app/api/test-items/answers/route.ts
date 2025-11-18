import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 테스트 문항의 정답 조회 API
 * 채점 시 서버에서 정답을 조회하여 사용
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { testType, itemId, questions } = await request.json();

    if (!testType || !itemId || !questions) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 승인된 문항 조회
    const { data: item, error } = await supabase
      .from('generated_test_items')
      .select('items')
      .eq('id', itemId)
      .eq('status', 'approved')
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: '문항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const items = item.items as Record<string, unknown>;
    let testItems: unknown = null;

    switch (testType) {
      case 'MAZE':
        testItems = items.MAZE;
        break;
      default:
        return NextResponse.json(
          { error: '지원하지 않는 테스트 유형입니다.' },
          { status: 400 }
        );
    }

    if (!testItems || !Array.isArray(testItems)) {
      return NextResponse.json(
        { error: '문항 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // MAZE 문항의 정답 매핑 생성
    if (testType === 'MAZE') {
      const answers: Record<string, string> = {};
      (testItems as Array<{
        num: number;
        sentence: string;
        choices: string[];
        answer: string;
      }>).forEach((item) => {
        // question 형식: "title_num" 또는 "num"
        const questionKey = `${item.num}`;
        answers[questionKey] = item.answer;
      });

      // 요청된 questions에 대한 정답만 반환
      const requestedAnswers: Record<string, string> = {};
      if (Array.isArray(questions)) {
        questions.forEach((q: string) => {
          // question에서 num 추출 (예: "title_1" -> "1")
          const num = q.split('_').pop() || q;
          if (answers[num]) {
            requestedAnswers[q] = answers[num];
          }
        });
      }

      return NextResponse.json({
        success: true,
        answers: requestedAnswers
      });
    }

    return NextResponse.json(
      { error: '지원하지 않는 테스트 유형입니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('정답 조회 오류:', error);
    return NextResponse.json(
      { error: '정답 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

