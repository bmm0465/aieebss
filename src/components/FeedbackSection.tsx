'use client';

import { useState } from 'react';

interface FeedbackData {
  feedback: string;
  tip: string;
  strengths?: string[];
  improvements?: string[];
  nextSteps?: string[];
}

interface FeedbackSectionProps {
  testType: string;
  sessionId: string;
  hasResults: boolean;
}

// 평가 타입별 제목 매핑
const getTestTypeTitle = (testType: string): string => {
  const testTitles: Record<string, string> = {
    'p1_alphabet': '1교시: 알파벳 대소문자를 소리 내어 읽기',
    'p2_segmental_phoneme': '2교시: 단어를 듣고 올바른 단어 고르기',
    'p3_suprasegmental_phoneme': '3교시: 단어를 듣고 올바른 강세 고르기',
    'p4_phonics': '4교시: 무의미 단어, 단어, 문장을 소리 내어 읽기',
    'p5_vocabulary': '5교시: 단어, 어구, 문장을 듣거나 읽고 올바른 그림 고르기',
    'p6_comprehension': '6교시: 대화를 듣거나 읽고, 질문에 대한 올바른 그림 고르기'
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
          {/* 종합 피드백 */}
          <div style={{
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: '10px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ color: '#2196F3', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
              🤖 종합 평가 피드백
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#ccc', fontSize: '0.9rem' }}>전체 평가</p>
              <p style={{ margin: 0, color: '#fff', fontSize: '1.1rem', lineHeight: '1.5' }}>
                {feedback.feedback}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 0.5rem 0', color: '#ccc', fontSize: '0.9rem' }}>핵심 학습 팁</p>
              <p style={{ margin: 0, color: '#4CAF50', fontSize: '1.1rem', lineHeight: '1.5' }}>
                {feedback.tip}
              </p>
            </div>
          </div>

          {/* 강점 분석 */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              border: '1px solid rgba(40, 167, 69, 0.3)',
              borderRadius: '10px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: '#28a745', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                💪 잘한 점
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fff' }}>
                {feedback.strengths.map((strength, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem', lineHeight: '1.4' }}>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 개선점 분석 */}
          {feedback.improvements && feedback.improvements.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '10px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: '#ffc107', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                🎯 개선할 점
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fff' }}>
                {feedback.improvements.map((improvement, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem', lineHeight: '1.4' }}>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 다음 단계 */}
          {feedback.nextSteps && feedback.nextSteps.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(156, 39, 176, 0.1)',
              border: '1px solid rgba(156, 39, 176, 0.3)',
              borderRadius: '10px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: '#9C27B0', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                🚀 다음 학습 단계
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fff' }}>
                {feedback.nextSteps.map((step, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem', lineHeight: '1.4' }}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
