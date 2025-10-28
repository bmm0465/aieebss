'use client'

import React from 'react';

interface TestTypeStats {
  total: number;
  correct: number;
  avgAccuracy: number;
  avgWcpm: number;
  avgTime: number;
  correctRate: number;
  recentResults: any[];
}

interface StudentDetailChartProps {
  testTypeStats: Record<string, TestTypeStats>;
}

export default function StudentDetailChart({ testTypeStats }: StudentDetailChartProps) {
  const testTypes = Object.keys(testTypeStats);
  
  if (testTypes.length === 0) {
    return (
      <div style={{
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '2rem',
        borderRadius: '15px',
        marginBottom: '2rem',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>📊 테스트 유형별 성과</h3>
        <p style={{ opacity: 0.8 }}>아직 평가 데이터가 없습니다.</p>
      </div>
    );
  }

  const getTestTypeName = (testType: string) => {
    const names: Record<string, string> = {
      'LNF': 'Letter Naming Fluency',
      'WRF': 'Word Reading Fluency', 
      'NWF': 'Nonsense Word Fluency',
      'MAZE': 'Maze Comprehension',
      'PSF': 'Phoneme Segmentation Fluency',
      'ORF': 'Oral Reading Fluency'
    };
    return names[testType] || testType;
  };

  const getTestTypeEmoji = (testType: string) => {
    const emojis: Record<string, string> = {
      'LNF': '🔤',
      'WRF': '📖',
      'NWF': '🔀',
      'MAZE': '🧩',
      'PSF': '🔊',
      'ORF': '🗣️'
    };
    return emojis[testType] || '📝';
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return '#4CAF50';
    if (rate >= 60) return '#FF9800';
    return '#F44336';
  };

  return (
    <div style={{
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '2rem',
      borderRadius: '15px',
      marginBottom: '2rem',
      border: '1px solid rgba(255, 215, 0, 0.3)'
    }}>
      <h3 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📊 테스트 유형별 성과</h3>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {testTypes.map((testType) => {
          const stats = testTypeStats[testType];
          return (
            <div 
              key={testType}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '1rem',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{getTestTypeEmoji(testType)}</span>
                <h4 style={{ 
                  margin: 0, 
                  color: '#FFD700',
                  fontSize: '1.2rem'
                }}>
                  {getTestTypeName(testType)} ({testType})
                </h4>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 'bold', 
                    color: '#2196F3' 
                  }}>
                    {stats.total}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>총 평가</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 'bold', 
                    color: getPerformanceColor(stats.correctRate)
                  }}>
                    {stats.correctRate}%
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>정답률</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 'bold', 
                    color: '#4CAF50'
                  }}>
                    {stats.avgAccuracy}%
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>평균 정확도</div>
                </div>

                {stats.avgWcpm > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 'bold', 
                      color: '#FF9800'
                    }}>
                      {stats.avgWcpm}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>평균 WCPM</div>
                  </div>
                )}

                {stats.avgTime > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.8rem', 
                      fontWeight: 'bold', 
                      color: '#9C27B0'
                    }}>
                      {Math.round(stats.avgTime / 1000)}초
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>평균 소요시간</div>
                  </div>
                )}
              </div>

              {/* 최근 결과 미리보기 */}
              {stats.recentResults.length > 0 && (
                <div>
                  <h5 style={{ 
                    color: '#FFD700', 
                    marginBottom: '0.5rem',
                    fontSize: '1rem'
                  }}>
                    최근 결과:
                  </h5>
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    {stats.recentResults.slice(0, 5).map((result, index) => (
                      <span 
                        key={index}
                        style={{
                          backgroundColor: result.is_correct ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
                          color: result.is_correct ? '#4CAF50' : '#F44336',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '15px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          border: `1px solid ${result.is_correct ? '#4CAF50' : '#F44336'}`
                        }}
                      >
                        {result.is_correct ? '✓' : '✗'} {result.accuracy ? `${result.accuracy}%` : 'N/A'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
