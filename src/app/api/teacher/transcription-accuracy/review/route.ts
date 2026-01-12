import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const service = createServiceClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 교사 권한 확인
    const { data: profile } = await service
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Forbidden: Teacher access required' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { test_result_id, review_type, notes } = body;

    // 유효성 검사
    if (!test_result_id) {
      return NextResponse.json(
        { error: 'Missing required field: test_result_id is required' },
        { status: 400 }
      );
    }

    // review_type이 제공되지 않았거나, null이 아니면서 유효한 범위가 아닌 경우
    if (review_type === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: review_type is required' },
        { status: 400 }
      );
    }

    // review_type이 null이 아니면서 1-14 범위를 벗어난 경우
    if (review_type !== null && (review_type < 1 || review_type > 14)) {
      return NextResponse.json(
        { error: 'Invalid review_type: must be between 1 and 14, or null' },
        { status: 400 }
      );
    }

    // 테스트 결과가 담당 학생의 것인지 확인
    const { data: testResult } = await service
      .from('test_results')
      .select('user_id, test_type')
      .eq('id', test_result_id)
      .single();

    if (!testResult) {
      return NextResponse.json(
        { error: 'Test result not found' },
        { status: 404 }
      );
    }

    // 교사-학생 배정 확인
    const { data: assignment } = await service
      .from('teacher_student_assignments')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('student_id', testResult.user_id)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: 'Forbidden: You can only review results of your assigned students' },
        { status: 403 }
      );
    }

    // 1교시 또는 4교시인지 확인
    if (!['p1_alphabet', 'p4_phonics'].includes(testResult.test_type)) {
      return NextResponse.json(
        { error: 'This test type does not use transcription. Only p1_alphabet and p4_phonics are supported.' },
        { status: 400 }
      );
    }

    // 기존 리뷰 확인 (UPSERT를 위해)
    const { data: existingReview } = await service
      .from('transcription_accuracy_reviews')
      .select('id')
      .eq('test_result_id', test_result_id)
      .eq('teacher_id', user.id)
      .single();

    // review_type이 null이면 리뷰 삭제
    if (review_type === null) {
      if (existingReview) {
        const { error } = await service
          .from('transcription_accuracy_reviews')
          .delete()
          .eq('id', existingReview.id);

        if (error) {
          console.error('[transcription-accuracy/review] Delete error:', error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          review: null, // 삭제됨
        });
      } else {
        // 리뷰가 없으면 이미 삭제된 상태
        return NextResponse.json({
          success: true,
          review: null,
        });
      }
    }

    let result;
    if (existingReview) {
      // 기존 리뷰 업데이트
      const { data, error } = await service
        .from('transcription_accuracy_reviews')
        .update({
          review_type,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReview.id)
        .select()
        .single();

      if (error) {
        console.error('[transcription-accuracy/review] Update error:', error);
        // 데이터베이스 제약조건 오류인 경우 더 명확한 메시지 제공
        if (error.code === '23514' || error.message?.includes('check constraint')) {
          throw new Error('데이터베이스 마이그레이션이 필요합니다. review_type은 1-14 사이의 값이어야 합니다.');
        }
        throw error;
      }
      result = data;
    } else {
      // 새 리뷰 생성
      const { data, error } = await service
        .from('transcription_accuracy_reviews')
        .insert({
          test_result_id,
          teacher_id: user.id,
          review_type,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[transcription-accuracy/review] Insert error:', error);
        // 데이터베이스 제약조건 오류인 경우 더 명확한 메시지 제공
        if (error.code === '23514' || error.message?.includes('check constraint')) {
          throw new Error('데이터베이스 마이그레이션이 필요합니다. review_type은 1-14 사이의 값이어야 합니다.');
        }
        throw error;
      }
      result = data;
    }

    return NextResponse.json({
      success: true,
      review: result,
    });
  } catch (error: unknown) {
    console.error('[transcription-accuracy/review] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
