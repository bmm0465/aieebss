'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AudioResult {
  id: string;
  test_type: string;
  question?: string;
  question_word?: string;
  student_answer?: string;
  is_correct?: boolean;
  audio_url?: string;
  created_at?: string;
  error_type?: string;
  correct_segments?: number;
  target_segments?: number;
  wcpm?: number;
  accuracy?: number;
}

interface AudioResultTableProps {
  testType: string;
  sessionId?: string;
  studentId?: string; // 교사가 특정 학생의 결과를 볼 때 사용
}

export default function AudioResultTable({ testType, sessionId, studentId }: AudioResultTableProps) {
  const [results, setResults] = useState<AudioResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from('test_results')
        .select('*')
        .eq('test_type', testType)
        .not('audio_url', 'is', null) // 음성 파일이 있는 결과만
        .order('created_at', { ascending: false });

      if (sessionId) {
        // 세션별 결과 조회
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('인증이 필요합니다.');
        
        const [dateStr] = sessionId.split('_');
        const sessionDate = new Date(dateStr);
        
        query = query
          .eq('user_id', session.user.id)
          .gte('created_at', sessionDate.toISOString().split('T')[0])
          .lt('created_at', new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      } else if (studentId) {
        // 교사가 특정 학생의 결과 조회
        query = query.eq('user_id', studentId);
      } else {
        // 현재 로그인한 사용자의 결과 조회
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('인증이 필요합니다.');
        query = query.eq('user_id', session.user.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setResults(data || []);
    } catch (err) {
      console.error('결과 조회 에러:', err);
      setError(err instanceof Error ? err.message : '결과를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [testType, sessionId, studentId]);

  React.useEffect(() => {
    if (testType) {
      fetchResults();
    }
  }, [testType, sessionId, studentId, fetchResults]);

  const getCorrectAnswer = (result: AudioResult): string => {
    return result.question || result.question_word || 'N/A';
  };

  const getTestTypeName = (type: string): string => {
    const testNames: Record<string, string> = {
      'LNF': '1교시: 고대 룬 문자 해독',
      'PSF': '2교시: 소리의 원소 분리',
      'NWF': '3교시: 초급 주문 시전',
      'WRF': '4교시: 마법 단어 활성화',
      'ORF': '5교시: 고대 이야기 소생술',
      'MAZE': '6교시: 지혜의 미로 탈출'
    };
    return testNames[type] || type;
  };


  if (loading) {
    return (
      <div style={{ 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: '2rem', 
        borderRadius: '15px', 
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#ccc' }}>결과를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        backgroundColor: 'rgba(220, 53, 69, 0.2)', 
        border: '1px solid rgba(220, 53, 69, 0.5)', 
        borderRadius: '10px', 
        padding: '1rem', 
        marginTop: '2rem',
        color: '#ff6b6b'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>⚠️ 오류</p>
        <p style={{ margin: '0.5rem 0 0 0' }}>{error}</p>
        <button 
          onClick={fetchResults}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(220, 53, 69, 0.2)',
            color: '#ff6b6b',
            border: '1px solid rgba(220, 53, 69, 0.5)',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={{ 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: '2rem', 
        borderRadius: '15px', 
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>
          🎵 {getTestTypeName(testType)} 음성 결과
        </h3>
        <p style={{ color: '#ccc' }}>
          {getTestTypeName(testType)} 테스트의 음성 파일이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'rgba(0,0,0,0.7)', 
      padding: '2rem', 
      borderRadius: '15px', 
      marginTop: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#FFD700', margin: 0 }}>
          🎵 {getTestTypeName(testType)} 음성 결과 ({results.length}개)
        </h3>
        <button 
          onClick={fetchResults}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(255,215,0,0.2)',
            color: '#FFD700',
            border: '1px solid rgba(255,215,0,0.5)',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 새로고침
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                음성 파일
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                전사 결과
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                정답
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                결과
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                시간
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <React.Fragment key={result.id}>
                <tr 
                  style={{ 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    backgroundColor: expandedRow === result.id ? 'rgba(255, 215, 0, 0.05)' : 'transparent'
                  }}
                  onClick={() => setExpandedRow(expandedRow === result.id ? null : result.id)}
                >
                  <td style={{ padding: '1rem' }}>
                    {result.audio_url ? (
                      <AudioPlayer audioPath={result.audio_url} />
                    ) : (
                      <span style={{ color: '#ccc' }}>음성 파일 없음</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: '#e9ecef' }}>
                    <div style={{ maxWidth: '200px', wordBreak: 'break-word' }}>
                      {result.student_answer || '전사 결과 없음'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#e9ecef', fontWeight: 'bold' }}>
                    {getCorrectAnswer(result)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <ResultBadge 
                      isCorrect={result.is_correct} 
                      correctSegments={result.correct_segments}
                      targetSegments={result.target_segments}
                    />
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', color: '#ccc', fontSize: '0.9rem' }}>
                    {result.created_at ? new Date(result.created_at).toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    }) : 'N/A'}
                  </td>
                </tr>
                {expandedRow === result.id && (
                  <tr>
                    <td colSpan={5} style={{ padding: '0 1rem 1rem 1rem' }}>
                      <div style={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                        padding: '1rem', 
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div>
                            <strong style={{ color: '#FFD700' }}>문제 ID:</strong> {result.id.slice(0, 8)}...
                          </div>
                          {result.correct_segments !== undefined && result.target_segments !== undefined && (
                            <div>
                              <strong style={{ color: '#FFD700' }}>세그먼트 정확도:</strong> {result.correct_segments}/{result.target_segments}
                            </div>
                          )}
                          {result.wcpm && (
                            <div>
                              <strong style={{ color: '#FFD700' }}>WCPM:</strong> {result.wcpm}
                            </div>
                          )}
                          {result.accuracy && (
                            <div>
                              <strong style={{ color: '#FFD700' }}>정확도:</strong> {result.accuracy.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 오디오 플레이어 컴포넌트
function AudioPlayer({ audioPath }: { audioPath: string }) {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const loadAudioUrl = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from('student-recordings')
          .createSignedUrl(audioPath, 3600);
        
        if (data?.signedUrl) {
          setAudioUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('오디오 URL 생성 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAudioUrl();
  }, [audioPath]);

  if (loading) {
    return <span style={{ color: '#ccc' }}>로딩 중...</span>;
  }

  if (!audioUrl) {
    return <span style={{ color: '#dc3545' }}>재생 불가</span>;
  }

  return (
    <audio controls style={{ width: '200px', height: '40px' }}>
      <source src={audioUrl} type="audio/webm" />
      브라우저가 오디오 재생을 지원하지 않습니다.
    </audio>
  );
}

// 결과 배지 컴포넌트
function ResultBadge({ 
  isCorrect, 
  correctSegments, 
  targetSegments 
}: { 
  isCorrect?: boolean; 
  correctSegments?: number;
  targetSegments?: number;
}) {
  if (isCorrect === true) {
    return (
      <span style={{
        backgroundColor: 'rgba(40, 167, 69, 0.2)',
        color: '#28a745',
        padding: '0.3rem 0.8rem',
        borderRadius: '15px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
      }}>
        ✅ 정답
      </span>
    );
  } else if (isCorrect === false) {
    if (correctSegments !== undefined && targetSegments !== undefined && correctSegments > 0) {
      return (
        <span style={{
          backgroundColor: 'rgba(255, 193, 7, 0.2)',
          color: '#ffc107',
          padding: '0.3rem 0.8rem',
          borderRadius: '15px',
          fontSize: '0.8rem',
          fontWeight: 'bold'
        }}>
          ⚠️ 부분정답 ({correctSegments}/{targetSegments})
        </span>
      );
    }
    return (
      <span style={{
        backgroundColor: 'rgba(220, 53, 69, 0.2)',
        color: '#dc3545',
        padding: '0.3rem 0.8rem',
        borderRadius: '15px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
      }}>
        ❌ 오답
      </span>
    );
  }
  
  return (
    <span style={{
      backgroundColor: 'rgba(108, 117, 125, 0.2)',
      color: '#6c757d',
      padding: '0.3rem 0.8rem',
      borderRadius: '15px',
      fontSize: '0.8rem'
    }}>
      -
    </span>
  );
}
