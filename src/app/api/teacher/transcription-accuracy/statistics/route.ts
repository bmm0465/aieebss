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
      const emptyByType: Record<string, number> = {};
      const emptyPercentages: Record<string, number> = {};
      for (let i = 1; i <= 14; i++) {
        emptyByType[String(i)] = 0;
        emptyPercentages[String(i)] = 0;
      }
      return NextResponse.json({
        total: 0,
        by_type: emptyByType,
        percentages: emptyPercentages,
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
      const emptyByType: Record<string, number> = {};
      const emptyPercentages: Record<string, number> = {};
      for (let i = 1; i <= 14; i++) {
        emptyByType[String(i)] = 0;
        emptyPercentages[String(i)] = 0;
      }
      return NextResponse.json({
        total: 0,
        by_type: emptyByType,
        percentages: emptyPercentages,
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
    // NULL이 아닌 리뷰만 카운트
    const validReviews = reviews?.filter(r => r.review_type !== null) || [];
    const total = validReviews.length;
    
    // 1-14 유형별 초기화
    const byType: Record<string, number> = {};
    for (let i = 1; i <= 14; i++) {
      byType[String(i)] = 0;
    }

    if (validReviews) {
      for (const review of validReviews) {
        if (review.review_type !== null) {
          const type = String(review.review_type);
          if (byType[type] !== undefined) {
            byType[type]++;
          }
        }
      }
    }

    // 비율 계산
    const percentages: Record<string, number> = {};
    for (let i = 1; i <= 14; i++) {
      const typeKey = String(i);
      percentages[typeKey] = total > 0 
        ? Math.round((byType[typeKey] / total) * 100 * 100) / 100 
        : 0;
    }

    // 음성 인식 정확도: 정확한 전사를 한 경우의 비율
    // 유형 1, 2, 5, 6, 11, 12 = 정확한 전사
    const accurateTranscriptionTypes = ['1', '2', '5', '6', '11', '12'];
    const accurateTranscriptionCount = accurateTranscriptionTypes.reduce(
      (sum, type) => sum + (byType[type] || 0),
      0
    );
    const transcriptionAccuracy = total > 0
      ? Math.round((accurateTranscriptionCount / total) * 100 * 100) / 100
      : 0;

    // 채점 정확도: 최종 채점이 올바른 경우의 비율
    // 유형 1, 3, 5, 7, 9, 11, 13 = 최종 채점이 올바름
    const correctScoringTypes = ['1', '3', '5', '7', '9', '11', '13'];
    const correctScoringCount = correctScoringTypes.reduce(
      (sum, type) => sum + (byType[type] || 0),
      0
    );
    const scoringAccuracy = total > 0
      ? Math.round((correctScoringCount / total) * 100 * 100) / 100
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
