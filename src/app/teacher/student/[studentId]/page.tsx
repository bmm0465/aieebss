import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';

interface Props {
  params: Promise<{ studentId: string }>;
}

type TestResult = {
  id: string;
  test_type: string;
  is_correct: boolean | null;
  accuracy: number | null;
  response_time: number | null;
  created_at: string;
  test_data: any;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
  class_name: string | null;
  student_number: string | null;
  grade_level: string | null;
};

export default async function StudentDetailPage({ params }: Props) {
  console.log('[StudentDetail] 🚀 PAGE STARTED');
  
  const { studentId } = await params;
  console.log('[StudentDetail] 🔍 StudentId:', studentId);

  const supabase = await createClient();

  // 교사 인증 확인
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('[StudentDetail] ❌ Authentication FAILED:', userError);
    redirect('/');
  }

  // 교사 프로필 확인
  const { data: teacherProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !teacherProfile || teacherProfile.role !== 'teacher') {
    console.error('[StudentDetail] ❌ Teacher access denied');
    redirect('/');
  }

  // 교사가 해당 학생을 담당하는지 확인
  const { data: assignment, error: assignmentError } = await supabase
    .from('teacher_student_assignments')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .single();

  if (assignmentError || !assignment) {
    console.error('[StudentDetail] ❌ Student not assigned to teacher');
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '3rem',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#FFD700' }}>⚠️ 접근 권한 없음</h1>
            <p style={{ marginTop: '1rem' }}>해당 학생에 대한 접근 권한이 없습니다.</p>
            <Link 
              href="/teacher/dashboard"
              style={{
                display: 'inline-block',
                backgroundColor: '#FFD700',
                color: 'black',
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 'bold',
                marginTop: '1rem'
              }}
            >
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 학생 프로필 정보 가져오기
  const { data: studentProfile, error: studentError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  // 학생 이메일 가져오기
  let studentEmail = '이메일 없음';
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const studentUser = authUsers.users?.find(u => u.id === studentId);
    studentEmail = studentUser?.email || '이메일 없음';
  } catch (error) {
    console.error('학생 이메일 조회 에러:', error);
  }

  // 학생의 테스트 결과 가져오기
  const { data: testResults, error: testError } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false });

  if (testError) {
    console.error('테스트 결과 조회 에러:', testError);
  }

  // 테스트 타입별 통계 계산
  const testTypes = ['LNF', 'NWF', 'PSF', 'WRF', 'ORF', 'MAZE'];
  const testStats = testTypes.map(testType => {
    const typeResults = (testResults as TestResult[])?.filter(r => r.test_type === testType) || [];
    const latestResult = typeResults[0];
    const avgAccuracy = typeResults.length > 0 
      ? Math.round(typeResults.reduce((sum, r) => sum + (r.accuracy || 0), 0) / typeResults.length)
      : 0;
    
    return {
      testType,
      totalTests: typeResults.length,
      latestAccuracy: latestResult?.accuracy || 0,
      avgAccuracy,
      lastTestDate: latestResult?.created_at ? new Date(latestResult.created_at).toLocaleDateString('ko-KR') : null,
      latestResult
    };
  });

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/owl.png" alt="학생" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  📊 학생 상세 평가 결과
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  {studentProfile?.full_name || studentEmail}
                </p>
              </div>
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
              <strong>이름:</strong> {studentProfile?.full_name || '미입력'}
            </div>
            <div>
              <strong>이메일:</strong> {studentEmail}
            </div>
            <div>
              <strong>반:</strong> {studentProfile?.class_name || '미지정'}
            </div>
            <div>
              <strong>학번:</strong> {studentProfile?.student_number || '미입력'}
            </div>
            <div>
              <strong>학년:</strong> {studentProfile?.grade_level || '미지정'}
            </div>
            <div>
              <strong>총 테스트 수:</strong> {testResults?.length || 0}회
            </div>
          </div>
        </div>

        {/* 테스트 타입별 결과 */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📈 테스트별 성과</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {testStats.map(stat => (
              <div 
                key={stat.testType}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>{stat.testType}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>총 테스트: <strong>{stat.totalTests}회</strong></div>
                  <div>최근 정확도: <strong style={{ color: stat.latestAccuracy >= 80 ? '#4CAF50' : stat.latestAccuracy >= 60 ? '#FF9800' : '#F44336' }}>{stat.latestAccuracy}%</strong></div>
                  <div>평균 정확도: <strong style={{ color: stat.avgAccuracy >= 80 ? '#4CAF50' : stat.avgAccuracy >= 60 ? '#FF9800' : '#F44336' }}>{stat.avgAccuracy}%</strong></div>
                  <div>마지막 테스트: <strong>{stat.lastTestDate || '없음'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 테스트 결과 상세 */}
        {testResults && testResults.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2rem',
            borderRadius: '15px',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📋 최근 테스트 결과</h2>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {(testResults as TestResult[]).slice(0, 10).map((result, index) => (
                  <div 
                    key={result.id}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#FFD700' }}>{result.test_type}</strong>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                        {new Date(result.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <div>정확도: <strong style={{ color: result.accuracy && result.accuracy >= 80 ? '#4CAF50' : result.accuracy && result.accuracy >= 60 ? '#FF9800' : '#F44336' }}>{result.accuracy || 0}%</strong></div>
                      <div>정답 여부: <strong style={{ color: result.is_correct ? '#4CAF50' : '#F44336' }}>{result.is_correct ? '정답' : '오답'}</strong></div>
                      {result.response_time && <div>응답 시간: <strong>{result.response_time}ms</strong></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}