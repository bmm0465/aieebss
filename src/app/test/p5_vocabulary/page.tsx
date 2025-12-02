'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

interface MeaningItem {
  wordOrPhrase: string;
  imageOptions: string[];
  correctAnswer: string;
}

interface ImageWord {
  word: string;
  file: string;
}

// 사용 가능한 이미지 단어 목록 로드
const loadAvailableWords = async (): Promise<string[]> => {
  try {
    const response = await fetch('/images/vocabulary/chunjae-text-ham/index.json');
    if (!response.ok) {
      console.warn('[p5_vocabulary] index.json 로드 실패, 기본 단어 목록 사용');
      return [];
    }
    const data: ImageWord[] = await response.json();
    return data.map(item => item.word);
  } catch (error) {
    console.error('[p5_vocabulary] index.json 로드 오류:', error);
    return [];
  }
};

// 문구에서 핵심 단어 추출 (이미지 파일명과 매칭)
const extractImageWord = (phrase: string): string => {
  // 소문자로 변환하고 특수문자 제거
  const words = phrase.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !['a', 'an', 'the', 'i', 'like'].includes(w));
  
  // 마지막 단어를 명사로 간주 (일반적으로 형용사 + 명사 형태)
  return words.length > 0 ? words[words.length - 1] : phrase.toLowerCase().replace(/[^a-z]/g, '');
};

