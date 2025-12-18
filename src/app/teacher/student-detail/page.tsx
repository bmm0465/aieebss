'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { TeacherAudioPlayer } from '@/components/TeacherAudioPlayer'
import FeedbackSection from '@/components/FeedbackSection'

interface TestResultRow {
  id: number;
  test_type: string;
  question: string | null;
  student_answer: string | null;
  is_correct: boolean | null;
  created_at: string;
  audio_url?: string | null;
  transcription_results?: {
    openai?: { text?: string; confidence?: string; timeline?: unknown[]; error?: string };
    gemini?: { text?: string; confidence?: string; timeline?: unknown[]; error?: string };
    aws?: { text?: string; confidence?: string; timeline?: unknown[]; error?: string };
    azure?: { text?: string; confidence?: string; timeline?: unknown[]; error?: string };
  } | null;
  correct_answer?: string | null;
  time_taken?: number | null;
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

interface SessionGroup {
  sessionId: string;
  date: string;
  time: string;
  results: TestResultRow[];
}

// 세션별로 결과를 그룹화하는 함수
function groupResultsBySession(results: TestResultRow[]): SessionGroup[] {
  if (!results || results.length === 0) return [];

  // 시간순으로 정렬
  const sortedResults = [...results].sort((a, b) => 
    new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  const sessions: { [key: string]: TestResultRow[] } = {};
  
  // 날짜별로 먼저 구분
  sortedResults.forEach(result => {
    const resultTime = new Date(result.created_at || 0);
    const sessionKey = resultTime.toISOString().split('T')[0];
    
    if (!sessions[sessionKey]) {
      sessions[sessionKey] = [];
    }
    sessions[sessionKey].push(result);
  });

  // 각 날짜 내에서 세션을 더 세밀하게 구분
  const refinedSessions: { [key: string]: TestResultRow[] } = {};
  
  Object.keys(sessions).forEach(dateKey => {
    const dayResults = sessions[dateKey];
    const sessionGroups: TestResultRow[][] = [];
    let currentGroup: TestResultRow[] = [];
    let lastTime = 0;
    let lastTestType = '';

    dayResults.forEach(result => {
      const resultTime = new Date(result.created_at || 0).getTime();
      const currentTestType = result.test_type || '';
      
      const timeGap = resultTime - lastTime;
      const isSameTestType = currentTestType === lastTestType;
      
      // 같은 test_type 내에서는 10분, 다른 test_type으로 변경되거나 30분 이상 차이면 새로운 세션
      const shouldStartNewSession = (isSameTestType && timeGap > 600000 && currentGroup.length > 0) ||
                                    (!isSameTestType && timeGap > 1800000 && currentGroup.length > 0);
      
      if (shouldStartNewSession) {
        sessionGroups.push(currentGroup);
        currentGroup = [];
        lastTime = 0;
      }
      
      currentGroup.push(result);
      lastTime = resultTime;
      lastTestType = currentTestType;
    });
    
    if (currentGroup.length > 0) {
      sessionGroups.push(currentGroup);
    }

    // 각 세션 그룹을 고유한 키로 저장
    sessionGroups.forEach((group, index) => {
      const sessionId = `${dateKey}_${index}`;
      refinedSessions[sessionId] = group;
    });
  });

  // SessionGroup 배열로 변환
  return Object.entries(refinedSessions).map(([sessionId, sessionResults]) => {
    const firstResult = sessionResults[0];
    const lastResult = sessionResults[sessionResults.length - 1];
    const date = new Date(firstResult.created_at || 0);
    
    return {
      sessionId,
      date: date.toLocaleDateString('ko-KR'),
      time: `${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })} ~ ${new Date(lastResult.created_at || 0).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}`,
      results: sessionResults
    };
  }).sort((a, b) => {
    const aTime = new Date(a.sessionId.split('_')[0]).getTime();
    const bTime = new Date(b.sessionId.split('_')[0]).getTime();
    
    if (aTime === bTime) {
      const aSessionNum = parseInt(a.sessionId.split('_')[1] || '0');
      const bSessionNum = parseInt(b.sessionId.split('_')[1] || '0');
      return aSessionNum - bSessionNum;
    }
    
    return bTime - aTime; // 최신 세션이 먼저
  });
}

function StudentDetailContent() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [selectedTestType, setSelectedTestType] = useState<string | null>(null)
  const router = useRouter()

  // 세션별로 그룹화 - hooks는 early return 전에 호출해야 함
  const sessions = useMemo(() => {
    if (!studentData || !studentData.results) return [];
    return groupResultsBySession(studentData.results);
  }, [studentData])

  // 선택된 세션과 교시의 상세 결과 가져오기
  const selectedResults = useMemo(() => {
    if (!selectedSession || !selectedTestType || !sessions.length) return [];
    
    const session = sessions.find(s => s.sessionId === selectedSession);
    if (!session) return [];
    
    return session.results.filter(r => r.test_type === selectedTestType);
  }, [selectedSession, selectedTestType, sessions]);

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
        backgroundColor: '#f3f4f6', 
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
        backgroundColor: '#f3f4f6', 
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

  const { student, assignment, results: testResults } = studentData

  const testInfo = {
    p1_alphabet: { title: '1교시', description: '알파벳 대소문자를 소리 내어 읽기' },
    p2_segmental_phoneme: { title: '2교시', description: '단어를 듣고 올바른 단어 고르기' },
    p3_suprasegmental_phoneme: { title: '3교시', description: '단어를 듣고 올바른 강세 고르기' },
    p4_phonics: { title: '4교시', description: '무의미 단어, 단어, 문장을 소리 내어 읽기' },
    p5_vocabulary: { title: '5교시', description: '단어, 어구, 문장을 듣거나 읽고 올바른 그림 고르기' },
    p6_comprehension: { title: '6교시', description: '대화를 듣거나 읽고, 질문에 대한 올바른 그림 고르기' },
    // 하위 호환성을 위한 구형 타입 지원
    LNF: { title: 'LNF', description: '고대 룬 문자 해독' },
    PSF: { title: 'PSF', description: '소리의 원소 분리' },
    NWF: { title: 'NWF', description: '무의미 단어 읽기' },
    WRF: { title: 'WRF', description: '단어 읽기' },
    ORF: { title: 'ORF', description: '구두 읽기 유창성' },
    MAZE: { title: 'MAZE', description: '미로 이해도' }
  }

  // 세션별 통계 계산
  const calculateSessionStats = (sessionResults: TestResultRow[]) => {
    const stats: Record<string, { total: number; correct: number; accuracy: number; avgTime: number | null }> = {};
    
    sessionResults.forEach(result => {
      const testType = result.test_type || 'unknown';
      if (!stats[testType]) {
        stats[testType] = { total: 0, correct: 0, accuracy: 0, avgTime: null };
      }
      stats[testType].total++;
      if (result.is_correct) {
        stats[testType].correct++;
      }
    });

    Object.keys(stats).forEach(testType => {
      const stat = stats[testType];
      stat.accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      
      // 평균 시간 계산
      const timeResults = sessionResults.filter(r => {
        const typeMatch = (r.test_type || 'unknown') === testType;
        const hasTime = r.time_taken !== null && r.time_taken !== undefined && r.time_taken > 0;
        return typeMatch && hasTime;
      });
      if (timeResults.length > 0) {
        const totalTime = timeResults.reduce((sum, r) => {
          const timeValue = r.time_taken ?? 0;
          return sum + timeValue;
        }, 0);
        stat.avgTime = Math.round(totalTime / timeResults.length);
      }
    });

    return stats;
  };

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6', 
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

        {/* 세션별 평가 현황 */}
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const sessionStats = calculateSessionStats(session.results);
            
            return (
              <div key={session.sessionId} style={{
                backgroundColor: '#ffffff',
                padding: '2rem',
                borderRadius: '20px',
                marginBottom: '2rem',
                border: '2px solid #e5e7eb',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    margin: 0
                  }}>
                    📊 평가 세션 - {session.date}
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    {session.time}
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* 1교시부터 6교시 순서로 명시적으로 표시 */}
                  {(['p1_alphabet', 'p2_segmental_phoneme', 'p3_suprasegmental_phoneme', 'p4_phonics', 'p5_vocabulary', 'p6_comprehension'] as const).map((testType) => {
                    const stat = sessionStats[testType];
                    if (!stat) return null;
                    
                    return (
                      <div 
                        key={testType} 
                        onClick={() => {
                          setSelectedSession(session.sessionId);
                          setSelectedTestType(testType);
                        }}
                        style={{
                          backgroundColor: '#f9fafb',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: '2px solid #e5e7eb',
                          textAlign: 'center',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          flex: '1 1 200px',
                          minWidth: '200px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 12px -1px rgba(99, 102, 241, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        }}
                      >
                        <h3 style={{ 
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          marginBottom: '0.5rem',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}>
                          {testInfo[testType]?.title || testType}
                        </h3>
                        <p style={{ marginBottom: '0.5rem', color: '#4b5563', fontSize: '0.9rem' }}>
                          {testInfo[testType]?.description || '테스트'}
                        </p>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                          {stat.accuracy}%
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
                          {stat.correct}/{stat.total} 정답
                        </div>
                        {stat.avgTime !== null && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#9C27B0', fontWeight: '500' }}>
                            평균 시간: {Math.floor(stat.avgTime / 60)}분 {stat.avgTime % 60}초
                          </div>
                        )}
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                          클릭하여 상세 보기
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '2rem',
            borderRadius: '20px',
            marginBottom: '2rem',
            border: '2px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            textAlign: 'center'
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
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>음성 재생</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>전사 결과</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>정답 여부</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>평가 시간</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.slice(0, 20).map((result: TestResultRow) => {
                    // 전사 결과 추출 (OpenAI 우선)
                    const transcriptionText = result.transcription_results?.openai?.text 
                      || result.transcription_results?.gemini?.text
                      || result.transcription_results?.aws?.text
                      || result.transcription_results?.azure?.text
                      || null;
                    
                    return (
                      <tr key={result.id} style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: result.is_correct ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                      }}>
                        <td style={{ padding: '1rem', color: '#1f2937' }}>{result.test_type}</td>
                        <td style={{ padding: '1rem', color: '#1f2937' }}>{result.question || '-'}</td>
                        <td style={{ padding: '1rem', color: '#1f2937' }}>{result.student_answer || '-'}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {result.audio_url ? (
                            <TeacherAudioPlayer
                              audioPath={result.audio_url}
                              userId={student.id}
                              testType={result.test_type}
                              createdAt={result.created_at}
                            />
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: '#1f2937', maxWidth: '300px', wordBreak: 'break-word' }}>
                          {transcriptionText ? (
                            <div style={{ fontSize: '0.875rem' }}>
                              {transcriptionText}
                              {result.transcription_results?.openai?.confidence && (
                                <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                                  (신뢰도: {result.transcription_results.openai.confidence})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>-</span>
                          )}
                        </td>
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
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#4b5563' }}>
                          {result.time_taken && result.time_taken > 0
                            ? `${Math.floor(result.time_taken / 60)}분 ${result.time_taken % 60}초`
                            : '-'
                          }
                        </td>
                        <td style={{ padding: '1rem', color: '#4b5563' }}>
                          {new Date(result.created_at).toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    );
                  })}
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

        {/* 상세 결과 모달 */}
        {selectedSession && selectedTestType && selectedResults.length > 0 && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '2rem'
            }}
            onClick={() => {
              setSelectedSession(null);
              setSelectedTestType(null);
            }}
          >
            <div 
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '2rem',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  margin: 0
                }}>
                  {testInfo[selectedTestType as keyof typeof testInfo]?.title || selectedTestType} 상세 결과
                </h2>
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    setSelectedTestType(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.color = '#1f2937';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  backgroundColor: '#ffffff'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>문제</th>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>학생 답변</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>음성 재생</th>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>전사 결과</th>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>정답 여부</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb', color: '#1f2937', fontWeight: '600' }}>평가 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResults.map((result: TestResultRow) => {
                      const transcriptionText = result.transcription_results?.openai?.text 
                        || result.transcription_results?.gemini?.text
                        || result.transcription_results?.aws?.text
                        || result.transcription_results?.azure?.text
                        || null;
                      
                      return (
                        <tr key={result.id} style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: result.is_correct ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                        }}>
                          <td style={{ padding: '1rem', color: '#1f2937' }}>{result.question || '-'}</td>
                          <td style={{ padding: '1rem', color: '#1f2937' }}>{result.student_answer || '-'}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {result.audio_url ? (
                              <TeacherAudioPlayer
                                audioPath={result.audio_url}
                                userId={student.id}
                                testType={result.test_type}
                                createdAt={result.created_at}
                              />
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', color: '#1f2937', maxWidth: '300px', wordBreak: 'break-word' }}>
                            {transcriptionText ? (
                              <div style={{ fontSize: '0.875rem' }}>
                                {transcriptionText}
                                {result.transcription_results?.openai?.confidence && (
                                  <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                                    (신뢰도: {result.transcription_results.openai.confidence})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>-</span>
                            )}
                          </td>
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
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#4b5563' }}>
                            {result.time_taken && result.time_taken > 0
                              ? `${Math.floor(result.time_taken / 60)}분 ${result.time_taken % 60}초`
                              : '-'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Hattie 프레임워크 기반 피드백 섹션 */}
              <div style={{ marginTop: '2rem' }}>
                <FeedbackSection
                  testType={selectedTestType}
                  sessionId={selectedSession}
                  hasResults={selectedResults.length > 0}
                />
              </div>
            </div>
          </div>
        )}
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