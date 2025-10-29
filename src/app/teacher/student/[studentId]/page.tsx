import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  const { studentId } = await params;
  
  const supabase = await createClient();

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/');
  }

  // 교사 권한 확인
  const { data: teacherProfile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!teacherProfile || teacherProfile.role !== 'teacher') {
    redirect('/lobby');
  }

  // 교사-학생 할당 관계 확인
  const { data: assignment } = await supabase
    .from('teacher_student_assignments')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .single();

  if (!assignment) {
    notFound();
  }

  // 학생 프로필 정보
  const { data: student } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', studentId)
    .single();

  if (!student) {
    notFound();
  }

  // 학생의 테스트 결과 통계
  const { data: testResults } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false });

  // 테스트별 통계 계산
  const statistics = {
    LNF: {
      total: testResults?.filter(r => r.test_type === 'LNF').length || 0,
      correct: testResults?.filter(r => r.test_type === 'LNF' && r.is_correct).length || 0,
      accuracy: 0
    },
    PSF: {
      total: testResults?.filter(r => r.test_type === 'PSF').length || 0,
      correct: testResults?.filter(r => r.test_type === 'PSF' && r.is_correct).length || 0,
      accuracy: 0
    },
    NWF: {
      total: testResults?.filter(r => r.test_type === 'NWF').length || 0,
      correct: testResults?.filter(r => r.test_type === 'NWF' && r.is_correct).length || 0,
      accuracy: 0
    },
    WRF: {
      total: testResults?.filter(r => r.test_type === 'WRF').length || 0,
      correct: testResults?.filter(r => r.test_type === 'WRF' && r.is_correct).length || 0,
      accuracy: 0
    },
    ORF: {
      total: testResults?.filter(r => r.test_type === 'ORF').length || 0,
      correct: testResults?.filter(r => r.test_type === 'ORF' && r.is_correct).length || 0,
      accuracy: 0
    },
    MAZE: {
      total: testResults?.filter(r => r.test_type === 'MAZE').length || 0,
      correct: testResults?.filter(r => r.test_type === 'MAZE' && r.is_correct).length || 0,
      accuracy: 0
    }
  };

  // 정확도 계산
  Object.keys(statistics).forEach(testType => {
    const stats = statistics[testType as keyof typeof statistics];
    if (stats.total > 0) {
      stats.accuracy = Math.round((stats.correct / stats.total) * 100);
    }
  });

  const testInfo = {
    LNF: { title: 'LNF', description: '고대 룬 문자 해독' },
    PSF: { title: 'PSF', description: '소리의 원소 분리' },
    NWF: { title: 'NWF', description: '무의미 단어 읽기' },
    WRF: { title: 'WRF', description: '단어 읽기' },
    ORF: { title: 'ORF', description: '구두 읽기 유창성' },
    MAZE: { title: 'MAZE', description: '미로 이해도' }
  };

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
            <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                margin: 0,
                fontFamily: 'var(--font-nanum-pen)',
                color: '#FFD700',
                textShadow: '0 0 10px #FFD700'
              }}>
                🎓 학생 상세 평가 결과
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                {student.full_name} 학생 ({assignment.class_name})
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
              ← 대시보드로
            </Link>
          </div>
        </div>

        {/* 전체 통계 */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📊 전체 평가 현황</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(statistics).map(([testType, stats]) => (
              <div key={testType} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>
                  {testInfo[testType as keyof typeof testInfo].title}
                </h3>
                <p style={{ marginBottom: '0.5rem', opacity: 0.8 }}>
                  {testInfo[testType as keyof typeof testInfo].description}
                </p>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
                  {stats.accuracy}%
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                  {stats.correct}/{stats.total} 정답
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 테스트 결과 */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📋 최근 테스트 결과</h2>
          
          {testResults && testResults.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 215, 0, 0.2)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>테스트</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>문제</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>학생 답변</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>정답 여부</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.slice(0, 20).map((result) => (
                    <tr key={result.id} style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: result.is_correct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                    }}>
                      <td style={{ padding: '1rem' }}>{result.test_type}</td>
                      <td style={{ padding: '1rem' }}>{result.question || '-'}</td>
                      <td style={{ padding: '1rem' }}>{result.student_answer || '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.3rem 0.8rem',
                          borderRadius: '15px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          backgroundColor: result.is_correct ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: result.is_correct ? '#22c55e' : '#ef4444',
                          border: `1px solid ${result.is_correct ? '#22c55e' : '#ef4444'}`
                        }}>
                          {result.is_correct ? '✅ 정답' : '❌ 오답'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {new Date(result.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
              <p>아직 완료된 평가가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
