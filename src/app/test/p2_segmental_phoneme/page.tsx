'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

interface MinimalPair {
  word1: string;
  word2: string;
  correctAnswer: string;
}

// [폴백] PSF 최소대립쌍 고정 문항
const getFixedMinimalPairs = (): MinimalPair[] => {
  const fixedPairs: MinimalPair[] = [
    { word1: 'pin', word2: 'fin', correctAnswer: 'pin' },
    { word1: 'bat', word2: 'pat', correctAnswer: 'bat' },
    { word1: 'cat', word2: 'hat', correctAnswer: 'cat' },
    { word1: 'dog', word2: 'log', correctAnswer: 'dog' },
    { word1: 'sun', word2: 'fun', correctAnswer: 'sun' },
    { word1: 'bed', word2: 'red', correctAnswer: 'bed' },
    { word1: 'cup', word2: 'pup', correctAnswer: 'cup' },
    { word1: 'map', word2: 'cap', correctAnswer: 'map' },
    { word1: 'sit', word2: 'hit', correctAnswer: 'sit' },
    { word1: 'pen', word2: 'hen', correctAnswer: 'pen' },
    { word1: 'big', word2: 'pig', correctAnswer: 'big' },
    { word1: 'top', word2: 'pop', correctAnswer: 'top' },
    { word1: 'run', word2: 'sun', correctAnswer: 'run' },
    { word1: 'leg', word2: 'peg', correctAnswer: 'leg' },
    { word1: 'mug', word2: 'bug', correctAnswer: 'mug' },
    { word1: 'fan', word2: 'van', correctAnswer: 'fan' },
    { word1: 'ten', word2: 'pen', correctAnswer: 'ten' },
    { word1: 'box', word2: 'fox', correctAnswer: 'box' },
    { word1: 'six', word2: 'fix', correctAnswer: 'six' },
    { word1: 'web', word2: 'deb', correctAnswer: 'web' },
  ];
  return fixedPairs;
};

