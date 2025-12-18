'use client';

import { useState } from 'react';
import type { HattieFeedbackResponse } from '@/lib/feedback/feedbackTypes';

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
  const [feedback, setFeedback] = useState<HattieFeedbackResponse | null>(null);
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
          {/* Feed Up: 목표는 무엇인가? */}
          <div style={{
            backgroundColor: 'rgba(33, 150, 243, 0.15)',
            border: '2px solid rgba(33, 150, 243, 0.4)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              color: '#2196F3', 
              marginBottom: '1rem', 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '1.3rem',
              fontWeight: '600'
            }}>
              🎯 목표는 무엇인가? (Feed Up)
            </h3>
            <p style={{ margin: 0, color: '#fff', fontSize: '1.1rem', lineHeight: '1.6' }}>
              {feedback.feedUp}
            </p>
          </div>

          {/* Feed Back: 현재 어떤 상태인가? */}
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              color: '#FFD700', 
              marginBottom: '1.5rem', 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '1.3rem',
              fontWeight: '600'
            }}>
              📊 현재 어떤 상태인가? (Feed Back)
            </h3>

            {/* Task Level */}
            {feedback.feedBack.taskLevel.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h4 style={{ color: '#3b82f6', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
                  ✓ 과제 수준 (Task Level)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fff' }}>
                  {feedback.feedBack.taskLevel.map((item, index) => (
                    <li key={index} style={{ marginBottom: '0.5rem', lineHeight: '1.5' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Process Level - 가장 중요 */}
            {feedback.feedBack.processLevel.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h4 style={{ 
                  color: '#10b981', 
                  marginBottom: '0.75rem', 
                  fontSize: '1rem', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  🔍 과정 수준 (Process Level) - 가장 중요!
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fff' }}>
                  {feedback.feedBack.processLevel.map((item, index) => (
                    <li key={index} style={{ marginBottom: '0.5rem', lineHeight: '1.5', fontWeight: '500' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Self-Regulation Level */}
            {feedback.feedBack.selfRegulation.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h4 style={{ color: '#8b5cf6', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
                  💪 자기조절 수준 (Self-Regulation Level)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fff' }}>
                  {feedback.feedBack.selfRegulation.map((item, index) => (
                    <li key={index} style={{ marginBottom: '0.5rem', lineHeight: '1.5' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Feed Forward: 다음 단계는 어디인가? */}
          {feedback.feedForward.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(156, 39, 176, 0.15)',
              border: '2px solid rgba(156, 39, 176, 0.4)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ 
                color: '#9C27B0', 
                marginBottom: '1rem', 
                display: 'flex', 
                alignItems: 'center',
                fontSize: '1.3rem',
                fontWeight: '600'
              }}>
                🚀 다음 단계는 어디인가? (Feed Forward)
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fff' }}>
                {feedback.feedForward.map((step, index) => (
                  <li key={index} style={{ marginBottom: '0.75rem', lineHeight: '1.6', fontSize: '1.05rem' }}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 오류 패턴 (있는 경우) */}
          {feedback.errorPatterns && feedback.errorPatterns.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                ⚠️ 발견된 오류 패턴
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#fff' }}>
                {feedback.errorPatterns.map((pattern, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem', lineHeight: '1.4' }}>
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 강점 (있는 경우) */}
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
