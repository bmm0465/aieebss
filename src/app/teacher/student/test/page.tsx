'use client'

export default function TestStudentPage() {
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
        <h1 style={{ color: '#FFD700', fontSize: '3rem', marginBottom: '2rem' }}>
          🎉 정적 라우트 테스트 성공!
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          이 페이지가 보인다면 라우팅은 정상 작동합니다.
        </p>
        <p style={{ fontSize: '1rem', opacity: 0.8 }}>
          문제는 동적 라우트 `[studentId]`에 있습니다.
        </p>
      </div>
    </div>
  )
}
