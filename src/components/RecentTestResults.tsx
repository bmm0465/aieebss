'use client'

import React from 'react';

interface TestResult {
  id: string;
  test_type: string;
  question: string;
  student_answer: string;
  is_correct: boolean | null;
  accuracy: number | null;
  wcpm: number | null;
  time_taken: number | null;
  audio_url: string | null;
  created_at: string;
  error_details?: Record<string, unknown>;
}

interface RecentTestResultsProps {
  results: TestResult[];
}

export default function RecentTestResults({ results }: RecentTestResultsProps) {
  if (results.length === 0) {
    return (
      <div style={{
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '2rem',
        borderRadius: '15px',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>📋 최근 평가 결과</h3>
        <p style={{ opacity: 0.8 }}>아직 평가 결과가 없습니다.</p>
      </div>
    );
  }

  const getTestTypeEmoji = (testType: string) => {
    const emojis: Record<string, string> = {
      'LNF': '🔤',
      'PSF': '👂',
      'NWF': '🔀',
      'WRF': '📖',
      'ORF': '🗣️',
      'STRESS': '🎵',
      'MEANING': '🖼️',
      'COMPREHENSION': '💭'
    };
    return emojis[testType] || '📝';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timeMs: number | null) => {
    if (!timeMs) return 'N/A';
    return `${Math.round(timeMs / 1000)}초`;
  };

  return (
    <div style={{
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '2rem',
      borderRadius: '15px',
      border: '1px solid rgba(255, 215, 0, 0.3)'
    }}>
      <h3 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📋 최근 평가 결과</h3>
      
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {results.map((result) => (
            <div 
              key={result.id}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: `2px solid ${result.is_correct ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`
              }}
            >
              {/* 헤더 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{getTestTypeEmoji(result.test_type)}</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: result.is_correct ? '#4CAF50' : '#F44336',
                    fontSize: '1.1rem'
                  }}>
                    {result.test_type} - {result.is_correct ? '정답' : '오답'}
                  </span>
                </div>
                <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                  {formatDate(result.created_at)}
                </span>
              </div>

              {/* 문제와 답변 */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#FFD700' }}>문제:</strong>
                  <div style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '0.5rem',
                    borderRadius: '5px',
                    marginTop: '0.3rem',
                    fontFamily: 'monospace'
                  }}>
                    {result.question || 'N/A'}
                  </div>
                </div>
                
                <div>
                  <strong style={{ color: '#FFD700' }}>학생 답변:</strong>
                  <div style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '0.5rem',
                    borderRadius: '5px',
                    marginTop: '0.3rem',
                    fontFamily: 'monospace',
                    color: result.is_correct ? '#4CAF50' : '#F44336'
                  }}>
                    {result.student_answer || 'N/A'}
                  </div>
                </div>
              </div>

              {/* 통계 정보 */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                gap: '1rem'
              }}>
                {result.accuracy && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold', 
                      color: '#2196F3' 
                    }}>
                      {result.accuracy}%
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>정확도</div>
                  </div>
                )}

                {result.wcpm && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold', 
                      color: '#FF9800' 
                    }}>
                      {result.wcpm}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>WCPM</div>
                  </div>
                )}

                {result.time_taken && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold', 
                      color: '#9C27B0' 
                    }}>
                      {formatTime(result.time_taken)}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>소요시간</div>
                  </div>
                )}
              </div>

              {/* 오류 상세 정보 */}
              {result.error_details && (
                <div style={{ 
                  marginTop: '1rem',
                  padding: '0.8rem',
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  borderRadius: '5px',
                  border: '1px solid rgba(255, 152, 0, 0.3)'
                }}>
                  <strong style={{ color: '#FF9800' }}>오류 상세:</strong>
                  <pre style={{ 
                    margin: '0.5rem 0 0 0',
                    fontSize: '0.8rem',
                    color: '#FF9800',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {JSON.stringify(result.error_details, null, 2)}
                  </pre>
                </div>
              )}

              {/* 음성 파일 링크 */}
              {result.audio_url && (
                <div style={{ marginTop: '1rem' }}>
                  <strong style={{ color: '#FFD700' }}>음성 녹음:</strong>
                  <div style={{ marginTop: '0.3rem' }}>
                    <audio 
                      controls 
                      style={{ width: '100%', maxWidth: '300px' }}
                      preload="none"
                    >
                      <source src={result.audio_url} type="audio/wav" />
                      브라우저가 오디오를 지원하지 않습니다.
                    </audio>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
