'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function StudentDetailContent() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('id')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('STUDENT DETAIL: Student ID from URL:', studentId)
    console.log('STUDENT DETAIL: All search params:', searchParams.toString())
    setLoading(false)
  }, [studentId, searchParams])

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
        </div>
      </div>
    )
  }

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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            margin: 0,
            fontFamily: 'var(--font-nanum-pen)',
            color: '#FFD700',
            textShadow: '0 0 10px #FFD700'
          }}>
            🎓 학생 상세 평가 결과 (쿼리 파라미터 방식)
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            학생 ID: {studentId || '없음'}
          </p>
        </div>

        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>🔍 디버깅 정보</h2>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '1rem',
            borderRadius: '8px',
            fontFamily: 'monospace'
          }}>
            <p><strong>Student ID:</strong> {studentId || 'null'}</p>
            <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
            <p><strong>Search Params:</strong> {searchParams.toString() || 'empty'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentDetailPage() {
  return (
    <Suspense fallback={
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
          <h1 style={{ color: '#FFD700' }}>📚 로딩 중...</h1>
        </div>
      </div>
    }>
      <StudentDetailContent />
    </Suspense>
  )
}
