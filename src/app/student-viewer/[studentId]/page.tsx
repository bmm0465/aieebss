'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function StudentViewerPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<{
    success: boolean;
    student: {
      id: string;
      full_name: string;
      class_name: string;
    };
    message: string;
  } | null>(null);
  
  useEffect(() => {
    console.log('🎯 StudentViewerPage started:', { studentId });
    console.log('🚨 FORCE LOG - PAGE IS LOADING!', new Date().toISOString());
    
    // API를 통해 데이터 가져오기 시도
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/student/${studentId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        console.log('📊 Student data fetched:', data);
        setStudentData(data);
        setIsLoaded(true);
      } catch (err) {
        console.error('❌ Error fetching student data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoaded(true);
      }
    };
    
    fetchData();
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
          <h1 style={{ color: '#FFD700' }}>⏳ 학생 정보 로딩 중...</h1>
        </div>
      </div>
    );
  }

  if (error) {
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
            <h1 style={{ color: '#F44336', marginBottom: '1rem' }}>❌ 오류 발생</h1>
            <p style={{ marginBottom: '1rem' }}>Student ID: {studentId}</p>
            <p style={{ marginBottom: '1rem' }}>오류: {error}</p>
            <p style={{ color: '#FFD700' }}>하지만 페이지는 정상적으로 로드되었습니다!</p>
          </div>
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
          <h1 style={{ color: '#4CAF50', marginBottom: '1rem' }}>🎉 학생 상세 정보</h1>
          <p style={{ marginBottom: '1rem' }}>Student ID: {studentId}</p>
          {studentData && (
            <>
              <p style={{ marginBottom: '1rem' }}>학생 이름: {studentData.student?.full_name}</p>
              <p style={{ marginBottom: '1rem' }}>반: {studentData.student?.class_name}</p>
            </>
          )}
          <p style={{ marginBottom: '1rem' }}>현재 시간: {new Date().toISOString()}</p>
          <p style={{ color: '#FFD700' }}>이 메시지가 보인다면 페이지 컴포넌트가 정상적으로 실행되고 있습니다!</p>
          <p style={{ color: '#FFD700', marginTop: '1rem' }}>콘솔에 로그가 표시되어야 합니다!</p>
        </div>
      </div>
    </div>
  );
}
