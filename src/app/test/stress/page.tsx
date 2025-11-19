'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

interface StressItem {
  word: string;
  choices: string[];
  correctAnswer: string;
}

// 단어의 음절 수를 계산하는 함수 (간단한 영어 음절 규칙)
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// 단어를 음절로 분리하는 함수
function splitIntoSyllables(word: string, totalSyllables: number): string[] {
  const syllables = [];
  let currentSyllable = '';
  
  // 간단한 음절 분리 (자음+모음 패턴)
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const isVowel = /[aeiouAEIOU]/.test(char);
    
    if (isVowel && currentSyllable.length > 0 && !/[aeiouAEIOU]/.test(currentSyllable[currentSyllable.length - 1])) {
      syllables.push(currentSyllable);
      currentSyllable = char;
    } else {
      currentSyllable += char;
    }
  }
  if (currentSyllable) {
    syllables.push(currentSyllable);
  }
  
  // 음절 수가 맞지 않으면 간단하게 분할
  if (syllables.length !== totalSyllables) {
    syllables.length = 0;
    const approxSyllables = countSyllables(word);
    const charsPerSyllable = Math.ceil(word.length / approxSyllables);
    for (let i = 0; i < word.length; i += charsPerSyllable) {
      syllables.push(word.slice(i, i + charsPerSyllable));
    }
  }
  
  return syllables;
}

// 선택지에서 강세 위치 추출
function getStressPosition(choice: string): number {
  const match = choice.match(/[A-Z]+/);
  if (!match) return 1;
  
  const stressedPart = match[0];
  const beforeStressed = choice.substring(0, choice.indexOf(stressedPart));
  const syllablesBefore = countSyllables(beforeStressed);
  return syllablesBefore + 1;
}

// [폴백] STRESS 고정 문항
const getFixedStressItems = (): StressItem[] => {
  return [
    { word: 'computer', choices: ['comPUter', 'COMputer', 'compuTER'], correctAnswer: 'comPUter' },
    { word: 'banana', choices: ['baNAna', 'BAnana', 'bananA'], correctAnswer: 'baNAna' },
    { word: 'elephant', choices: ['ELEphant', 'elePHANT', 'elephANT'], correctAnswer: 'ELEphant' },
    { word: 'tomorrow', choices: ['toMORrow', 'TOmorrow', 'tomorROW'], correctAnswer: 'toMORrow' },
    { word: 'beautiful', choices: ['BEAUtiful', 'beauTIful', 'beautiFUL'], correctAnswer: 'BEAUtiful' },
  ];
};

