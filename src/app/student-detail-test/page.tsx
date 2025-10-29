'use client';

import { useEffect, useState } from 'react';

export default function StudentDetailTestPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    console.log('🚨 STUDENT DETAIL TEST PAGE LOADED!', new Date().toISOString());
    console.log('🎯 This is a completely new route - no Supabase, no middleware!');
    setIsLoaded(true);
  }, []);
  
  if (!isLoaded) {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          textAlign: 'center',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h1 style={{ color: '#FFD700' }}>⏳ 페이지 로딩 중...</h1>
        </div>
      </div>
    );
  }

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
          <h1 style={{ color: '#4CAF50', marginBottom: '1rem' }}>🧪 학생 상세 테스트 페이지</h1>
          <p style={{ marginBottom: '1rem' }}>완전히 새로운 경로: /student-detail-test</p>
          <p style={{ marginBottom: '1rem' }}>현재 시간: {new Date().toISOString()}</p>
          <p style={{ color: '#FFD700' }}>이 페이지가 보인다면 Next.js가 정상 작동하고 있습니다!</p>
          <p style={{ color: '#FFD700', marginTop: '1rem' }}>콘솔에 로그가 표시되어야 합니다!</p>
        </div>
      </div>
    </div>
  );
}
