'use client';

import { useState } from 'react';

interface FeedbackData {
  testType: string;
  analysis: {
    total: number;
    correct: number;
    accuracy: number;
    incorrectAnswers: Array<{
      question: string;
      studentAnswer: string;
      isCorrect: boolean;
    }>;
    errorPatterns: {
      similarShapes: Array<{ question: string; studentAnswer: string }>;
      caseConfusion: Array<{ question: string; studentAnswer: string }>;
      uncommonLetters: Array<{ question: string; studentAnswer: string }>;
      other: Array<{ question: string; studentAnswer: string }>;
    };
  };
  feedback: {
    feedUp: string;
    feedBack: string;
    feedForward: string;
  };
}

interface FeedbackSectionProps {
  testType: string;
  sessionId: string;
  hasResults: boolean;
}

// 테스트 타입별 제목 매핑
const getTestTypeTitle = (testType: string): string => {
  const testTitles: Record<string, string> = {
    'LNF': '1교시 고대 룬 문자 해독',
    'PSF': '2교시 소리의 원소 분리',
    'NWF': '3교시 초급 주문 시전',
    'WRF': '4교시 마법 단어 활성화',
    'ORF': '5교시 고대 이야기 소생술',
    'MAZE': '6교시 지혜의 미로 탈출'
  };
  return testTitles[testType] || testType;
};

export default function FeedbackSection({ testType, sessionId, hasResults }: FeedbackSectionProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateFeedback = async () => {
    if (!hasResults) {
      setError('해당 테스트의 결과가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('피드백 생성 요청:', { testType, sessionId });
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType,
          sessionId
        }),
      });

      console.log('API 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API 오류 응답:', errorData);
        throw new Error(errorData.error || '피드백 생성에 실패했습니다.');
      }

      const data = await response.json();
      console.log('피드백 생성 성공:', data);
      setFeedback(data);
    } catch (err) {
      console.error('피드백 생성 에러:', err);
      setError(err instanceof Error ? err.message : '피드백을 생성하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasResults) {
    return (
      <div style={{ 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: '2rem', 
        borderRadius: '15px', 
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>
          🤖 AI 피드백
        </h2>
        <p style={{ color: '#ccc' }}>
          {testType} 테스트 결과가 없어 피드백을 제공할 수 없습니다.
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
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '2rem' }}>
          🤖 AI 개별화 피드백: {getTestTypeTitle(testType)}
        </h2>
        <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
          Hattie의 피드백 개념을 적용한 개인화된 학습 피드백을 받아보세요
        </p>
        
        {!feedback && (
          <button
            onClick={generateFeedback}
            disabled={loading}
            style={{
              backgroundColor: loading ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.2)',
              color: '#FFD700',
              padding: '1rem 2rem',
              borderRadius: '25px',
              border: '2px solid rgba(255,215,0,0.5)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '🔄 피드백 생성 중...' : '✨ 피드백 받기'}
          </button>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          border: '1px solid rgba(220, 53, 69, 0.5)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1rem',
          color: '#ff6b6b'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>⚠️ 오류</p>
          <p style={{ margin: '0.5rem 0 0 0' }}>{error}</p>
        </div>
      )}

      {feedback && (
        <div>
          {/* 결과 요약 */}
          <div style={{
            backgroundColor: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '10px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>📊 평가 결과 요약</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#ccc' }}>총 문제 수</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#FFD700' }}>
                  {feedback.analysis.total}개
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#ccc' }}>정답 수</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                  {feedback.analysis.correct}개
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#ccc' }}>정확도</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#FFD700' }}>
                  {feedback.analysis.accuracy.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* 상세 결과 리포트 */}
          {feedback.analysis.incorrectAnswers.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '10px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: '#dc3545', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                📋 틀린 문제 상세 보기 ({feedback.analysis.incorrectAnswers.length}개)
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {feedback.analysis.incorrectAnswers.map((answer, index) => (
                  <div key={index} style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(220, 53, 69, 0.2)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '0.8rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 0.3rem 0', color: '#ffc107', fontWeight: 'bold' }}>
                        문제: {answer.question}
                      </p>
                      <p style={{ margin: 0, color: '#ccc' }}>
                        학생 답: <span style={{ color: '#dc3545' }}>{answer.studentAnswer}</span>
                      </p>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(220, 53, 69, 0.2)',
                      color: '#dc3545',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '15px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      ❌ 틀림
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hattie의 피드백 */}
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Feed Up */}
            <div style={{
              backgroundColor: 'rgba(0,123,255,0.1)',
              border: '1px solid rgba(0,123,255,0.3)',
              borderRadius: '10px',
              padding: '1.5rem'
            }}>
              <h3 style={{ color: '#007BFF', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                🎯 나는 어디로 가고 있는가? (Feed Up)
              </h3>
              <p style={{ margin: 0, lineHeight: '1.6', color: '#e9ecef' }}>
                {feedback.feedback.feedUp}
              </p>
            </div>

            {/* Feed Back */}
            <div style={{
              backgroundColor: 'rgba(40,167,69,0.1)',
              border: '1px solid rgba(40,167,69,0.3)',
              borderRadius: '10px',
              padding: '1.5rem'
            }}>
              <h3 style={{ color: '#28a745', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                📈 나는 지금 잘하고 있는가? (Feed Back)
              </h3>
              <p style={{ margin: 0, lineHeight: '1.6', color: '#e9ecef' }}>
                {feedback.feedback.feedBack}
              </p>
            </div>

            {/* Feed Forward */}
            <div style={{
              backgroundColor: 'rgba(255,193,7,0.1)',
              border: '1px solid rgba(255,193,7,0.3)',
              borderRadius: '10px',
              padding: '1.5rem'
            }}>
              <h3 style={{ color: '#ffc107', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                🚀 다음에는 무엇을 해야 하는가? (Feed Forward)
              </h3>
              <p style={{ margin: 0, lineHeight: '1.6', color: '#e9ecef' }}>
                {feedback.feedback.feedForward}
              </p>
            </div>
          </div>

          {/* 다시 피드백 받기 버튼 */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              onClick={generateFeedback}
              disabled={loading}
              style={{
                backgroundColor: 'rgba(108,117,125,0.2)',
                color: '#6c757d',
                padding: '0.8rem 1.5rem',
                borderRadius: '20px',
                border: '1px solid rgba(108,117,125,0.3)',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '🔄 재생성 중...' : '🔄 피드백 다시 받기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
