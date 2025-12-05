import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  evaluateOverallAchievement, 
  type StudentTestResult,
  type OverallAchievementResult 
} from '@/lib/achievement-standards';

/**
 * 성취기준 판정 API
 * GET /api/teacher/achievement-standards?studentId=xxx&classId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 인증 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 교사 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const className = searchParams.get('className');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // 학생이 교사의 담당 학생인지 확인
    const { data: assignment } = await supabase
      .from('teacher_student_assignments')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Student not assigned' }, { status: 403 });
    }

    // 학생의 평가 결과 가져오기
    const { data: studentResults } = await supabase
      .from('test_results')
      .select('test_type, accuracy, is_correct, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });

    if (!studentResults || studentResults.length === 0) {
      return NextResponse.json({
        achievement: null,
        message: 'No test results found'
      });
    }

    // 학생의 각 영역별 평균 정확도 계산
    const studentTestResults: StudentTestResult[] = [];
    const testTypeGroups: Record<string, number[]> = {};

    studentResults.forEach(result => {
      const testType = result.test_type;
      if (!testType) return;

      // accuracy가 있으면 사용, 없으면 is_correct로 계산
      let accuracy = result.accuracy;
      if (accuracy === null && result.is_correct !== null) {
        accuracy = result.is_correct ? 100 : 0;
      }

      if (accuracy !== null) {
        if (!testTypeGroups[testType]) {
          testTypeGroups[testType] = [];
        }
        testTypeGroups[testType].push(accuracy);
      }
    });

    // 각 영역별 평균 정확도 계산
    Object.keys(testTypeGroups).forEach(testType => {
      const accuracies = testTypeGroups[testType];
      const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
      studentTestResults.push({
        test_type: testType as any,
        accuracy: Math.round(avgAccuracy * 100) / 100
      });
    });

    // 반 학생들의 평가 결과 가져오기 (통계 계산용)
    const targetClassName = className || assignment.class_name;
    let classTestResults: StudentTestResult[] = [];

    if (targetClassName) {
      // 같은 반 학생들 찾기
      const { data: classStudents } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('class_name', targetClassName)
        .eq('role', 'student');

      if (classStudents && classStudents.length > 0) {
        const classStudentIds = classStudents.map(s => s.id);

        // 반 학생들의 평가 결과 가져오기
        const { data: classResults } = await supabase
          .from('test_results')
          .select('user_id, test_type, accuracy, is_correct')
          .in('user_id', classStudentIds)
          .order('created_at', { ascending: false });

        if (classResults && classResults.length > 0) {
          // 각 학생별, 영역별 평균 정확도 계산
          const classTestTypeGroups: Record<string, Record<string, number[]>> = {};

          classResults.forEach(result => {
            const testType = result.test_type;
            const userId = result.user_id;
            if (!testType || !userId) return;

            let accuracy = result.accuracy;
            if (accuracy === null && result.is_correct !== null) {
              accuracy = result.is_correct ? 100 : 0;
            }

            if (accuracy !== null) {
              if (!classTestTypeGroups[testType]) {
                classTestTypeGroups[testType] = {};
              }
              if (!classTestTypeGroups[testType][userId]) {
                classTestTypeGroups[testType][userId] = [];
              }
              classTestTypeGroups[testType][userId].push(accuracy);
            }
          });

          // 각 영역별로 학생들의 평균 정확도 계산
          Object.keys(classTestTypeGroups).forEach(testType => {
            Object.keys(classTestTypeGroups[testType]).forEach(userId => {
              const accuracies = classTestTypeGroups[testType][userId];
              const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
              classTestResults.push({
                test_type: testType as any,
                accuracy: Math.round(avgAccuracy * 100) / 100
              });
            });
          });
        }
      }
    }

    // 성취기준 판정
    const achievementResult = evaluateOverallAchievement(studentTestResults, classTestResults);

    return NextResponse.json({
      achievement: achievementResult,
      student_results: studentTestResults,
      class_results_count: classTestResults.length
    });

  } catch (error) {
    console.error('Achievement standards API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

