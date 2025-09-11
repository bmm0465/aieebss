import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient as createClientSide } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { submissions, userId, authToken } = await request.json();

    if (!submissions || !Array.isArray(submissions) || !userId || !authToken) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    // 클라이언트 사이드 클라이언트로 사용자 인증 확인 (한 번만)
    const supabaseClient = createClientSide();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authToken);
    
    if (userError || !user || user.id !== userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 서버 클라이언트 생성 (관리자 권한으로 Storage 접근)
    const supabase = createServiceClient();

    // 배치로 데이터베이스에 저장
    const insertData = submissions.map(({ question, studentAnswer, correctAnswer }) => ({
      user_id: userId,
      test_type: 'MAZE',
      question: question,
      student_answer: studentAnswer,
      is_correct: studentAnswer === correctAnswer,
    }));

    const { error: dbError } = await supabase.from('test_results').insert(insertData);

    if (dbError) {
      console.error('Supabase DB 배치 저장 실패:', dbError.message);
      throw new Error(`DB 저장 실패: ${dbError.message}`);
    }

    console.log(`[MAZE 배치 처리 완료] 사용자: ${userId}, 문제 수: ${submissions.length}`);

    // 프론트엔드에는 성공 응답 반환
    return NextResponse.json({ 
      success: true, 
      processedCount: submissions.length 
    });

  } catch (error) {
    console.error('MAZE API 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}