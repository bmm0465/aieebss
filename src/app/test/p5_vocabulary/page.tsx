'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

type VocabularyPhase = 'word' | 'phrase' | 'sentence';

interface MeaningItem {
  wordOrPhrase: string;
  imageOptions: string[]; // 이미지 파일명 (단어)
  correctAnswer: string; // 정답 이미지 파일명 (단어)
  phase: VocabularyPhase;
}

interface ImageWord {
  word: string;
  file: string;
}

interface CoreExpressions {
  units: Array<{
    unit: number;
    entries: Array<{
      index: number;
      chunjae_text_ham: string | null;
    }>;
  }>;
}

interface VocabularyLevel {
  units: Array<{
    unit: number;
    entries: Array<{
      index: number;
      chunjae_text_ham: string | null;
    }>;
  }>;
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

// 천재교과서(함) 핵심 표현 로드
const loadChunjaeExpressions = async (): Promise<string[]> => {
  try {
    const response = await fetch('/data/core_expressions.json');
    if (!response.ok) {
      console.warn('[p5_vocabulary] core_expressions.json 로드 실패');
      return [];
    }
    const data: CoreExpressions = await response.json();
    const expressions: string[] = [];
    
    data.units.forEach(unit => {
      unit.entries.forEach(entry => {
        if (entry.chunjae_text_ham && entry.chunjae_text_ham.trim()) {
          // "Hi. / Hello." 같은 경우 분리
          const parts = entry.chunjae_text_ham.split('/').map(s => s.trim());
          expressions.push(...parts);
        }
      });
    });
    
    return expressions.filter(expr => expr.length > 0);
  } catch (error) {
    console.error('[p5_vocabulary] core_expressions.json 로드 오류:', error);
    return [];
  }
};

// 천재교과서(함) 어휘 로드
const loadChunjaeVocabulary = async (): Promise<string[]> => {
  try {
    const response = await fetch('/data/vocabulary_level.json');
    if (!response.ok) {
      console.warn('[p5_vocabulary] vocabulary_level.json 로드 실패');
      return [];
    }
    const data: VocabularyLevel = await response.json();
    const words: string[] = [];
    
    data.units.forEach(unit => {
      unit.entries.forEach(entry => {
        if (entry.chunjae_text_ham && entry.chunjae_text_ham.trim()) {
          // "hello(hi)" 같은 경우 괄호 제거
          const word = entry.chunjae_text_ham.split('(')[0].trim();
          words.push(word);
        }
      });
    });
    
    return words.filter(word => word.length > 0);
  } catch (error) {
    console.error('[p5_vocabulary] vocabulary_level.json 로드 오류:', error);
    return [];
  }
};

// 문구나 문장에서 핵심 단어 추출 (이미지 파일명과 매칭)
const extractImageWord = (phrase: string): string | null => {
  const lowerPhrase = phrase.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = lowerPhrase.split(/\s+/).filter(w => w.length > 0);
  
  // 일반적인 불용어 제거
  const stopWords = ['a', 'an', 'the', 'i', 'am', 'is', 'are', 'do', 'does', 'can', 'can\'t', 'don\'t', 'what', 'how', 'many', 'my', 'you', 'he', 'she', 'it', 'they', 'we', 'this', 'that', 'please', 'sorry', 'okay', 'yes', 'no', 'right', 'welcome', 'fine', 'nice', 'great', 'good', 'big', 'small', 'tall', 'pretty', 'pink', 'red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'one'];
  
  // 명사나 동작 단어 찾기 (불용어가 아닌 단어 중에서)
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (!stopWords.includes(word)) {
      return word;
    }
  }
  
  // 모든 단어가 불용어인 경우, 마지막 단어 반환
  return words.length > 0 ? words[words.length - 1] : null;
};

// 문장/어구에서 핵심 이미지 단어 찾기 (더 정교한 추출)
const findImageWordForExpression = (expression: string, availableWords: string[]): string | null => {
  const lowerExpr = expression.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = lowerExpr.split(/\s+/).filter(w => w.length > 0);
  
  // 이미지로 표현할 수 없는 표현들 필터링
  const nonImageExpressions = [
    "i'm", "im", "i am", "my name is", "how are you", "thank you", "you're welcome", 
    "that's okay", "that's right", "here you are", "yes i do", "no i don't", 
    "yes i can", "no i can't", "i'm sorry", "i'm fine", "how about you"
  ];
  
  const exprLower = lowerExpr.trim();
  for (const nonImg of nonImageExpressions) {
    if (exprLower.includes(nonImg)) {
      // 특정 케이스는 예외 처리
      if (exprLower.includes("i'm momo") || exprLower.includes("im momo")) {
        // "I'm Momo"는 이름이므로 이미지로 표현 불가
        return null;
      }
      // "I'm sorry" 같은 경우는 "sorry" 이미지 사용 가능
      if (nonImg === "i'm sorry" && availableWords.includes('sorry')) {
        return 'sorry';
      }
      // 나머지는 이미지로 표현 불가
      if (!nonImg.includes('sorry')) {
        return null;
      }
    }
  }
  
  // 직접 매칭 시도 (불용어 제외)
  const stopWords = ['i', 'am', 'is', 'are', 'do', 'does', 'can', 'can\'t', 'don\'t', 'what', 'how', 'many', 'my', 'you', 'he', 'she', 'it', 'they', 'we', 'this', 'that', 'please', 'yes', 'no', 'right', 'welcome', 'fine', 'nice', 'great', 'good', 'big', 'small', 'tall', 'pretty', 'pink', 'red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'one', 'a', 'an', 'the'];
  
  for (const word of words) {
    if (!stopWords.includes(word) && availableWords.includes(word)) {
      return word;
    }
  }
  
  // 추출 시도
  const extracted = extractImageWord(expression);
  if (extracted && availableWords.includes(extracted)) {
    return extracted;
  }
  
  // 특수 케이스 처리
  if (expression.toLowerCase().includes('dad') || expression.toLowerCase().includes('father')) {
    return availableWords.includes('dad') ? 'dad' : (availableWords.includes('grandfather') ? 'grandfather' : null);
  }
  if (expression.toLowerCase().includes('mom') || expression.toLowerCase().includes('mother')) {
    // "I'm Momo" 같은 경우는 제외 (이미 위에서 처리됨)
    if (expression.toLowerCase().includes("i'm momo") || expression.toLowerCase().includes("im momo")) {
      return null;
    }
    return availableWords.includes('mom') ? 'mom' : (availableWords.includes('grandmother') ? 'grandmother' : null);
  }
  if (expression.toLowerCase().includes('brother')) {
    return availableWords.includes('brother') ? 'brother' : null;
  }
  if (expression.toLowerCase().includes('sister')) {
    return availableWords.includes('sister') ? 'sister' : null;
  }
  if (expression.toLowerCase().includes('sit down')) {
    return availableWords.includes('sit') ? 'sit' : null;
  }
  if (expression.toLowerCase().includes('stand up')) {
    return availableWords.includes('stand') ? 'stand' : null;
  }
  if (expression.toLowerCase().includes('open the door')) {
    return availableWords.includes('door') ? 'door' : (availableWords.includes('open') ? 'open' : null);
  }
  if (expression.toLowerCase().includes('close the door')) {
    return availableWords.includes('door') ? 'door' : (availableWords.includes('close') ? 'close' : null);
  }
  
  return null;
};

// [폴백] 천재교과서(함) 기반 문항 생성
const getFixedMeaningItems = async (availableWords: string[]): Promise<MeaningItem[]> => {
  if (availableWords.length === 0) {
    return [];
  }

  const items: MeaningItem[] = [];
  
  // 천재교과서(함) 데이터 로드
  const chunjaeWords = await loadChunjaeVocabulary();
  const chunjaeExpressions = await loadChunjaeExpressions();
  
  console.log('[p5_vocabulary] 천재교과서(함) 단어:', chunjaeWords.length, '개');
  console.log('[p5_vocabulary] 천재교과서(함) 표현:', chunjaeExpressions.length, '개');
  
  // 사용 가능한 이미지가 있는 단어만 필터링
  const validWords = chunjaeWords.filter(w => availableWords.includes(w.toLowerCase()));
  console.log('[p5_vocabulary] 사용 가능한 단어:', validWords.length, '개');
  
  // 1. 단어 문항 (단순 명사) - 5개
  const wordItems: string[] = [];
  validWords.forEach(word => {
    if (wordItems.length < 5) {
      const wrongWords = validWords.filter(w => w !== word).sort(() => Math.random() - 0.5).slice(0, 2);
      if (wrongWords.length >= 2) {
        wordItems.push(word);
        items.push({
          wordOrPhrase: word,
          imageOptions: [word.toLowerCase(), ...wrongWords.map(w => w.toLowerCase())].sort(() => Math.random() - 0.5),
          correctAnswer: word.toLowerCase(),
          phase: 'word',
        });
      }
    }
  });
  
  // 2. 어구 문항 (2-3단어 조합) - 5개
  const phraseExpressions = chunjaeExpressions.filter(expr => {
    const wordCount = expr.split(/\s+/).length;
    return wordCount >= 2 && wordCount <= 4 && !expr.includes('?') && !expr.includes('!');
  });
  
  phraseExpressions.forEach(expr => {
    if (items.filter(i => i.phase === 'phrase').length >= 5) return;
    
    const imageWord = findImageWordForExpression(expr, availableWords);
    if (imageWord) {
      const wrongWords = validWords
        .filter(w => w.toLowerCase() !== imageWord)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(w => w.toLowerCase());
      
      if (wrongWords.length >= 2) {
        items.push({
          wordOrPhrase: expr,
          imageOptions: [imageWord, ...wrongWords].sort(() => Math.random() - 0.5),
          correctAnswer: imageWord,
          phase: 'phrase',
        });
      }
    }
  });
  
  // 3. 문장 문항 (질문이나 긴 문장) - 5개
  const sentenceExpressions = chunjaeExpressions.filter(expr => {
    const wordCount = expr.split(/\s+/).length;
    return wordCount >= 3 || expr.includes('?') || expr.includes('!');
  });
  
  sentenceExpressions.forEach(expr => {
    if (items.filter(i => i.phase === 'sentence').length >= 5) return;
    
    const imageWord = findImageWordForExpression(expr, availableWords);
    if (imageWord) {
      const wrongWords = validWords
        .filter(w => w.toLowerCase() !== imageWord)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(w => w.toLowerCase());
      
      if (wrongWords.length >= 2) {
        items.push({
          wordOrPhrase: expr,
          imageOptions: [imageWord, ...wrongWords].sort(() => Math.random() - 0.5),
          correctAnswer: imageWord,
          phase: 'sentence',
        });
      }
    }
  });
  
  // 단어 => 어구 => 문장 순서로 정렬
  const sortedItems: MeaningItem[] = [];
  
  const wordItems_sorted = items.filter(i => i.phase === 'word').slice(0, 5);
  const phraseItems_sorted = items.filter(i => i.phase === 'phrase').slice(0, 5);
  const sentenceItems_sorted = items.filter(i => i.phase === 'sentence').slice(0, 5);
  
  const maxLength = Math.max(wordItems_sorted.length, phraseItems_sorted.length, sentenceItems_sorted.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (i < wordItems_sorted.length) sortedItems.push(wordItems_sorted[i]);
    if (i < phraseItems_sorted.length) sortedItems.push(phraseItems_sorted[i]);
    if (i < sentenceItems_sorted.length) sortedItems.push(sentenceItems_sorted[i]);
  }
  
  return sortedItems; // 총 15개 (단어 5개 + 어구 5개 + 문장 5개)
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
            const correctWord = item.correctAnswer.toLowerCase();
            const allOptionsValid = item.imageOptions.every(opt => {
              const word = opt.toLowerCase();
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
      // 사전 생성된 오디오 파일 사용 (우선)
      const safeFileName = phrase.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const audioPath = `/audio/meaning/${safeFileName}.mp3`;
      
      // 먼저 파일 존재 여부 확인
      let usePreGenerated = false;
      try {
        const response = await fetch(audioPath, { method: 'HEAD' });
        usePreGenerated = response.ok;
      } catch (error) {
        console.warn(`[p5_vocabulary] 파일 확인 실패, TTS 사용: ${audioPath}`);
        usePreGenerated = false;
      }
      
      if (usePreGenerated) {
        // 사전 생성된 파일이 있으면 사용 시도
        try {
          const audio = new Audio(audioPath);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('오디오 재생 타임아웃'));
            }, 5000);
            
            audio.onended = () => {
              clearTimeout(timeout);
              resolve();
            };
            audio.onerror = (error) => {
              clearTimeout(timeout);
              console.warn(`[p5_vocabulary] 오디오 파일 재생 실패, TTS로 폴백: ${audioPath}`, error);
              reject(new Error('오디오 재생 실패'));
            };
            audio.onloadeddata = () => {
              // 파일이 로드되면 재생 시도
              audio.play().catch((playError) => {
                clearTimeout(timeout);
                console.warn(`[p5_vocabulary] 오디오 재생 실패, TTS로 폴백:`, playError);
                reject(playError);
              });
            };
            audio.load();
          });
          return; // 성공적으로 재생했으면 종료
        } catch (error) {
          console.warn(`[p5_vocabulary] 사전 생성된 오디오 재생 실패, TTS로 폴백:`, error);
          // TTS로 폴백 (아래 코드 계속 실행)
        }
      }
      
      // 파일이 없거나 재생 실패 시 TTS API 사용 (폴백)
      console.log(`[p5_vocabulary] TTS 사용: ${phrase}`);
      const ttsResponse = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: phrase }),
      });
      
      if (!ttsResponse.ok) {
        throw new Error('음성 생성 실패');
      }
      
      const audioBlob = await ttsResponse.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              const fallbackAudio = new Audio(audioUrl);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('TTS 오디오 재생 타임아웃'));
        }, 10000);
        
                fallbackAudio.onended = () => {
          clearTimeout(timeout);
                  URL.revokeObjectURL(audioUrl);
          resolve();
        };
        fallbackAudio.onerror = (error) => {
          clearTimeout(timeout);
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        fallbackAudio.onloadeddata = () => {
          fallbackAudio.play().catch((playError) => {
            clearTimeout(timeout);
            URL.revokeObjectURL(audioUrl);
            reject(playError);
          });
        };
        fallbackAudio.load();
      });
    } catch (error) {
      console.error('[p5_vocabulary] 오디오 재생 에러:', error);
      setFeedback('소리를 재생하는 데 문제가 생겼어요. 잠시 후 다시 시도해주세요.');
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
          phase: currentItem.phase,
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
        setImageUrls(prev => ({ ...prev, ...newImageUrls }));
      }
      
      // 캐시되지 않은 이미지들을 병렬로 로드
      if (uncachedOptions.length > 0) {
        console.log(`[p5_vocabulary] 병렬 이미지 로드 시작: ${uncachedOptions.join(', ')}`);
        
        const imagePromises = uncachedOptions.map(async (option) => {
          try {
            const word = option.toLowerCase();
            const imagePath = `/images/vocabulary/chunjae-text-ham/${word}.png`;
            
            const img = new Image();
            return new Promise<{ option: string; url: string | null; error?: string }>((resolve) => {
              img.onload = () => {
                console.log(`[p5_vocabulary] 이미지 로드 성공: ${option} -> ${imagePath}`);
                resolve({ option, url: imagePath });
              };
              img.onerror = () => {
                console.warn(`[p5_vocabulary] 이미지 파일 없음: ${option} -> ${imagePath}`);
                resolve({ option, url: null, error: '파일 없음' });
              };
              img.src = imagePath;
            });
          } catch (error) {
            console.error(`[p5_vocabulary] 이미지 로드 실패 (${option}):`, error);
            return { option, url: null, error: String(error) };
          }
        });
        
        const results = await Promise.all(imagePromises);
        
        results.forEach(({ option, url }) => {
          if (url) {
            newImageUrls[option] = url;
          } else {
            console.warn(`[p5_vocabulary] 이미지 로드 실패: ${option}`);
          }
        });
        
        console.log(`[p5_vocabulary] 병렬 로드 완료: ${results.filter(r => r.url).length}/${uncachedOptions.length}개 성공`);
      }
      
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
          phase: currentItem.phase,
          userId: user.id,
          authToken: authUser.id,
          skip: true,
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
      
      // 다음 문항의 이미지도 미리 로드
      if (itemIndex + 1 < items.length) {
        const nextItem = items[itemIndex + 1];
        if (nextItem) {
          nextItem.imageOptions.forEach(option => {
            if (!imageUrls[option]) {
              const word = option.toLowerCase();
              const imagePath = `/images/vocabulary/chunjae-text-ham/${word}.png`;
              
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
  const phaseIndicatorStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: '#8b5cf6',
    marginBottom: '1rem',
    fontWeight: '600',
  };

  if (!user) {
    return (
      <div style={pageStyle}>
        <h2 style={{ color: '#171717' }}>사용자 정보를 불러오는 중...</h2>
      </div>
    );
  }

  const getPhaseLabel = (phase: VocabularyPhase): string => {
    switch (phase) {
      case 'word': return '단어';
      case 'phrase': return '어구';
      case 'sentence': return '문장';
      default: return '';
    }
  };

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
            {currentItem && (
              <div style={phaseIndicatorStyle}>
                {getPhaseLabel(currentItem.phase)} 문제 ({itemIndex + 1}/{items.length})
              </div>
            )}
          </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>
              단어, 어구, 문장을 듣거나 읽고, 알맞은 그림을 선택해주세요.
              <br />
              단어 → 어구 → 문장 순서로 문제가 출제됩니다.
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
                              console.error(`[p5_vocabulary] 이미지 로드 실패: ${option}, URL: ${imageUrls[option]}`);
                              setFailedImages(prev => new Set(prev).add(option));
                            }}
                            onLoad={() => {
                              console.log(`[p5_vocabulary] 이미지 로드 성공: ${option}, URL: ${imageUrls[option]}`);
                            }}
                          />
                        </div>
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
                            <div style={{ marginBottom: '0.5rem' }}>이미지 로드 중...</div>
                        ) : (
                          <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>이미지 준비 중...</div>
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
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await router.push('/lobby');
                    // 라우터가 작동하지 않으면 강제로 이동
                    setTimeout(() => {
                      if (window.location.pathname !== '/lobby') {
                        window.location.href = '/lobby';
                      }
                    }, 100);
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
