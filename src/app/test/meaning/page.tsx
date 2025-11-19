'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

interface MeaningItem {
  wordOrPhrase: string;
  imageOptions: string[];
  correctAnswer: string;
}

// [폴백] MEANING 고정 문항
const getFixedMeaningItems = (): MeaningItem[] => {
  return [
    {
      wordOrPhrase: 'a red apple',
      imageOptions: ['red apple', 'yellow banana', 'green grape'],
      correctAnswer: 'red apple',
    },
    {
      wordOrPhrase: 'a big dog',
      imageOptions: ['big dog', 'small cat', 'blue bird'],
      correctAnswer: 'big dog',
    },
    {
      wordOrPhrase: 'three cats',
      imageOptions: ['three cats', 'two dogs', 'one bird'],
      correctAnswer: 'three cats',
    },
    {
      wordOrPhrase: 'a blue ball',
      imageOptions: ['blue ball', 'red car', 'yellow sun'],
      correctAnswer: 'blue ball',
    },
    {
      wordOrPhrase: 'I like pizza',
      imageOptions: ['pizza', 'apple', 'book'],
      correctAnswer: 'pizza',
    },
  ];
};

export default function MeaningTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [items, setItems] = useState<MeaningItem[]>([]);
  const [itemIndex, setItemIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState<MeaningItem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showText, setShowText] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

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
        const dbItems = await fetchApprovedTestItems('MEANING', gradeLevel || undefined);

        if (dbItems && Array.isArray(dbItems.items)) {
          console.log('[MEANING] DB에서 승인된 문항 사용:', dbItems.items.length, '개');
          setItems(dbItems.items as MeaningItem[]);
        } else {
          console.log('[MEANING] 승인된 문항이 없어 기본 문항 사용');
          setItems(getFixedMeaningItems());
        }
      } catch (error) {
        console.error('[MEANING] 문항 로딩 오류, 기본 문항 사용:', error);
        setItems(getFixedMeaningItems());
      }
    };
    setup();
  }, [router, supabase.auth]);

  const playPhraseAudio = useCallback(async (phrase: string) => {
    setIsAudioLoading(true);
    try {
      // 사전 생성된 오디오 파일 사용 시도
      const safeFileName = phrase.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const audioPath = `/audio/meaning/${safeFileName}.mp3`;
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
            body: JSON.stringify({ text: phrase }),
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

  const handleAnswerSelect = async (answer: string) => {
    if (isSubmitting || !currentItem || !user) return;
    
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

      const response = await fetch('/api/submit-meaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentItem.wordOrPhrase,
          selectedAnswer: answer,
          correctAnswer: currentItem.correctAnswer,
          options: currentItem.imageOptions,
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
      console.error('MEANING 제출 오류:', error);
      setFeedback('제출 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  const loadImagesForItem = useCallback(async (item: MeaningItem) => {
    setIsLoadingImages(true);
    const newImageUrls: Record<string, string> = {};
    
    try {
      // 모든 선택지에 대한 이미지 생성/로드
      for (const option of item.imageOptions) {
        if (!imageUrls[option]) {
          try {
            const response = await fetch('/api/generate-meaning-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phrase: option }),
            });
            
            if (response.ok) {
              const data = await response.json();
              // API 응답에서 error 필드 확인
              if (data.error) {
                console.error(`이미지 생성 API 에러 (${option}):`, data.error);
                // 에러가 있어도 계속 진행 (텍스트로 폴백)
              } else if (data.imageUrl) {
                newImageUrls[option] = data.imageUrl;
              }
            } else {
              // response.json()은 한 번만 호출 가능하므로, text로 읽어서 파싱
              const errorText = await response.text().catch(() => '');
              let errorData = {};
              try {
                errorData = errorText ? JSON.parse(errorText) : {};
              } catch {
                // JSON 파싱 실패 시 빈 객체 사용
              }
              console.error(`이미지 생성 실패 (${option}):`, response.status, errorData);
            }
          } catch (error) {
            console.error(`이미지 생성 실패 (${option}):`, error);
            // 네트워크 오류 등 - 계속 진행 (텍스트로 폴백)
          }
        } else {
          newImageUrls[option] = imageUrls[option];
        }
      }
      
      setImageUrls(prev => ({ ...prev, ...newImageUrls }));
    } catch (error) {
      console.error('이미지 로드 오류:', error);
    } finally {
      setIsLoadingImages(false);
    }
  }, [imageUrls]);

  const goToNextItem = () => {
    const nextIndex = itemIndex + 1;
    if (nextIndex >= items.length) {
      setPhase('finished');
    } else {
      setItemIndex(nextIndex);
      setCurrentItem(items[nextIndex]);
      setSelectedAnswer(null);
      setIsSubmitting(false);
      setFeedback('');
      setShowText(false);
    }
  };

  useEffect(() => {
    if (phase === 'testing' && items.length > 0 && itemIndex < items.length) {
      const item = items[itemIndex];
      setCurrentItem(item);
      if (item) {
        loadImagesForItem(item);
      }
    }
  }, [phase, items, itemIndex, loadImagesForItem]);

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
  const choiceButtonStyle: React.CSSProperties = {
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
    fontSize: '1.2rem',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
  };
  const selectedChoiceButtonStyle: React.CSSProperties = {
    ...choiceButtonStyle,
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
  const phraseDisplayStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: '2rem 0',
    color: '#6366f1',
    minHeight: '80px',
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
        {phase !== 'finished' && <h1 style={titleStyle}>5교시: 마법서 그림 해석 시험</h1>}

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
              단어나 문장을 듣거나 읽고, 알맞은 그림을 선택해주세요.
              <br />
              (예: &quot;a red apple&quot;을 들려주거나 보여주면, 빨간 사과 그림을 선택합니다)
            </p>
            <button onClick={handleStartTest} style={buttonStyle}>
              시험 시작하기
            </button>
          </div>
        )}

        {phase === 'testing' && currentItem && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <button
                onClick={() => playPhraseAudio(currentItem.wordOrPhrase)}
                style={{
                  ...buttonStyle,
                  fontSize: '2rem',
                  minHeight: '80px',
                  marginBottom: '1rem',
                  opacity: isAudioLoading ? 0.5 : 1,
                }}
                disabled={isAudioLoading || isSubmitting}
              >
                {isAudioLoading ? '재생 중...' : '🔊 듣기'}
              </button>
              <button
                onClick={() => setShowText(!showText)}
                style={{
                  ...buttonStyle,
                  maxWidth: '200px',
                  fontSize: '1rem',
                  background: showText
                    ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                {showText ? '텍스트 숨기기' : '텍스트 보기'}
              </button>
            </div>
            {showText && <div style={phraseDisplayStyle}>{currentItem.wordOrPhrase}</div>}
            <p style={feedbackStyle}>{feedback || '알맞은 그림을 선택해주세요.'}</p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center',
                marginTop: '2rem',
              }}
            >
              {currentItem.imageOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  style={{
                    ...(selectedAnswer === option ? selectedChoiceButtonStyle : choiceButtonStyle),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minHeight: '200px',
                  }}
                  disabled={isSubmitting || isAudioLoading || isLoadingImages}
                >
                  {imageUrls[option] && !failedImages.has(option) ? (
                    <>
                      <div style={{ position: 'relative', width: '150px', height: '150px' }}>
                        <Image 
                          src={imageUrls[option]} 
                          alt={option}
                          width={150}
                          height={150}
                          style={{
                            objectFit: 'contain',
                            borderRadius: '8px',
                          }}
                          onError={() => {
                            // 이미지 로드 실패 시 실패 목록에 추가
                            setFailedImages(prev => new Set(prev).add(option));
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{option}</div>
                    </>
                  ) : (
                    <div style={{ 
                      fontSize: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '150px',
                    }}>
                      {isLoadingImages ? (
                        <>
                          <div style={{ marginBottom: '0.5rem' }}>이미지 생성 중...</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{option}</div>
                        </>
                      ) : (
                        option
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>시험 종료!</h1>
            <p style={paragraphStyle}>
              {feedback || "5교시 '마법서 그림 해석 시험'이 끝났습니다. 수고 많으셨습니다!"}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <button
                style={{ ...buttonStyle, maxWidth: '250px' }}
                onClick={() => router.push('/test/comprehension')}
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

