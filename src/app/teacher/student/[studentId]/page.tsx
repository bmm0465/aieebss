import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StudentDetailChart from '@/components/StudentDetailChart';
import RecentTestResults from '@/components/RecentTestResults';

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  const { studentId } = await params;
  
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error in student detail page:', authError);
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>인증 오류가 발생했습니다</h1>
          <p>다시 로그인해 주세요.</p>
          <Link href="/">로그인 페이지로</Link>
        </div>
      );
    }
    
    if (!user) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>로그인이 필요합니다</h1>
          <Link href="/">로그인 페이지로</Link>
        </div>
      );
    }

  // 교사 권한 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'teacher') {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '2rem',
            borderRadius: '15px',
            textAlign: 'center',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h1 style={{ color: '#F44336', marginBottom: '1rem' }}>❌ 권한 없음</h1>
            <p style={{ marginBottom: '2rem' }}>교사만 접근할 수 있는 페이지입니다.</p>
            <Link 
              href="/teacher/dashboard"
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
              ← 대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 교사-학생 할당 관계 확인
  const { data: assignment } = await supabase
    .from('teacher_student_assignments')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .single();

  if (!assignment) {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '2rem',
            borderRadius: '15px',
            textAlign: 'center',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h1 style={{ color: '#F44336', marginBottom: '1rem' }}>❌ 접근 불가</h1>
            <p style={{ marginBottom: '2rem' }}>이 학생은 귀하에게 할당되지 않았습니다.</p>
            <Link 
              href="/teacher/dashboard"
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
              ← 대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 학생 프로필 정보
  const { data: student } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  if (!student) {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '2rem',
            borderRadius: '15px',
            textAlign: 'center',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h1 style={{ color: '#F44336', marginBottom: '1rem' }}>❌ 학생 없음</h1>
            <p style={{ marginBottom: '2rem' }}>학생 정보를 찾을 수 없습니다.</p>
            <Link 
              href="/teacher/dashboard"
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
              ← 대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 테스트 결과 통계
  const { data: testStats } = await supabase
    .from('test_results')
    .select('test_type, is_correct, accuracy, wcpm, time_taken, created_at')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false });

  // 테스트 유형별 통계 계산
  const testTypeStats = testStats?.reduce((acc: Record<string, {
    total: number;
    correct: number;
    totalAccuracy: number;
    totalWcpm: number;
    totalTime: number;
    avgAccuracy: number;
    avgWcpm: number;
    avgTime: number;
    correctRate: number;
    recentResults: Array<{
      test_type: string;
      is_correct: boolean | null;
      accuracy: number | null;
      wcpm: number | null;
      time_taken: number | null;
      created_at: string;
    }>;
  }>, result: {
    test_type: string;
    is_correct: boolean | null;
    accuracy: number | null;
    wcpm: number | null;
    time_taken: number | null;
    created_at: string;
  }) => {
    const testType = result.test_type;
    if (!acc[testType]) {
      acc[testType] = {
        total: 0,
        correct: 0,
        totalAccuracy: 0,
        totalWcpm: 0,
        totalTime: 0,
        avgAccuracy: 0,
        avgWcpm: 0,
        avgTime: 0,
        correctRate: 0,
        recentResults: []
      };
    }
    
    acc[testType].total++;
    if (result.is_correct) acc[testType].correct++;
    if (result.accuracy) acc[testType].totalAccuracy += result.accuracy;
    if (result.wcpm) acc[testType].totalWcpm += result.wcpm;
    if (result.time_taken) acc[testType].totalTime += result.time_taken;
    
    // 최근 5개 결과만 저장
    if (acc[testType].recentResults.length < 5) {
      acc[testType].recentResults.push(result);
    }
    
    return acc;
  }, {}) || {};

  // 각 테스트 유형별 평균 계산
  Object.keys(testTypeStats).forEach(testType => {
    const stats = testTypeStats[testType];
    stats.avgAccuracy = stats.total > 0 ? Math.round(stats.totalAccuracy / stats.total) : 0;
    stats.avgWcpm = stats.total > 0 ? Math.round(stats.totalWcpm / stats.total) : 0;
    stats.avgTime = stats.total > 0 ? Math.round(stats.totalTime / stats.total) : 0;
    stats.correctRate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  });

  // 전체 통계
  const totalTests = testStats?.length || 0;
  const totalCorrect = testStats?.filter(r => r.is_correct).length || 0;
  const overallAccuracy = totalTests > 0 ? Math.round((totalCorrect / totalTests) * 100) : 0;
  const avgAccuracy = totalTests > 0 ? Math.round((testStats?.reduce((sum, r) => sum + (r.accuracy || 0), 0) || 0) / totalTests) : 0;

  // 최근 평가 결과 (상세)
  const { data: recentResults } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
    .limit(20);

  const statistics = {
    totalTests,
    totalCorrect,
    overallAccuracy,
    avgAccuracy,
    testTypeStats
  };

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 헤더 */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ 
                fontSize: '2rem', 
                margin: 0,
                color: '#FFD700',
                textShadow: '0 0 10px #FFD700'
              }}>
                📊 학생 상세 평가 결과
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                {student.full_name || student.id} ({student.class_name || '미지정 반'})
              </p>
            </div>
            <Link 
              href="/teacher/dashboard"
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
              ← 대시보드로 돌아가기
            </Link>
          </div>
        </div>

        {/* 학생 기본 정보 */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>👤 학생 정보</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>이름:</strong> {student.full_name || 'N/A'}
            </div>
            <div>
              <strong>반:</strong> {student.class_name || '미지정'}
            </div>
            <div>
              <strong>학생 번호:</strong> {student.student_number || 'N/A'}
            </div>
            <div>
              <strong>학년:</strong> {student.grade_level || 'N/A'}
            </div>
            <div>
              <strong>총 테스트 수:</strong> {statistics.totalTests}회
            </div>
            <div>
              <strong>전체 정확도:</strong> {statistics.overallAccuracy}%
            </div>
          </div>
        </div>

        {/* 전체 통계 요약 */}
        {statistics.totalTests > 0 ? (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>📈 전체 성과 요약</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                  {statistics.totalTests}
                </div>
                <div style={{ color: '#ccc' }}>총 평가 수</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
                  {statistics.totalCorrect}
                </div>
                <div style={{ color: '#ccc' }}>정답 수</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF9800' }}>
                  {statistics.overallAccuracy}%
                </div>
                <div style={{ color: '#ccc' }}>정답률</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9C27B0' }}>
                  {statistics.avgAccuracy}%
                </div>
                <div style={{ color: '#ccc' }}>평균 정확도</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            textAlign: 'center',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>📝 평가 결과 없음</h2>
            <p style={{ opacity: 0.8 }}>아직 완료된 평가가 없습니다.</p>
          </div>
        )}

        {/* 테스트 유형별 성과 차트 */}
        <StudentDetailChart testTypeStats={statistics.testTypeStats} />

        {/* 최근 평가 결과 */}
        <RecentTestResults results={recentResults || []} />

      </div>
    </div>
  );
  } catch (error) {
    console.error('Error in StudentDetailPage:', error);
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '2rem',
            borderRadius: '15px',
            textAlign: 'center',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h1 style={{ color: '#F44336', marginBottom: '1rem' }}>❌ 오류 발생</h1>
            <p style={{ marginBottom: '2rem' }}>페이지를 불러오는 중 오류가 발생했습니다.</p>
            <Link 
              href="/teacher/dashboard"
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
              ← 대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