export default function PsfTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [pairs, setPairs] = useState<MinimalPair[]>([]);
  const [pairIndex, setPairIndex] = useState(0);
  const [currentPair, setCurrentPair] = useState<MinimalPair | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);

      // DB에서 승인된 문항 조회 시도
      try {
        const gradeLevel = await getUserGradeLevel(user.id);
        const dbItems = await fetchApprovedTestItems('p2_segmental_phoneme', gradeLevel || undefined);

        if (dbItems && Array.isArray(dbItems.items)) {
          // DB에서 가져온 문항 사용
          console.log('[p2_segmental_phoneme] DB에서 승인된 문항 사용:', dbItems.items.length, '개');
          setPairs(dbItems.items as MinimalPair[]);
        } else {
          // 폴백: 고정 문항 사용
          console.log('[p2_segmental_phoneme] 승인된 문항이 없어 기본 문항 사용');
          setPairs(getFixedMinimalPairs());
        }
      } catch (error) {
        console.error('[p2_segmental_phoneme] 문항 로딩 오류, 기본 문항 사용:', error);
        setPairs(getFixedMinimalPairs());
      }
    };
    setup();
  }, [router, supabase.auth]);

  const playWordAudio = useCallback(async (word: string) => {
    setIsAudioLoading(true);
    try {
      // 사전 생성된 오디오 파일 사용 시도
      const audioPath = `/audio/psf/${word}.mp3`;
      const audio = new Audio(audioPath);
      
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          resolve();
        };
        audio.onerror = () => {
          // 파일이 없으면 TTS API 사용 (폴백)
          fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: word }),
          })
            .then(response => {
              if (!response.ok) throw new Error('음성 생성 실패');
              return response.blob();
            })
            .then(audioBlob => {
              const audioUrl = URL.createObjectURL(audioBlob);
              const fallbackAudio = new Audio(audioUrl);
              return new Promise<void>((resolveFallback, rejectFallback) => {
                fallbackAudio.onended = () => {
                  URL.revokeObjectURL(audioUrl);
                  resolveFallback();
                };
                fallbackAudio.onerror = rejectFallback;
                fallbackAudio.play();
              });
            })
            .then(() => resolve())
            .catch(reject);
        };
        audio.play();
      });
    } catch (error) {
      console.error('오디오 재생 에러:', error);
      setFeedback('소리를 재생하는 데 문제가 생겼어요.');
    } finally {
      setIsAudioLoading(false);
    }
  }, []);

  const playCorrectAnswer = useCallback(async () => {
    if (!currentPair) return;
    setFeedback('정답 단어를 들어보세요...');
    setIsAudioLoading(true);
    
    // 정답 단어만 재생
    await playWordAudio(currentPair.correctAnswer);
    
    setFeedback('들어본 단어를 선택해주세요.');
    setIsAudioLoading(false);
  }, [currentPair, playWordAudio]);

  const handleAnswerSelect = async (answer: string) => {
    if (isSubmitting || !currentPair || !user) return;
    
    setSelectedAnswer(answer);
    setIsSubmitting(true);
    setFeedback('제출 중...');

    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        setFeedback('인증이 필요합니다.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/submit-p2_segmental_phoneme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `${currentPair.word1}|${currentPair.word2}`,
          selectedAnswer: answer,
          correctAnswer: currentPair.correctAnswer,
          userId: user.id,
          authToken: authUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[p2_segmental_phoneme] 제출 실패:', response.status, errorData);
        throw new Error(errorData.error || '제출 실패');
      }

      const result = await response.json();
      console.log('[p2_segmental_phoneme] 제출 성공:', result);
      setFeedback('좋아요! 다음 문제예요.');
      
      setTimeout(() => {
        goToNextPair();
      }, 500);
    } catch (error) {
      console.error('[p2_segmental_phoneme] 제출 오류:', error);
      setFeedback(`제출 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setIsSubmitting(false);
    }
  };

  const goToNextPair = () => {
    const nextIndex = pairIndex + 1;
    if (nextIndex >= pairs.length) {
      setPhase('finished');
    } else {
      setPairIndex(nextIndex);
      setCurrentPair(pairs[nextIndex]);
      setSelectedAnswer(null);
      setIsSubmitting(false);
      setFeedback('');
    }
  };

  useEffect(() => {
    if (phase === 'testing' && pairs.length > 0 && pairIndex < pairs.length) {
      setCurrentPair(pairs[pairIndex]);
    }
  }, [phase, pairs, pairIndex]);

  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0 || isSubmitting) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [phase, timeLeft, isSubmitting]);

  useEffect(() => {
    if (timeLeft <= 0 && phase === 'testing') {
      setPhase('finished');
    }
  }, [timeLeft, phase]);

  useEffect(() => {
    if (timeLeft <= 10 && timeLeft > 0 && phase === 'testing') {
      setFeedback(`${timeLeft}초 후 종료됩니다.`);
    } else if (timeLeft <= 0 && phase === 'testing') {
      setFeedback('');
    }
  }, [timeLeft, phase]);

  const handleStartTest = () => {
    setPhase('testing');
    setPairIndex(0);
    setTimeLeft(60);
    setCurrentPair(pairs[0]);
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    padding: '2rem',
    color: '#171717',
    fontFamily: 'sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };
  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    padding: '3rem',
    borderRadius: '15px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  };
  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    fontFamily: 'var(--font-nanum-pen)',
    fontSize: '2.8rem',
    marginBottom: '2rem',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 'bold',
  };
  const paragraphStyle: React.CSSProperties = {
    fontSize: '1.05rem',
    lineHeight: 1.8,
    color: '#4b5563',
    marginBottom: '2.5rem',
  };
  const buttonStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '300px',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1.1rem',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
  };
  const wordButtonStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '250px',
    padding: '20px 24px',
    margin: '0.5rem',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1.5rem',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
  };
  const selectedWordButtonStyle: React.CSSProperties = {
    ...wordButtonStyle,
    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
  };
  const feedbackStyle: React.CSSProperties = {
    minHeight: '2.5em',
    fontSize: '1.05rem',
    color: '#1f2937',
    padding: '0 1rem',
    fontWeight: '500',
  };
  const timerStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    color: '#6366f1',
    marginBottom: '1rem',
    fontFamily: 'monospace',
    fontWeight: '600',
  };

  if (!user) {
    return (
      <div style={pageStyle}>
        <h2 style={{ color: '#171717' }}>사용자 정보를 불러오는 중...</h2>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>2교시: 소리의 원소 분리 시험</h1>}

        {phase === 'testing' && (
          <div>
            <div style={timerStyle}>
              남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초
              {isSubmitting && <span style={{ marginLeft: '1rem', color: '#ccc' }}>(일시정지)</span>}
            </div>
          </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>
              단어를 들려드립니다. 들려준 단어를 선택해주세요.
              <br />
              (예: &quot;pin&quot;을 들려주면, &quot;pin&quot;을 선택합니다)
            </p>
            <button onClick={handleStartTest} style={buttonStyle}>
              시험 시작하기
            </button>
          </div>
        )}

        {phase === 'testing' && currentPair && (
          <div>
            <button
              onClick={playCorrectAnswer}
              style={{
                ...buttonStyle,
                fontSize: '3rem',
                minHeight: '100px',
                marginBottom: '2rem',
                opacity: isAudioLoading ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
              disabled={isAudioLoading || isSubmitting}
            >
              {isAudioLoading ? '재생 중...' : '🔊 단어 듣기'}
            </button>
            <p style={feedbackStyle}>{feedback || '단어를 듣고 선택해주세요.'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '2rem' }}>
              <button
                onClick={() => handleAnswerSelect(currentPair.word1)}
                style={selectedAnswer === currentPair.word1 ? selectedWordButtonStyle : wordButtonStyle}
                disabled={isSubmitting || isAudioLoading}
              >
                {currentPair.word1}
              </button>
              <button
                onClick={() => handleAnswerSelect(currentPair.word2)}
                style={selectedAnswer === currentPair.word2 ? selectedWordButtonStyle : wordButtonStyle}
                disabled={isSubmitting || isAudioLoading}
              >
                {currentPair.word2}
              </button>
            </div>
          </div>
        )}

        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>시험 종료!</h1>
            <p style={paragraphStyle}>
              {feedback || "2교시 '소리의 원소 분리 시험'이 끝났습니다. 수고 많으셨습니다!"}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <button style={{ ...buttonStyle, maxWidth: '250px' }} onClick={() => router.push('/test/p4_phonics')}>
                다음 시험으로 이동
              </button>
              <button
                style={{
                  ...buttonStyle,
                  maxWidth: '200px',
                  backgroundColor: 'rgba(108, 117, 125, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                }}
                onClick={() => router.push('/lobby')}
              >
                🏠 홈으로 가기
              </button>
            </div>
          </div>
        )}

        {phase === 'testing' && (
          <div style={{ marginTop: '2rem' }}>
            <button
              style={{
                backgroundColor: 'rgba(108, 117, 125, 0.5)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.7rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
              onClick={() => router.push('/lobby')}
            >
              🏠 홈으로 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
