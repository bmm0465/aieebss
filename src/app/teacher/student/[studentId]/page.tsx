'use client'

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
  params: Promise<{ studentId: string }>;
}

interface TestResultRow {
  id: number;
  test_type: string;
  question: string | null;
  student_answer: string | null;
  is_correct: boolean | null;
  created_at: string;
}

interface StudentData {
  student: {
    id: string;
    full_name: string;
    class_name: string;
    grade_level: number;
    student_number: string;
  };
  assignment: {
    class_name: string;
  };
  results: TestResultRow[];
}

// 서버 측 캐싱 방지
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function StudentDetailPage({ params }: Props) {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // 임시: 정적 테스트 데이터
  const testStudentData: StudentData = {
    student: {
      id: 'test-id',
      full_name: '테스트 학생',
      class_name: '테스트 반',
      grade_level: 3,
      student_number: '1'
    },
    assignment: {
      class_name: '테스트 반'
    },
    results: []
  };

  useEffect(() => {
    const initializePage = async () => {
      try {
        console.log('PAGE: ===== StudentDetailPage INIT =====');
        console.log('PAGE: Current URL:', window.location.href);
        console.log('PAGE: Document cookies:', document.cookie);
        console.log('PAGE: User agent:', navigator.userAgent);
        
        // params에서 studentId 추출
        const resolvedParams = await params;
        const id = resolvedParams.studentId;
        console.log('PAGE: StudentDetailPage loaded for studentId:', id);
        console.log('PAGE: Resolved params:', resolvedParams);
        console.log('PAGE: StudentId type:', typeof id);
        console.log('PAGE: StudentId length:', id?.length);

        // 인증 확인 - 여러 방법으로 시도
        console.log('PAGE: Starting auth check...');
        
        // 방법 1: getUser()
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('PAGE: Auth check (getUser) - user:', user?.id, 'error:', authError);
        console.log('PAGE: Auth check (getUser) - user email:', user?.email);
        
        // 방법 2: getSession()
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('PAGE: Auth check (getSession) - session:', sessionData?.session?.user?.id, 'error:', sessionError);
        
        // 방법 3: onAuthStateChange 이벤트 리스너
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('PAGE: Auth state change:', event, session?.user?.id);
        });
        
        // 정리
        setTimeout(() => {
          subscription.unsubscribe();
        }, 1000);
        
        if (authError || !user) {
          console.log('PAGE: ===== AUTH FAILED =====');
          console.log('PAGE: Auth error details:', authError);
          console.log('PAGE: Session error details:', sessionError);
          console.log('PAGE: Current URL:', window.location.href);
          console.log('PAGE: All cookies:', document.cookie);
          console.log('PAGE: Supabase cookies:', document.cookie.split(';').filter(c => c.includes('supabase')));
          console.log('PAGE: Local storage:', Object.keys(localStorage));
          console.log('PAGE: Session storage:', Object.keys(sessionStorage));
          
          // 임시: 인증 실패 시에도 페이지를 계속 로드 (디버깅용)
          console.log('PAGE: TEMPORARY: Continuing without auth for debugging');
          // window.location.href = '/';
          // return;
        } else {
          console.log('PAGE: ===== AUTH SUCCESS =====');
          console.log('PAGE: User authenticated:', user.email);
        }

        // 임시: API 호출 대신 테스트 데이터 사용
        console.log('PAGE: Using test data instead of API call');
        console.log('PAGE: Test student data:', testStudentData);
        
        setStudentData(testStudentData);
        setLoading(false);

        // 원래 API 호출 코드 (주석 처리)
        /*
        const baseUrl = window.location.origin;
        console.log('PAGE: Making API call to:', `${baseUrl}/api/teacher/students/${id}/results`);

        const apiRes = await fetch(`${baseUrl}/api/teacher/students/${id}/results`, {
          method: 'GET',
          cache: 'no-store',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        });

        console.log('PAGE: API response status:', apiRes.status);

        if (apiRes.status === 401) {
          console.log('PAGE: Redirecting to login - API returned 401');
          router.push('/');
          return;
        }
        if (apiRes.status === 403) {
          console.log('PAGE: Not found - API returned 403');
          setError('접근 권한이 없습니다.');
          setLoading(false);
          return;
        }
        if (!apiRes.ok) {
          console.log('PAGE: Not found - API not ok:', apiRes.status);
          setError('학생 정보를 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        const data = await apiRes.json() as StudentData;
        console.log('PAGE: Successfully fetched data - student:', data.student?.full_name, 'results count:', data.results?.length || 0);
        console.log('PAGE: Full API response data:', data);
        
        setStudentData(data);
        setLoading(false);
        */
      } catch (err) {
        console.error('PAGE: Error loading student data:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    initializePage();
  }, [params, router, supabase]);

  if (loading) {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#FFD700' }}>📚 학생 정보를 불러오는 중...</h1>
          <p style={{ marginTop: '1rem', opacity: 0.8 }}>
            디버깅 모드: 인증 우회 중...
          </p>
        </div>
      </div>
    );
  }

  if (error || !studentData) {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#F44336' }}>❌ 오류 발생</h1>
          <p style={{ marginBottom: '2rem' }}>{error || '학생 정보를 불러올 수 없습니다.'}</p>
          <Link 
            href="/teacher/dashboard"
            style={{
              backgroundColor: '#FFD700',
              color: 'black',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const { student, assignment, results: testResults } = studentData;

  // 테스트별 통계 계산
  const statistics = {
    LNF: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'LNF').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'LNF' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    PSF: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'PSF').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'PSF' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    NWF: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'NWF').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'NWF' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    WRF: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'WRF').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'WRF' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    ORF: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'ORF').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'ORF' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    MAZE: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'MAZE').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'MAZE' && !!r.is_correct).length || 0,
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
          {testResults && testResults.length > 0 ? (
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
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>평가 통계</h3>
              <p style={{ opacity: 0.8 }}>
                테스트를 완료하면 여기에 상세한 통계가 표시됩니다.
              </p>
            </div>
          )}
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
                  {testResults.slice(0, 20).map((result: TestResultRow) => (
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
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 2rem', 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>아직 완료된 평가가 없습니다</h3>
              <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                {student.full_name} 학생이 아직 어떤 테스트도 완료하지 않았습니다.
              </p>
              <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                학생이 테스트를 완료하면 여기에 결과가 표시됩니다.
              </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
