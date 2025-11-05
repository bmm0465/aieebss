'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'

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
  stats: Record<string, { total: number; correct: number; accuracy: number }>;
}

function StudentDetailContent() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) {
        setError('학생 ID가 없습니다.')
        setLoading(false)
        return
      }

      try {
        console.log('STUDENT DETAIL: Fetching data for student ID:', studentId)
        
        const response = await fetch(`/api/teacher/students/${studentId}/results`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        console.log('STUDENT DETAIL: API response status:', response.status)

        if (response.status === 401) {
          router.push('/')
          return
        }

        if (response.status === 403) {
          setError('접근 권한이 없습니다.')
          setLoading(false)
          return
        }

        if (!response.ok) {
          setError('학생 정보를 찾을 수 없습니다.')
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log('STUDENT DETAIL: Data received:', data)
        
        setStudentData(data)
        setLoading(false)
      } catch (err) {
        console.error('STUDENT DETAIL: Error fetching data:', err)
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [studentId, router])

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
          <h1 style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2rem',
            fontWeight: 'bold'
          }}>📚 학생 정보를 불러오는 중...</h1>
        </div>
      </div>
    )
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
          <h1 style={{ 
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '1rem'
          }}>❌ 오류 발생</h1>
          <p style={{ marginBottom: '2rem', color: '#4b5563' }}>{error || '학생 정보를 불러올 수 없습니다.'}</p>
          <Link 
            href="/teacher/dashboard"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              padding: '0.8rem 1.5rem',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const { student, assignment, results: testResults, stats } = studentData

  const testInfo = {
    LNF: { title: 'LNF', description: '고대 룬 문자 해독' },
    PSF: { title: 'PSF', description: '소리의 원소 분리' },
    NWF: { title: 'NWF', description: '무의미 단어 읽기' },
    WRF: { title: 'WRF', description: '단어 읽기' },
    ORF: { title: 'ORF', description: '구두 읽기 유창성' },
    MAZE: { title: 'MAZE', description: '미로 이해도' }
  }

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
              {Object.entries(stats).map(([testType, stat]) => (
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
                    {testInfo[testType as keyof typeof testInfo]?.title || testType}
                  </h3>
                  <p style={{ marginBottom: '0.5rem', color: '#4b5563', fontSize: '0.9rem' }}>
                    {testInfo[testType as keyof typeof testInfo]?.description || '테스트'}
                  </p>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                    {stat.accuracy}%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
                    {stat.correct}/{stat.total} 정답
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
                  {testResults.slice(0, 20).map((result) => (
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
  )
}

export default function StudentDetailPage() {
  return (
    <Suspense fallback={
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
          <h1 style={{ color: '#FFD700' }}>📚 로딩 중...</h1>
        </div>
      </div>
    }>
      <StudentDetailContent />
    </Suspense>
  )
}
