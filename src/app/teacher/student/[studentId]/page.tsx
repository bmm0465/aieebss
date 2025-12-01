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

// 임시: 정적 테스트 데이터 (컴포넌트 외부로 이동)
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

export default function StudentDetailPage({ params }: Props) {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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
        backgroundColor: '#ffffff', 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: '#171717',
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
        backgroundColor: '#ffffff', 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: '#171717',
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
    p1_alphabet: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'p1_alphabet').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'p1_alphabet' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    p2_segmental_phoneme: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'p2_segmental_phoneme').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'p2_segmental_phoneme' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    p3_suprasegmental_phoneme: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'p3_suprasegmental_phoneme').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'p3_suprasegmental_phoneme' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    p4_phonics: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'p4_phonics').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'p4_phonics' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    p5_vocabulary: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'p5_vocabulary').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'p5_vocabulary' && !!r.is_correct).length || 0,
      accuracy: 0
    },
    p6_comprehension: {
      total: testResults?.filter((r: TestResultRow) => r.test_type === 'p6_comprehension').length || 0,
      correct: testResults?.filter((r: TestResultRow) => r.test_type === 'p6_comprehension' && !!r.is_correct).length || 0,
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
    p1_alphabet: { title: 'p1_alphabet', description: '고대 룬 문자 해독' },
    p2_segmental_phoneme: { title: 'p2_segmental_phoneme', description: '소리의 원소 분리' },
    p3_suprasegmental_phoneme: { title: 'p3_suprasegmental_phoneme', description: '마법 리듬 패턴' },
    p4_phonics: { title: 'p4_phonics', description: '파닉스 읽기 (무의미 단어, 실제 단어, 문장)' },
    p5_vocabulary: { title: 'p5_vocabulary', description: '마법서 그림 해석' },
    p6_comprehension: { title: 'p6_comprehension', description: '고대 전설 이해' }
  };

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
          borderRadius: '20px',
          marginBottom: '2rem',
          border: '2px solid #e5e7eb',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                margin: 0,
                fontFamily: 'var(--font-nanum-pen)',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 'bold'
              }}>
                🎓 학생 상세 평가 결과
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', color: '#4b5563', fontSize: '1.1rem', fontWeight: '500' }}>
                {student.full_name} 학생 ({assignment.class_name})
              </p>
            </div>
            <Link 
              href="/teacher/dashboard"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                padding: '0.8rem 1.5rem',
                borderRadius: '12px',
                textDecoration: 'none',
                border: 'none',
                fontWeight: '600',
                boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              ← 대시보드로
            </Link>
          </div>
        </div>

        {/* 전체 통계 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '20px',
          marginBottom: '2rem',
          border: '2px solid #e5e7eb',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '1.5rem',
            fontSize: '1.75rem',
            fontWeight: 'bold'
          }}>📊 전체 평가 현황</h2>
          {testResults && testResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {Object.entries(statistics).map(([testType, stats]) => (
                <div key={testType} style={{
                  backgroundColor: '#f9fafb',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  textAlign: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                  <h3 style={{ 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: '0.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    {testInfo[testType as keyof typeof testInfo].title}
                  </h3>
                  <p style={{ marginBottom: '0.5rem', color: '#4b5563', fontSize: '0.9rem' }}>
                    {testInfo[testType as keyof typeof testInfo].description}
                  </p>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                    {stats.accuracy}%
              </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
                    {stats.correct}/{stats.total} 정답
              </div>
              </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              border: '2px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.5rem',
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>평가 통계</h3>
              <p style={{ color: '#4b5563' }}>
                테스트를 완료하면 여기에 상세한 통계가 표시됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 최근 테스트 결과 */}
          <div style={{
          backgroundColor: '#ffffff',
            padding: '2rem',
            borderRadius: '20px',
            border: '2px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}>
          <h2 style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '1.5rem',
            fontSize: '1.75rem',
            fontWeight: 'bold'
          }}>📋 최근 테스트 결과</h2>
          
          {testResults && testResults.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #e5e7eb'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>테스트</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>문제</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>학생 답변</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>정답 여부</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.slice(0, 20).map((result: TestResultRow) => (
                    <tr key={result.id} style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: result.is_correct ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                    }}>
                      <td style={{ padding: '1rem', color: '#1f2937' }}>{result.test_type}</td>
                      <td style={{ padding: '1rem', color: '#1f2937' }}>{result.question || '-'}</td>
                      <td style={{ padding: '1rem', color: '#1f2937' }}>{result.student_answer || '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.375rem 0.875rem',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          backgroundColor: result.is_correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: result.is_correct ? '#10b981' : '#ef4444',
                          border: `1.5px solid ${result.is_correct ? '#10b981' : '#ef4444'}`
                        }}>
                          {result.is_correct ? '✅ 정답' : '❌ 오답'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#4b5563' }}>
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
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              border: '2px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <h3 style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '1rem',
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>아직 완료된 평가가 없습니다</h3>
              <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
                {student.full_name} 학생이 아직 어떤 테스트도 완료하지 않았습니다.
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                학생이 테스트를 완료하면 여기에 결과가 표시됩니다.
              </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
