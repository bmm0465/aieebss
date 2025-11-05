import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/LogoutButton';

// 타입 정의
type StudentWithStats = {
  id: string;
  email: string;
  full_name: string | null;
  class_name: string | null;
  student_number: string | null;
  grade_level: string | null;
  total_tests: number;
  last_test_date: string | null;
  completion_rate: number;
  avg_accuracy: number;
};

type TestResult = {
  user_id: string;
  test_type: string;
  is_correct: boolean | null;
  accuracy: number | null;
  created_at: string;
};

export default async function TeacherDashboard() {
  console.log('[TeacherDashboard] Page started');
  
  const supabase = await createClient();
  console.log('[TeacherDashboard] Supabase client created');

  // 세션 확인 - getUser()로 변경 (더 안정적)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  console.log('[TeacherDashboard] Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    error: userError?.message
  });
  
  if (userError || !user) {
    console.error('[TeacherDashboard] ❌ Authentication FAILED:', userError);
    redirect('/');
  }
  
  console.log('[TeacherDashboard] ✅ Authentication SUCCESS:', user.email);

  // 교사 프로필 확인
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 프로필이 없거나 교사가 아닌 경우
  if (profileError || !profile || profile.role !== 'teacher') {
    return (
      <div style={{ 
        backgroundColor: '#ffffff', 
        backgroundSize: 'cover', 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: '#171717'
      }}>
        <div style={{
          textAlign: 'center', 
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.1)', 
          padding: '2rem', 
          borderRadius: '15px',
          maxWidth: '600px'
        }}>
          <h1 style={{ color: '#FFD700', marginBottom: '1rem' }}>⚠️ 접근 권한 없음</h1>
          <p style={{ marginBottom: '1rem' }}>교사 계정으로만 접근 가능합니다.</p>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
            교사 프로필 설정이 필요합니다. 관리자에게 문의하세요.
          </p>
          <Link 
            href="/lobby" 
            style={{
              display: 'inline-block',
              backgroundColor: '#FFD700',
              color: 'black',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            로비로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 담당 학생 목록 가져오기
  const { data: assignments, error: assignmentsError } = await supabase
    .from('teacher_student_assignments')
    .select('student_id, class_name')
    .eq('teacher_id', user.id);

  if (assignmentsError) {
    console.error('학생 목록 조회 에러:', assignmentsError);
  }

  const studentIds = assignments?.map(a => a.student_id) || [];

  // 학생들의 테스트 결과 통계 가져오기
  let studentsWithStats: StudentWithStats[] = [];
  
  if (studentIds.length > 0) {
    // 학생 프로필 가져오기
    const { data: studentProfiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', studentIds);

    // 학생 이메일 가져오기 (auth.users) - 에러 처리 추가
    let users: Array<{ id: string; email?: string }> = [];
    try {
      const { data } = await supabase.auth.admin.listUsers();
      users = data.users || [];
    } catch (error) {
      console.error('사용자 목록 조회 에러:', error);
      // 이메일을 가져오지 못해도 계속 진행
    }
    
    // 테스트 결과 가져오기
    const { data: testResults } = await supabase
      .from('test_results')
      .select('user_id, test_type, is_correct, accuracy, created_at')
      .in('user_id', studentIds);

    // 학생별 통계 계산
    studentsWithStats = studentIds.map(studentId => {
      const studentProfile = studentProfiles?.find(p => p.id === studentId);
      const studentUser = users?.find(u => u.id === studentId);
      const studentTests = (testResults as TestResult[])?.filter(r => r.user_id === studentId) || [];
      
      // 테스트 타입별 개수
      const testTypes = [...new Set(studentTests.map(t => t.test_type))];
      const completionRate = Math.round((testTypes.length / 6) * 100);
      
      // 평균 정확도 계산
      const accuracyTests = studentTests.filter(t => t.accuracy !== null);
      const avgAccuracy = accuracyTests.length > 0
        ? Math.round(accuracyTests.reduce((sum, t) => sum + (t.accuracy || 0), 0) / accuracyTests.length)
        : 0;
      
      // 마지막 테스트 날짜
      const lastTestDate = studentTests.length > 0
        ? new Date(Math.max(...studentTests.map(t => new Date(t.created_at).getTime()))).toLocaleDateString('ko-KR')
        : null;

      return {
        id: studentId,
        email: studentUser?.email || '이메일 없음',
        full_name: studentProfile?.full_name || null,
        class_name: studentProfile?.class_name || null,
        student_number: studentProfile?.student_number || null,
        grade_level: studentProfile?.grade_level || null,
        total_tests: studentTests.length,
        last_test_date: lastTestDate,
        completion_rate: completionRate,
        avg_accuracy: avgAccuracy
      };
    });

    // 반별로 정렬
    studentsWithStats.sort((a, b) => {
      if (a.class_name && b.class_name) return a.class_name.localeCompare(b.class_name);
      if (a.class_name) return -1;
      if (b.class_name) return 1;
      return 0;
    });
  }

  // 반별 그룹화
  const studentsByClass: { [key: string]: StudentWithStats[] } = {};
  studentsWithStats.forEach(student => {
    const className = student.class_name || '미지정';
    if (!studentsByClass[className]) {
      studentsByClass[className] = [];
    }
    studentsByClass[className].push(student);
  });

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: '#171717'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/owl.png" alt="교사" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  🎓 교사 관리 대시보드
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  {profile.full_name?.replace(' 선생님', '') || user.email} 선생님
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <Link 
                href="/lobby"
                style={{
                  backgroundColor: 'rgba(255,215,0,0.2)',
                  color: '#FFD700',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  border: '2px solid rgba(255,215,0,0.5)',
                  fontWeight: 'bold'
                }}
              >
                🏠 로비로
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* 빠른 링크 */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <Link
            href="/teacher/test-items"
            style={{
              flex: 1,
              backgroundColor: 'rgba(33, 150, 243, 0.2)',
              color: '#2196F3',
              padding: '1rem',
              borderRadius: '10px',
              textDecoration: 'none',
              border: '2px solid rgba(33, 150, 243, 0.5)',
              fontWeight: 'bold',
              textAlign: 'center',
              transition: 'all 0.3s ease'
            }}
            className="quick-link"
          >
            📋 평가 문항 및 정답 확인
          </Link>
          <Link
            href="/teacher/generate-items"
            style={{
              flex: 1,
              backgroundColor: 'rgba(156, 39, 176, 0.2)',
              color: '#9C27B0',
              padding: '1rem',
              borderRadius: '10px',
              textDecoration: 'none',
              border: '2px solid rgba(156, 39, 176, 0.5)',
              fontWeight: 'bold',
              textAlign: 'center',
              transition: 'all 0.3s ease'
            }}
            className="quick-link"
          >
            🤖 AI 문항 생성기
          </Link>
        </div>


        {/* 통계 요약 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            padding: '1.5rem',
            borderRadius: '10px',
            border: '2px solid rgba(76, 175, 80, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
              {studentsWithStats.length}
            </div>
            <div style={{ marginTop: '0.5rem', opacity: 0.9 }}>총 학생 수</div>
          </div>
          <div style={{
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            padding: '1.5rem',
            borderRadius: '10px',
            border: '2px solid rgba(33, 150, 243, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2196F3' }}>
              {Object.keys(studentsByClass).length}
            </div>
            <div style={{ marginTop: '0.5rem', opacity: 0.9 }}>담당 반 수</div>
          </div>
          <div style={{
            backgroundColor: 'rgba(255, 152, 0, 0.2)',
            padding: '1.5rem',
            borderRadius: '10px',
            border: '2px solid rgba(255, 152, 0, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FF9800' }}>
              {studentsWithStats.reduce((sum, s) => sum + s.total_tests, 0)}
            </div>
            <div style={{ marginTop: '0.5rem', opacity: 0.9 }}>전체 테스트 수</div>
          </div>
          <div style={{
            backgroundColor: 'rgba(156, 39, 176, 0.2)',
            padding: '1.5rem',
            borderRadius: '10px',
            border: '2px solid rgba(156, 39, 176, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#9C27B0' }}>
              {studentsWithStats.length > 0 
                ? Math.round(studentsWithStats.reduce((sum, s) => sum + s.avg_accuracy, 0) / studentsWithStats.length)
                : 0}%
            </div>
            <div style={{ marginTop: '0.5rem', opacity: 0.9 }}>평균 정확도</div>
          </div>
        </div>

        {/* 학생 목록 (반별) */}
        {studentsWithStats.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.1)',
            padding: '3rem',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#FFD700' }}>📚 아직 배정된 학생이 없습니다</h2>
            <p style={{ opacity: 0.8, marginTop: '1rem' }}>
              관리자에게 학생 배정을 요청하세요.
            </p>
          </div>
        ) : (
          Object.entries(studentsByClass).map(([className, students]) => (
            <div 
              key={className}
              style={{
                backgroundColor: '#ffffff',
                padding: '2rem',
                borderRadius: '15px',
                marginBottom: '2rem',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}
            >
              <h2 style={{ 
                color: '#FFD700', 
                marginBottom: '1.5rem',
                fontSize: '1.8rem',
                borderBottom: '2px solid rgba(255, 215, 0, 0.3)',
                paddingBottom: '0.5rem'
              }}>
                📘 {className} ({students.length}명)
              </h2>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                {students.map(student => (
                  <Link
                    key={student.id}
                    href={`/teacher/student-detail?id=${student.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div 
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        padding: '1.5rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      className="student-card"
                    >
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                        gap: '1rem',
                        alignItems: 'center'
                      }}>
                        {/* 학생 정보 */}
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                            {student.full_name || student.email}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                            {student.student_number && `번호: ${student.student_number}`}
                            {student.grade_level && ` | ${student.grade_level}`}
                          </div>
                        </div>

                        {/* 테스트 수 */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196F3' }}>
                            {student.total_tests}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>테스트 수</div>
                        </div>

                        {/* 완료율 */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold',
                            color: student.completion_rate >= 80 ? '#4CAF50' : 
                                   student.completion_rate >= 60 ? '#FF9800' : '#F44336'
                          }}>
                            {student.completion_rate}%
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>완료율</div>
                        </div>

                        {/* 평균 정확도 */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold',
                            color: student.avg_accuracy >= 80 ? '#4CAF50' : 
                                   student.avg_accuracy >= 60 ? '#FF9800' : '#F44336'
                          }}>
                            {student.avg_accuracy}%
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>평균 정확도</div>
                        </div>

                        {/* 마지막 테스트 */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {student.last_test_date || '-'}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>마지막 테스트</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