// [폴백] MEANING 고정 문항 - 실제 존재하는 이미지만 사용
const getFixedMeaningItems = async (availableWords: string[]): Promise<MeaningItem[]> => {
  if (availableWords.length === 0) {
    // 사용 가능한 단어가 없으면 빈 배열 반환
    return [];
  }

  const items: MeaningItem[] = [];
  
  // 색상 단어 목록
  const colorWords = ['red', 'blue', 'yellow', 'green', 'black', 'white', 'pink', 'orange'];
  // 형용사 단어 목록
  const adjectiveWords = ['big', 'small', 'tall', 'high', 'good', 'nice', 'pretty', 'great', 'fine'];
  
  // 사용 가능한 색상, 형용사, 명사 분류
  const colors = availableWords.filter(w => colorWords.includes(w));
  const adjectives = availableWords.filter(w => adjectiveWords.includes(w));
  // 색상과 형용사가 아닌 단어들을 명사로 간주
  const nouns = availableWords.filter(w => !colors.includes(w) && !adjectives.includes(w));
  
  // 1. 색상 + 명사 조합 (예: "a red apple")
  if (colors.length > 0 && nouns.length >= 3) {
    for (let i = 0; i < Math.min(5, colors.length * 2); i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const wrongNouns = [...nouns].filter(n => n !== noun).sort(() => Math.random() - 0.5).slice(0, 2);
      
      if (wrongNouns.length >= 2) {
        items.push({
          wordOrPhrase: `a ${color} ${noun}`,
          imageOptions: [noun, ...wrongNouns],
          correctAnswer: noun,
        });
      }
    }
  }

  // 2. 형용사 + 명사 조합 (예: "a big dog")
  if (adjectives.length > 0 && nouns.length >= 3) {
    for (let i = 0; i < Math.min(5, adjectives.length * 2); i++) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const wrongNouns = [...nouns].filter(n => n !== noun).sort(() => Math.random() - 0.5).slice(0, 2);
      
      if (wrongNouns.length >= 2) {
        items.push({
          wordOrPhrase: `a ${adj} ${noun}`,
          imageOptions: [noun, ...wrongNouns],
          correctAnswer: noun,
        });
      }
    }
  }

  // 3. 단순 명사 (예: "pizza")
  if (nouns.length >= 3) {
    for (let i = 0; i < Math.min(10, nouns.length); i++) {
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const wrongNouns = [...nouns].filter(n => n !== noun).sort(() => Math.random() - 0.5).slice(0, 2);
      
      if (wrongNouns.length >= 2) {
        items.push({
          wordOrPhrase: noun,
          imageOptions: [noun, ...wrongNouns],
          correctAnswer: noun,
        });
      }
    }
  }

  // 중복 제거 (같은 correctAnswer와 imageOptions 조합)
  const uniqueItems = items.filter((item, index, self) => 
    index === self.findIndex(t => 
      t.correctAnswer === item.correctAnswer && 
      JSON.stringify(t.imageOptions.sort()) === JSON.stringify(item.imageOptions.sort())
    )
  );

  // 최대 20개 반환
  return uniqueItems.slice(0, 20);
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
        // 사용 가능한 이미지 단어 목록 로드
        const availableWords = await loadAvailableWords();
        console.log('[p5_vocabulary] 사용 가능한 이미지 단어:', availableWords.length, '개');

        const gradeLevel = await getUserGradeLevel(user.id);
        const dbItems = await fetchApprovedTestItems('p5_vocabulary', gradeLevel || undefined);

        if (dbItems && Array.isArray(dbItems.items)) {
          console.log('[p5_vocabulary] DB에서 승인된 문항 사용:', dbItems.items.length, '개');
          // DB 문항도 실제 존재하는 이미지만 사용하도록 필터링
          const filteredItems = (dbItems.items as MeaningItem[]).filter(item => {
            const correctWord = extractImageWord(item.correctAnswer);
            const allOptionsValid = item.imageOptions.every(opt => {
              const word = extractImageWord(opt);
              return availableWords.includes(word);
            });
            return availableWords.includes(correctWord) && allOptionsValid;
          });
          
          if (filteredItems.length > 0) {
            setItems(filteredItems);
          } else {
            console.log('[p5_vocabulary] DB 문항이 모두 필터링되어 기본 문항 사용');
            const fixedItems = await getFixedMeaningItems(availableWords);
            setItems(fixedItems);
          }
        } else {
          console.log('[p5_vocabulary] 승인된 문항이 없어 기본 문항 사용');
          const fixedItems = await getFixedMeaningItems(availableWords);
          setItems(fixedItems);
        }
      } catch (error) {
        console.error('[p5_vocabulary] 문항 로딩 오류, 기본 문항 사용:', error);
        const availableWords = await loadAvailableWords();
        const fixedItems = await getFixedMeaningItems(availableWords);
        setItems(fixedItems);
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

      const response = await fetch('/api/submit-p5_vocabulary', {
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
        const errorData = await response.json().catch(() => ({}));
        console.error('[p5_vocabulary] 제출 실패:', response.status, errorData);
        throw new Error(errorData.error || '제출 실패');
      }

      const result = await response.json();
      console.log('[p5_vocabulary] 제출 성공:', result);
      setFeedback('좋아요! 다음 문제예요.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('[p5_vocabulary] 제출 오류:', error);
      setFeedback(`제출 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setIsSubmitting(false);
    }
  };

  const loadImagesForItem = useCallback(async (item: MeaningItem) => {
    setIsLoadingImages(true);
    const newImageUrls: Record<string, string> = {};
    
    try {
      // 이미 캐시된 이미지는 즉시 사용
      const cachedOptions: string[] = [];
      const uncachedOptions: string[] = [];
      
      item.imageOptions.forEach(option => {
        if (imageUrls[option]) {
          cachedOptions.push(option);
          newImageUrls[option] = imageUrls[option];
        } else {
          uncachedOptions.push(option);
        }
      });
      
      if (cachedOptions.length > 0) {
        console.log(`[p5_vocabulary] 캐시된 이미지 사용: ${cachedOptions.join(', ')}`);
        // 캐시된 이미지는 즉시 상태 업데이트
        setImageUrls(prev => ({ ...prev, ...newImageUrls }));
      }
      
      // 캐시되지 않은 이미지들을 병렬로 로드 (public/images 폴더의 이미지만 사용)
      if (uncachedOptions.length > 0) {
        console.log(`[p5_vocabulary] 병렬 이미지 로드 시작: ${uncachedOptions.join(', ')}`);
        
        const imagePromises = uncachedOptions.map(async (option) => {
          try {
            // option에서 핵심 단어 추출 (예: "red apple" -> "apple", "a red apple" -> "apple", "pizza" -> "pizza")
            const word = extractImageWord(option);
            const imagePath = `/images/vocabulary/chunjae-text-ham/${word}.png`;
            
            // 이미지 파일 존재 여부 확인
            const img = new Image();
            return new Promise<{ option: string; url: string | null; error?: string }>((resolve) => {
              img.onload = () => {
                console.log(`[p5_vocabulary] 이미지 로드 성공: ${option} -> ${imagePath}`);
                resolve({ option, url: imagePath });
              };
              img.onerror = () => {
                console.warn(`[p5_vocabulary] 이미지 파일 없음: ${option} -> ${imagePath} (단어: ${word})`);
                resolve({ option, url: null, error: '파일 없음' });
              };
              img.src = imagePath;
            });
          } catch (error) {
            console.error(`[p5_vocabulary] 이미지 로드 실패 (${option}):`, error);
            return { option, url: null, error: String(error) };
          }
        });
        
        // 모든 이미지 로드를 병렬로 실행
        const results = await Promise.all(imagePromises);
        
        // 성공한 이미지들을 상태에 추가
        results.forEach(({ option, url }) => {
          if (url) {
            newImageUrls[option] = url;
          } else {
            console.warn(`[p5_vocabulary] 이미지 로드 실패: ${option}`);
          }
        });
        
        console.log(`[p5_vocabulary] 병렬 로드 완료: ${results.filter(r => r.url).length}/${uncachedOptions.length}개 성공`);
      }
      
      // 최종 상태 업데이트
      setImageUrls(prev => ({ ...prev, ...newImageUrls }));
    } catch (error) {
      console.error('[p5_vocabulary] 이미지 로드 오류:', error);
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
      const wrongAnswer = currentItem.imageOptions[0] === currentItem.correctAnswer 
        ? currentItem.imageOptions[1] || currentItem.imageOptions[0]
        : currentItem.imageOptions[0];
      
      const response = await fetch('/api/submit-p5_vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentItem.wordOrPhrase,
          selectedAnswer: wrongAnswer,
          correctAnswer: currentItem.correctAnswer,
          options: currentItem.imageOptions,
          userId: user.id,
          authToken: authUser.id,
          skip: true, // 넘어가기 플래그
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[p5_vocabulary] 넘어가기 저장 실패:', response.status, errorData);
      }

      setFeedback('다음 문제로 넘어갑니다.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('[p5_vocabulary] 넘어가기 오류:', error);
      setFeedback('오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (phase === 'testing' && items.length > 0 && itemIndex < items.length) {
      const item = items[itemIndex];
      setCurrentItem(item);
      if (item) {
        loadImagesForItem(item);
      }
      
      // 다음 문항의 이미지도 미리 로드 (사용자 경험 개선) - public/images 폴더의 이미지만 사용
      if (itemIndex + 1 < items.length) {
        const nextItem = items[itemIndex + 1];
        if (nextItem) {
          // 백그라운드에서 미리 로드 (public/images 폴더의 이미지만 사용)
          nextItem.imageOptions.forEach(option => {
            if (!imageUrls[option]) {
              const word = extractImageWord(option);
              const imagePath = `/images/vocabulary/chunjae-text-ham/${word}.png`;
              
              // 이미지 파일 존재 여부 확인
              const img = new Image();
              img.onload = () => {
                setImageUrls(prev => ({ ...prev, [option]: imagePath }));
              };
              img.onerror = () => {
                console.warn(`[p5_vocabulary] 사전 로드 실패: ${option} -> ${imagePath}`);
              };
              img.src = imagePath;
            }
          });
        }
      }
    }
  }, [phase, items, itemIndex, loadImagesForItem, imageUrls]);

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
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center',
                marginTop: '2rem',
              }}>
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={imageUrls[option]} 
                            alt={option}
                            style={{
                              width: '150px',
                              height: '150px',
                              objectFit: 'contain',
                              borderRadius: '8px',
                            }}
                            onError={() => {
                              // 이미지 로드 실패 시 실패 목록에 추가
                              console.error(`[p5_vocabulary] 이미지 로드 실패: ${option}, URL: ${imageUrls[option]}`);
                              setFailedImages(prev => new Set(prev).add(option));
                            }}
                            onLoad={() => {
                              console.log(`[p5_vocabulary] 이미지 로드 성공: ${option}, URL: ${imageUrls[option]}`);
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
                            <div style={{ marginBottom: '0.5rem' }}>이미지 로드 중...</div>
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
              
              <button
                onClick={handleSkip}
                style={{
                  position: 'absolute',
                  bottom: '-60px',
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
                disabled={isSubmitting || isAudioLoading || isLoadingImages}
                onMouseEnter={(e) => {
                  if (!isSubmitting && !isAudioLoading && !isLoadingImages) {
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
                onClick={() => router.push('/test/p6_comprehension')}
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    router.push('/lobby');
                  } catch (error) {
                    console.error('[p5_vocabulary] 라우터 오류:', error);
                    window.location.href = '/lobby';
                  }
                }}
              >
                🏠 홈으로 가기
              </button>
            </div>
          </div>
        )}

        {phase === 'testing' && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              style={{
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.7rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  router.push('/lobby');
                } catch (error) {
                  console.error('[p5_vocabulary] 라우터 오류:', error);
                  window.location.href = '/lobby';
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(108, 117, 125, 1)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(108, 117, 125, 0.8)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              🏠 홈으로 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

