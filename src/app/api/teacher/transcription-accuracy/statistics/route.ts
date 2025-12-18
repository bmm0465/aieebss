import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
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

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test_type'); // 'p1_alphabet' or 'p4_phonics'
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // 담당 학생 ID 목록 가져오기
    const { data: assignments } = await service
      .from('teacher_student_assignments')
      .select('student_id')
      .eq('teacher_id', user.id);

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        total: 0,
        by_type: { '1': 0, '2': 0, '3': 0, '4': 0 },
        percentages: { '1': 0, '2': 0, '3': 0, '4': 0 },
        transcription_accuracy: 0,
        scoring_accuracy: 0,
      });
    }

    const studentIds = assignments.map(a => a.student_id);

    // 먼저 필터 조건에 맞는 테스트 결과 ID 목록 가져오기
    let testResultQuery = service
      .from('test_results')
      .select('id')
      .in('user_id', studentIds)
      .in('test_type', ['p1_alphabet', 'p4_phonics']);

    if (testType) {
      testResultQuery = testResultQuery.eq('test_type', testType);
    }

    if (startDate) {
      testResultQuery = testResultQuery.gte('created_at', startDate);
    }

    if (endDate) {
      testResultQuery = testResultQuery.lte('created_at', endDate);
    }

    const { data: testResults, error: testResultsError } = await testResultQuery;

    if (testResultsError) {
      console.error('[transcription-accuracy/statistics] Test results query error:', testResultsError);
      throw testResultsError;
    }

    if (!testResults || testResults.length === 0) {
      return NextResponse.json({
        total: 0,
        by_type: { '1': 0, '2': 0, '3': 0, '4': 0 },
        percentages: { '1': 0, '2': 0, '3': 0, '4': 0 },
        transcription_accuracy: 0,
        scoring_accuracy: 0,
      });
    }

    const testResultIds = testResults.map(tr => tr.id);

    // 해당 테스트 결과에 대한 리뷰 조회
    const { data: reviews, error } = await service
      .from('transcription_accuracy_reviews')
      .select('review_type')
      .eq('teacher_id', user.id)
      .in('test_result_id', testResultIds);

    if (error) {
      console.error('[transcription-accuracy/statistics] Query error:', error);
      throw error;
    }

    // 통계 계산
    const total = reviews?.length || 0;
    const byType: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };

    if (reviews) {
      for (const review of reviews) {
        const type = String(review.review_type);
        if (byType[type] !== undefined) {
          byType[type]++;
        }
      }
    }

    // 비율 계산
    const percentages: Record<string, number> = {
      '1': total > 0 ? Math.round((byType['1'] / total) * 100 * 100) / 100 : 0,
      '2': total > 0 ? Math.round((byType['2'] / total) * 100 * 100) / 100 : 0,
      '3': total > 0 ? Math.round((byType['3'] / total) * 100 * 100) / 100 : 0,
      '4': total > 0 ? Math.round((byType['4'] / total) * 100 * 100) / 100 : 0,
    };

    // 음성 인식 정확도: (유형 1 + 유형 4) / 전체 × 100
    // 정확한 전사를 한 경우의 비율
    const transcriptionAccuracy = total > 0
      ? Math.round(((byType['1'] + byType['4']) / total) * 100 * 100) / 100
      : 0;

    // 채점 정확도: (유형 1 + 유형 3) / 전체 × 100
    // 최종 채점이 올바른 경우의 비율
    const scoringAccuracy = total > 0
      ? Math.round(((byType['1'] + byType['3']) / total) * 100 * 100) / 100
      : 0;

    return NextResponse.json({
      total,
      by_type: byType,
      percentages,
      transcription_accuracy: transcriptionAccuracy,
      scoring_accuracy: scoringAccuracy,
    });
  } catch (error: unknown) {
    console.error('[transcription-accuracy/statistics] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