export default function StressTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [items, setItems] = useState<StressItem[]>([]);
  const [itemIndex, setItemIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState<StressItem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedStressPosition, setSelectedStressPosition] = useState<number | null>(null);
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

      try {
        const gradeLevel = await getUserGradeLevel(user.id);
        const dbItems = await fetchApprovedTestItems('STRESS', gradeLevel || undefined);

        if (dbItems && Array.isArray(dbItems.items)) {
          console.log('[STRESS] DB에서 승인된 문항 사용:', dbItems.items.length, '개');
          setItems(dbItems.items as StressItem[]);
        } else {
          console.log('[STRESS] 승인된 문항이 없어 기본 문항 사용');
          setItems(getFixedStressItems());
        }
      } catch (error) {
        console.error('[STRESS] 문항 로딩 오류, 기본 문항 사용:', error);
        setItems(getFixedStressItems());
      }
    };
    setup();
  }, [router, supabase.auth]);

  const playWordAudio = useCallback(async (word: string) => {
    setIsAudioLoading(true);
    try {
      // 사전 생성된 오디오 파일 사용 시도
      const audioPath = `/audio/stress/${word.toLowerCase()}.mp3`;
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

  // 음절 클릭 핸들러
  const handleSyllableClick = (position: number) => {
    if (isSubmitting || !currentItem || !user) return;
    
    setSelectedStressPosition(position);
    
    // 선택된 위치에 해당하는 선택지 찾기
    const matchingChoice = currentItem.choices.find(choice => {
      const stressPos = getStressPosition(choice);
      return stressPos === position;
    });
    
    if (matchingChoice) {
      setSelectedAnswer(matchingChoice);
    }
  };

  // 제출 핸들러
  const handleSubmit = async () => {
    if (isSubmitting || !currentItem || !user || !selectedAnswer) return;
    
    setIsSubmitting(true);
    setFeedback('제출 중...');

    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        setFeedback('인증이 필요합니다.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/submit-stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentItem.word,
          selectedAnswer: selectedAnswer,
          correctAnswer: currentItem.correctAnswer,
          choices: currentItem.choices,
          userId: user.id,
          authToken: authUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('제출 실패');
      }

      setFeedback('좋아요! 다음 문제예요.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('STRESS 제출 오류:', error);
      setFeedback('제출 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  const goToNextItem = () => {
    const nextIndex = itemIndex + 1;
    if (nextIndex >= items.length) {
      setPhase('finished');
    } else {
      setItemIndex(nextIndex);
      setCurrentItem(items[nextIndex]);
      setSelectedAnswer(null);
      setSelectedStressPosition(null);
      setIsSubmitting(false);
      setFeedback('');
    }
  };

  useEffect(() => {
    if (phase === 'testing' && items.length > 0 && itemIndex < items.length) {
      setCurrentItem(items[itemIndex]);
    }
  }, [phase, items, itemIndex]);

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
    if (timeLeft === 10 && phase === 'testing') {
      setFeedback('⏰ 10초 후 자동으로 제출됩니다. 서둘러 주세요!');
    } else if (timeLeft <= 1 && phase === 'testing') {
      setFeedback('');
    }
  }, [timeLeft, phase]);

  const handleStartTest = () => {
    setPhase('testing');
    setItemIndex(0);
    setTimeLeft(60);
    setCurrentItem(items[0]);
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
        {phase !== 'finished' && <h1 style={titleStyle}>4교시: 마법 리듬 패턴 시험</h1>}

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
              단어를 듣고 강세가 있는 위치를 클릭해주세요.
              <br />
              (예: &quot;computer&quot;를 들려주면, 강세가 있는 음절을 클릭합니다)
            </p>
            <button onClick={handleStartTest} style={buttonStyle}>
              시험 시작하기
            </button>
          </div>
        )}

        {phase === 'testing' && currentItem && (() => {
          const totalSyllables = countSyllables(currentItem.word);
          const correctStressPosition = getStressPosition(currentItem.correctAnswer);
          
          return (
            <div>
              <button
                onClick={() => playWordAudio(currentItem.word)}
                style={{
                  ...buttonStyle,
                  fontSize: '3rem',
                  minHeight: '100px',
                  marginBottom: '2rem',
                  opacity: isAudioLoading ? 0.5 : 1,
                }}
                disabled={isAudioLoading || isSubmitting}
              >
                {isAudioLoading ? '재생 중...' : '🔊 단어 듣기'}
              </button>
              <p style={feedbackStyle}>{feedback || '강세가 있는 위치를 클릭해주세요.'}</p>
              
              {/* 단어 표시 */}
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                margin: '2rem 0',
                color: '#6366f1',
                textAlign: 'center',
              }}>
                {currentItem.word}
              </div>
              
              {/* 클릭 가능한 강세 패턴 표시 (O O O) */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                margin: '2rem 0',
                flexWrap: 'wrap',
              }}>
                {Array.from({ length: totalSyllables }, (_, index) => {
                  const position = index + 1;
                  const isSelected = selectedStressPosition === position;
                  const isCorrect = position === correctStressPosition;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => handleSyllableClick(position)}
                      style={{
                        cursor: isSubmitting || isAudioLoading ? 'not-allowed' : 'pointer',
                        width: '4rem',
                        height: '4rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: isSelected ? '#ffffff' : '#6366f1',
                        backgroundColor: isSelected 
                          ? (isCorrect ? '#10b981' : '#ef4444')
                          : 'transparent',
                        border: `3px solid ${isSelected 
                          ? (isCorrect ? '#10b981' : '#ef4444')
                          : '#6366f1'}`,
                        transition: 'all 0.2s ease',
                        opacity: isSubmitting || isAudioLoading ? 0.5 : 1,
                        userSelect: 'none',
                        boxShadow: isSelected 
                          ? '0 4px 12px rgba(99, 102, 241, 0.3)'
                          : 'none',
                      }}
                    >
                      {isSelected ? '●' : '○'}
                    </div>
                  );
                })}
              </div>
              
              {/* 제출 버튼 */}
              {selectedAnswer && (
                <button
                  onClick={handleSubmit}
                  style={{
                    ...buttonStyle,
                    maxWidth: '300px',
                    marginTop: '2rem',
                    backgroundColor: selectedAnswer === currentItem.correctAnswer 
                      ? '#10b981' 
                      : '#6366f1',
                  }}
                  disabled={isSubmitting || isAudioLoading}
                >
                  {isSubmitting ? '제출 중...' : '제출하기'}
                </button>
              )}
            </div>
          );
        })()}

        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>시험 종료!</h1>
            <p style={paragraphStyle}>
              {feedback || "4교시 '마법 리듬 패턴 시험'이 끝났습니다. 수고 많으셨습니다!"}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <button
                style={{ ...buttonStyle, maxWidth: '250px' }}
                onClick={() => router.push('/test/meaning')}
              >
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

