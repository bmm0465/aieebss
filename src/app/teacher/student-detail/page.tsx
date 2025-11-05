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
          <h1 style={{ color: '#FFD700' }}>📚 학생 정보를 불러오는 중...</h1>
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
          border: '1px solid rgba(0, 0, 0, 0.1)',
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
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📊 전체 평가 현황</h2>
          {testResults && testResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {Object.entries(stats).map(([testType, stat]) => (
                <div key={testType} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center'
                }}>
                  <h3 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>
                    {testInfo[testType as keyof typeof testInfo]?.title || testType}
                  </h3>
                  <p style={{ marginBottom: '0.5rem', opacity: 0.8 }}>
                    {testInfo[testType as keyof typeof testInfo]?.description || '테스트'}
                  </p>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
                    {stat.accuracy}%
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    {stat.correct}/{stat.total} 정답
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
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.1)',
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
