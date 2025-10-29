'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    console.log('🎯 StudentDetailPage started:', { studentId });
    console.log('🚨 FORCE LOG - PAGE IS LOADING!', new Date().toISOString());
    setIsLoaded(true);
  }, [studentId]);
  
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

  // 디버깅용 - Supabase 호출 없이 단순한 페이지 반환
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
          <h1 style={{ color: '#4CAF50', marginBottom: '1rem' }}>🎉 페이지 로드 성공!</h1>
          <p style={{ marginBottom: '1rem' }}>Student ID: {studentId}</p>
          <p style={{ marginBottom: '1rem' }}>현재 시간: {new Date().toISOString()}</p>
          <p style={{ color: '#FFD700' }}>이 메시지가 보인다면 페이지 컴포넌트가 정상적으로 실행되고 있습니다!</p>
          <p style={{ color: '#FFD700', marginTop: '1rem' }}>콘솔에 로그가 표시되어야 합니다!</p>
        </div>
      </div>
    </div>
  );
}