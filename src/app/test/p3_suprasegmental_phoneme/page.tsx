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

// 단어의 음절 수를 계산하는 함수
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
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

// [폴백] 3교시 고정 문항: 강세 패턴 선택
const getFixedStressItems = (): StressItem[] => {
  return [
    { word: 'apple', choices: ['APple', 'apPLE', 'APPLE'], correctAnswer: 'APple' },
    { word: 'banana', choices: ['BANana', 'banANa', 'bananA'], correctAnswer: 'banANa' },
    { word: 'brother', choices: ['BROther', 'broTHER', 'BROTHER'], correctAnswer: 'BROther' },
    { word: 'carrot', choices: ['CARrot', 'carROT', 'CARROT'], correctAnswer: 'CARrot' },
    { word: 'chicken', choices: ['CHIcken', 'chiCKEN', 'CHICKEN'], correctAnswer: 'CHIcken' },
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
        // p3_stress_items.json에서 문항 로드 시도 (최우선)
        const response = await fetch('/data/p3_stress_items.json');
        if (response.ok) {
          try {
            const jsonItems = await response.json();
            // JSON 구조 검증
            if (Array.isArray(jsonItems) && jsonItems.length > 0) {
              // 각 항목이 필수 필드를 가지고 있는지 확인
              const validItems = jsonItems.filter((item: unknown): item is StressItem => {
                if (typeof item !== 'object' || item === null) return false;
                const obj = item as Record<string, unknown>;
                return (
                  typeof obj.word === 'string' &&
                  Array.isArray(obj.choices) &&
                  obj.choices.length > 0 &&
                  typeof obj.correctAnswer === 'string'
                );
              });
              
              if (validItems.length > 0) {
                console.log('[p3_suprasegmental_phoneme] ✅ p3_stress_items.json에서 문항 로드:', validItems.length, '개');
                setItems(validItems as StressItem[]);
                return; // JSON 파일 사용 성공, 함수 종료
              } else {
                console.warn('[p3_suprasegmental_phoneme] ⚠️ JSON 파일의 문항이 유효하지 않음');
              }
            } else {
              console.warn('[p3_suprasegmental_phoneme] ⚠️ JSON 파일이 배열이 아니거나 비어있음');
            }
          } catch (parseError) {
            console.error('[p3_suprasegmental_phoneme] ❌ JSON 파싱 오류:', parseError);
          }
        } else {
          console.warn('[p3_suprasegmental_phoneme] ⚠️ p3_stress_items.json 파일을 찾을 수 없음 (404)');
        }
        
        // JSON 파일 로드 실패 시 DB에서 승인된 문항 조회 시도
        const gradeLevel = await getUserGradeLevel(user.id);
        const dbItems = await fetchApprovedTestItems('p3_suprasegmental_phoneme', gradeLevel || undefined);

        if (dbItems && Array.isArray(dbItems.items) && dbItems.items.length > 0) {
          console.log('[p3_suprasegmental_phoneme] ✅ DB에서 승인된 문항 사용:', dbItems.items.length, '개');
          setItems(dbItems.items as StressItem[]);
        } else {
          console.log('[p3_suprasegmental_phoneme] 📝 기본 문항 사용 (폴백)');
          setItems(getFixedStressItems());
        }
      } catch (error) {
        console.error('[p3_suprasegmental_phoneme] ❌ 문항 로딩 오류, 기본 문항 사용:', error);
        setItems(getFixedStressItems());
      }
    };
    setup();
  }, [router, supabase.auth]);

  const playWordAudio = useCallback(async (word: string) => {
    setIsAudioLoading(true);
    try {
      // p2_segmental_phoneme 폴더의 mp3 파일 사용
      const audioPath = `/audio/p2_segmental_phoneme/chunjae-text-ham/${word.toLowerCase()}.mp3`;
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
    } else if (currentItem.choices.length > 0) {
      console.warn(`[p3_suprasegmental_phoneme] position ${position}에 해당하는 선택지를 찾지 못함. 첫 번째 선택지 사용.`);
      setSelectedAnswer(currentItem.choices[0]);
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

      const response = await fetch('/api/submit-p3_suprasegmental_phoneme', {
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
        const errorData = await response.json().catch(() => ({}));
        console.error('[p3_suprasegmental_phoneme] 제출 실패:', response.status, errorData);
        throw new Error(errorData.error || '제출 실패');
      }

      const result = await response.json();
      console.log('[p3_suprasegmental_phoneme] 제출 성공:', result);
      setFeedback('좋아요! 다음 문제예요.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('[p3_suprasegmental_phoneme] 제출 오류:', error);
      setFeedback(`제출 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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

  const handleSkip = async () => {
    if (isSubmitting || !currentItem || !user) return;
    
    setIsSubmitting(true);
    setFeedback('넘어가는 중...');
    
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        setFeedback('인증이 필요합니다.');
        setIsSubmitting(false);
        return;
      }

      // 잘못된 답안으로 저장 (첫 번째 선택지를 선택한 것으로 처리)
      const wrongAnswer = currentItem.choices[0] === currentItem.correctAnswer 
        ? currentItem.choices[1] || currentItem.choices[0]
        : currentItem.choices[0];
      
      const response = await fetch('/api/submit-p3_suprasegmental_phoneme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentItem.word,
          selectedAnswer: wrongAnswer,
          correctAnswer: currentItem.correctAnswer,
          choices: currentItem.choices,
          userId: user.id,
          authToken: authUser.id,
          skip: true, // 넘어가기 플래그
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[p3_suprasegmental_phoneme] 넘어가기 저장 실패:', response.status, errorData);
      }

      setFeedback('다음 문제로 넘어갑니다.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('[p3_suprasegmental_phoneme] 넘어가기 오류:', error);
      setFeedback('오류가 발생했습니다.');
      setIsSubmitting(false);
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
    if (timeLeft <= 10 && timeLeft > 0 && phase === 'testing') {
      setFeedback(`${timeLeft}초 후 종료됩니다.`);
    } else if (timeLeft <= 0 && phase === 'testing') {
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
        {phase !== 'finished' && <h1 style={titleStyle}>3교시: 단어를 듣고 올바른 강세 고르기</h1>}

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
              평가 시작하기
            </button>
          </div>
        )}

        {phase === 'testing' && currentItem && (() => {
          const totalSyllables = countSyllables(currentItem.word);
          
          return (
            <div>
              <button
                onClick={() => playWordAudio(currentItem.word)}
                style={{
                  ...buttonStyle,
                  fontSize: '1.5rem',
                  minHeight: '80px',
                  marginBottom: '2rem',
                  opacity: isAudioLoading ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  color: 'white',
                  fontWeight: '600',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                }}
                disabled={isAudioLoading || isSubmitting}
              >
                {isAudioLoading ? '재생 중...' : '🔊 단어 듣기'}
              </button>
              <p style={feedbackStyle}>{feedback || '강세가 있는 위치를 클릭해주세요.'}</p>
              
              {/* 클릭 가능한 강세 패턴 표시 (O O O) - 단어 위에 배치 */}
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
                        backgroundColor: isSelected ? '#6366f1' : 'transparent',
                        border: `3px solid #6366f1`,
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
              
              {/* 단어 표시 - 음절 아래에 배치 */}
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                margin: '2rem 0',
                color: '#6366f1',
                textAlign: 'center',
              }}>
                {currentItem.word}
              </div>
              
              <div style={{ position: 'relative', width: '100%', marginTop: '2rem' }}>
                {/* 제출 버튼 - selectedStressPosition이 설정되면 표시 */}
                {selectedStressPosition !== null && (
                  <button
                    onClick={handleSubmit}
                    style={{
                      ...buttonStyle,
                      maxWidth: '300px',
                      backgroundColor: selectedAnswer === currentItem.correctAnswer 
                        ? '#10b981' 
                        : '#6366f1',
                    }}
                    disabled={isSubmitting || isAudioLoading || !selectedAnswer}
                  >
                    {isSubmitting ? '제출 중...' : '제출하기'}
                  </button>
                )}
                
                {/* 넘어가기 버튼 - 오른쪽 하단에 고정 */}
                <button
                  onClick={handleSkip}
                  style={{
                    position: 'absolute',
                    bottom: selectedStressPosition !== null ? '-60px' : '0',
                    right: '0',
                    padding: '8px 16px',
                    backgroundColor: '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    opacity: isSubmitting ? 0.6 : 1,
                    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  disabled={isSubmitting || isAudioLoading}
                  onMouseEnter={(e) => {
                    if (!isSubmitting && !isAudioLoading) {
                      e.currentTarget.style.backgroundColor = '#ea580c';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f97316';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {isSubmitting ? '처리 중...' : '⏭️ 넘어가기'}
                </button>
              </div>
            </div>
          );
        })()}

        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>평가 종료!</h1>
            <p style={paragraphStyle}>
              {feedback || "3교시 평가가 끝났습니다. 수고 많으셨습니다!"}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <button
                style={{ ...buttonStyle, maxWidth: '250px' }}
                onClick={() => router.push('/test/p4_phonics')}
              >
                다음 평가로 이동
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

