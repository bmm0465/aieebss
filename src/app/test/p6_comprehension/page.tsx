'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

interface ImageWord {
  word: string;
  file: string;
}

interface ComprehensionOption {
  type: 'image' | 'word';
  content: string; // 영어 단어 (이미지 파일명)
  displayText?: string; // 한국어 표시 텍스트 (선택적)
}

interface ComprehensionItem {
  dialogueOrStory: string;
  question: string;
  questionKr?: string;
  options: ComprehensionOption[];
  correctAnswer: string; // 영어 단어 (이미지 파일명)
  isDialogue?: boolean; // 대화 형식인지 여부
  evaluationTarget?: string; // evaluation.target (색깔과 크기, 인물의 모습, 색깔)
  speaker1?: string; // 대화 형식일 때 Speaker 1 텍스트
  speaker2?: string; // 대화 형식일 때 Speaker 2 텍스트
}

// p6_items.json 형식
interface P6JsonOption {
  number: number;
  description: string;
  isCorrect: boolean;
}

interface P6JsonItem {
  id: string;
  question: string;
  script: {
    speaker1: string;
    speaker2: string;
  };
  options: P6JsonOption[];
  evaluation: {
    target: string;
    description: string;
  };
}

// 한국어 보기를 영어 단어(이미지 파일명)로 변환하는 매핑
const koreanToEnglishWord: Record<string, string> = {
  // 색상
  '빨간색': 'red',
  '파란색': 'blue',
  '노란색': 'yellow',
  '초록색': 'green',
  '분홍색': 'pink',
  '하얀색': 'white',
  '검은색': 'black',
  '빨간색 공': 'ball',
  '파란색 공': 'ball',
  '작은 빨간색 공': 'ball',
  '큰 빨간색 공': 'ball',
  '작은 파란색 공': 'ball',
  '큰 파란색 공': 'ball',
  '작은 초록색 공': 'ball',
  '큰 초록색 공': 'ball',
  '작은 노란색 공': 'ball',
  '큰 노란색 공': 'ball',
  '작은 분홍색 공': 'ball',
  '큰 분홍색 공': 'ball',
  // 크기
  '큰': 'big',
  '작은': 'small',
  // 인물
  '키가 큰 남자': 'tall',
  '키가 작은 남자': 'small',
  '키가 큰 여자': 'tall',
  '키가 작은 여자': 'small',
  '예쁜 여자': 'pretty',
  // 동작
  '수영': 'swim',
  '춤': 'dance',
  '노래': 'sing',
  // 가족
  '아빠': 'dad',
  '엄마': 'mom',
  '형제': 'brother',
  '자매': 'sister',
  '할아버지': 'grandfather',
  '할머니': 'grandmother',
};

// 한국어 보기에서 핵심 단어 추출
const extractWordFromKorean = (korean: string): string | null => {
  // 직접 매칭
  if (koreanToEnglishWord[korean]) {
    return koreanToEnglishWord[korean];
  }
  
  // 부분 매칭
  for (const [kr, en] of Object.entries(koreanToEnglishWord)) {
    if (korean.includes(kr)) {
      return en;
    }
  }
  
  // 특수 케이스: "큰 빨간색 공" → "ball"
  if (korean.includes('공')) return 'ball';
  if (korean.includes('책')) return 'book';
  if (korean.includes('연필')) return 'pencil';
  if (korean.includes('컵')) return 'cup';
  if (korean.includes('모자')) return 'hat';
  if (korean.includes('고양이')) return 'cat';
  if (korean.includes('강아지')) return 'dog';
  if (korean.includes('사과')) return 'apple';
  if (korean.includes('바나나')) return 'banana';
  if (korean.includes('오렌지')) return 'orange';
  if (korean.includes('펜')) return 'pen';
  if (korean.includes('인형')) return 'doll';
  if (korean.includes('로봇')) return 'robot';
  if (korean.includes('자전거')) return 'bike';
  if (korean.includes('꽃')) return 'flower';
  if (korean.includes('달걀')) return 'egg';
  if (korean.includes('사자')) return 'lion';
  if (korean.includes('원숭이')) return 'monkey';
  if (korean.includes('얼룩말')) return 'zebra';
  if (korean.includes('새')) return 'bird';
  
  return null;
};

// 사용 가능한 이미지 단어 목록 로드
const loadAvailableWords = async (): Promise<string[]> => {
  try {
    const response = await fetch('/images/vocabulary/chunjae-text-ham/index.json');
    if (!response.ok) {
      console.warn('[p6_comprehension] index.json 로드 실패');
      return [];
    }
    const data: ImageWord[] = await response.json();
    return data.map(item => item.word);
  } catch (error) {
    console.error('[p6_comprehension] index.json 로드 오류:', error);
    return [];
  }
};

// [폴백] COMPREHENSION 고정 문항 (천재교과서 함 기반)
const getFixedComprehensionItems = async (availableWords: string[]): Promise<ComprehensionItem[]> => {
  const items: ComprehensionItem[] = [];
  
  // 예시 1: 말 (2~3문장)
  if (availableWords.includes('swim')) {
    items.push({
      dialogueOrStory: "Hello, I'm Kate. I can swim.",
      question: 'What can Kate do?',
      questionKr: 'Kate는 무엇을 할 수 있나요?',
      options: [
        { type: 'image', content: 'swim', displayText: '수영' },
        { type: 'image', content: 'dance', displayText: '춤' },
        { type: 'image', content: 'sing', displayText: '노래' },
      ],
      correctAnswer: 'swim',
      isDialogue: false,
    });
  }
  
  // 예시 2: 대화 (A-B 형식)
  if (availableWords.includes('brother')) {
    items.push({
      dialogueOrStory: "B: Who's he?\nG: He's my brother.",
      question: "Who is he?",
      questionKr: '그는 누구인가요?',
      options: [
        { type: 'image', content: 'brother', displayText: '형제' },
        { type: 'image', content: 'dad', displayText: '아빠' },
        { type: 'image', content: 'mom', displayText: '엄마' },
      ],
      correctAnswer: 'brother',
      isDialogue: true,
    });
  }
  
  // 추가 예시들
  if (availableWords.includes('ball') && availableWords.includes('red')) {
    items.push({
      dialogueOrStory: "Look at this ball. It is big. It is red.",
      question: "What is being described?",
      questionKr: '묘사하는 내용에 알맞은 공을 고르시오.',
      options: [
        { type: 'image', content: 'ball', displayText: '큰 빨간색 공' },
        { type: 'image', content: 'ball', displayText: '작은 파란색 공' },
        { type: 'image', content: 'ball', displayText: '큰 노란색 공' },
      ],
      correctAnswer: 'ball',
      isDialogue: false,
    });
  }
  
  return items;
};

export default function ComprehensionTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [items, setItems] = useState<ComprehensionItem[]>([]);
  const [itemIndex, setItemIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState<ComprehensionItem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showText, setShowText] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [repeatCount, setRepeatCount] = useState(0); // 반복 재생 횟수

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);

      try {
        const availableWords = await loadAvailableWords();
        console.log('[p6_comprehension] 사용 가능한 이미지 단어:', availableWords.length, '개');

        // p6_items.json에서 문항 로드 시도
        const response = await fetch('/data/p6_items.json');
        if (response.ok) {
          const jsonItems = await response.json();
          console.log('[p6_comprehension] p6_items.json에서 문항 로드:', jsonItems.length, '개');
          
          // p6_items.json 형식을 ComprehensionItem 형식으로 변환
          const allConvertedItems: ComprehensionItem[] = (jsonItems as P6JsonItem[]).map((item: P6JsonItem) => {
            const correctOption = item.options.find((opt: P6JsonOption) => opt.isCorrect);
            const correctWord = correctOption ? extractWordFromKorean(correctOption.description) : null;
            
            // 보기를 이미지로 변환
            const allImageOptions: ComprehensionOption[] = item.options.map((opt: P6JsonOption) => {
              const word = extractWordFromKorean(opt.description);
              return {
                type: 'image' as const,
                content: word || opt.description.toLowerCase().replace(/\s+/g, '_'),
                displayText: opt.description,
                isCorrect: opt.isCorrect, // 정답 여부 임시 저장
              } as ComprehensionOption & { isCorrect?: boolean };
            });
            
            // 정답 보기 찾기
            type OptionWithCorrect = ComprehensionOption & { isCorrect?: boolean };
            const correctImageOption = allImageOptions.find((opt: OptionWithCorrect) => opt.isCorrect);
            
            // 오답 보기들
            const wrongOptions = allImageOptions.filter((opt: OptionWithCorrect) => !opt.isCorrect);
            
            // 정답 + 오답 2개 선택 (총 3개)
            const selectedWrongOptions = wrongOptions
              .sort(() => Math.random() - 0.5)
              .slice(0, 2);
            
            // 정답 포함하여 3개 구성 후 섞기
            const removeIsCorrect = (opt: OptionWithCorrect): ComprehensionOption => {
              return {
                type: opt.type,
                content: opt.content,
                displayText: opt.displayText,
              };
            };
            const finalOptions = correctImageOption 
              ? [...selectedWrongOptions, correctImageOption]
                  .sort(() => Math.random() - 0.5)
                  .map(removeIsCorrect) // isCorrect 제거
              : allImageOptions.slice(0, 3).map(removeIsCorrect); // 폴백: 처음 3개
            
            return {
              dialogueOrStory: item.script.speaker2 ? 
                `${item.script.speaker1}\n${item.script.speaker2}` : 
                item.script.speaker1,
              question: item.question.includes('묘사하는 내용') 
                ? 'What is being described?' 
                : item.question,
              questionKr: item.question,
              options: finalOptions,
              correctAnswer: correctWord || (correctOption ? correctOption.description : ''),
              isDialogue: !!item.script.speaker2,
              evaluationTarget: item.evaluation?.target || '', // evaluation.target 저장
              speaker1: item.script.speaker1, // 화자별 재생을 위해 저장
              speaker2: item.script.speaker2 || undefined, // 화자별 재생을 위해 저장
            };
          }).filter(item => item.correctAnswer && availableWords.includes(item.correctAnswer));
          
          // evaluation.target 기준으로 분류하여 각 5개씩 선택
          const colorSizeItems = allConvertedItems.filter(item => item.evaluationTarget === '색깔과 크기');
          const appearanceItems = allConvertedItems.filter(item => item.evaluationTarget === '인물의 모습');
          const colorOnlyItems = allConvertedItems.filter(item => item.evaluationTarget === '색깔');
          
          // 각 카테고리에서 5개씩 랜덤 선택
          const selectedColorSize = colorSizeItems.sort(() => Math.random() - 0.5).slice(0, 5);
          const selectedAppearance = appearanceItems.sort(() => Math.random() - 0.5).slice(0, 5);
          const selectedColorOnly = colorOnlyItems.sort(() => Math.random() - 0.5).slice(0, 5);
          
          // 모습 = 인물의 모습과 동일하므로, 총 15개 (크기 5개 + 인물 5개 + 색깔 5개)
          const convertedItems = [...selectedColorSize, ...selectedAppearance, ...selectedColorOnly];
          
          console.log('[p6_comprehension] 필터링된 문항:', {
            크기: selectedColorSize.length,
            인물: selectedAppearance.length,
            색깔: selectedColorOnly.length,
            총: convertedItems.length
          });
          
          if (convertedItems.length > 0) {
            setItems(convertedItems);
          } else {
            const fixedItems = await getFixedComprehensionItems(availableWords);
            setItems(fixedItems);
          }
        } else {
          // DB에서 승인된 문항 조회 시도
          const gradeLevel = await getUserGradeLevel(user.id);
          const dbItems = await fetchApprovedTestItems('p6_comprehension', gradeLevel || undefined);

          if (dbItems && Array.isArray(dbItems.items)) {
            console.log('[p6_comprehension] DB에서 승인된 문항 사용:', dbItems.items.length, '개');
            setItems(dbItems.items as ComprehensionItem[]);
          } else {
            console.log('[p6_comprehension] 승인된 문항이 없어 기본 문항 사용');
            const fixedItems = await getFixedComprehensionItems(availableWords);
            setItems(fixedItems);
          }
        }
      } catch (error) {
        console.error('[p6_comprehension] 문항 로딩 오류, 기본 문항 사용:', error);
        const availableWords = await loadAvailableWords();
        const fixedItems = await getFixedComprehensionItems(availableWords);
        setItems(fixedItems);
      }
    };
    setup();
  }, [router, supabase.auth]);

  // 텍스트를 파일명으로 변환 (화자별 음성 파일용)
  const textToFileName = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50);
  }, []);

  // 단일 음성 파일 재생 (사전 생성 파일 또는 TTS)
  const playSingleAudio = useCallback(async (text: string, speakerFolder: 'p6_speaker1' | 'p6_speaker2' | null = null): Promise<void> => {
    // 화자별 폴더가 지정된 경우 해당 폴더에서 파일 찾기
    let audioPath = '';
    if (speakerFolder) {
      const fileName = `${textToFileName(text)}.mp3`;
      audioPath = `/audio/comprehension/${speakerFolder}/${fileName}`;
    } else {
      // 기존 방식: 전체 스토리 파일
      const safeFileName = text.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 50);
      audioPath = `/audio/comprehension/${safeFileName}.mp3`;
    }

    // 파일 존재 여부 확인
    let usePreGenerated = false;
    try {
      const response = await fetch(audioPath, { method: 'HEAD' });
      usePreGenerated = response.ok;
    } catch {
      usePreGenerated = false;
    }

    if (usePreGenerated) {
      // 사전 생성된 파일 재생
      const audio = new Audio(audioPath);
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('오디오 재생 타임아웃'));
        }, 10000);

        audio.onended = () => {
          clearTimeout(timeout);
          resolve();
        };
        audio.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('오디오 재생 실패'));
        };
        audio.onloadeddata = () => {
          audio.play().catch((playError) => {
            clearTimeout(timeout);
            reject(playError);
          });
        };
        audio.load();
      });
    } else {
      // TTS API 사용 (폴백)
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });

      if (!ttsResponse.ok) {
        throw new Error('음성 생성 실패');
      }

      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const fallbackAudio = new Audio(audioUrl);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('TTS 오디오 재생 타임아웃'));
        }, 10000);

        fallbackAudio.onended = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        fallbackAudio.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(audioUrl);
          reject(new Error('TTS 오디오 재생 실패'));
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
    }
  }, [textToFileName]);

  const playStoryAudio = useCallback(async (item: ComprehensionItem, repeat: number = 1) => {
    setIsAudioLoading(true);
    try {
      const playDialogue = async (): Promise<void> => {
        // 대화 형식인 경우: 화자별로 순차 재생
        if (item.isDialogue && item.speaker1 && item.speaker2) {
          // Speaker 1 재생
          try {
            await playSingleAudio(item.speaker1, 'p6_speaker1');
            // 화자 사이 간격
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.warn('[p6_comprehension] Speaker 1 재생 실패:', error);
            // 계속 진행
          }

          // Speaker 2 재생
          try {
            await playSingleAudio(item.speaker2, 'p6_speaker2');
          } catch (error) {
            console.warn('[p6_comprehension] Speaker 2 재생 실패:', error);
            throw error;
          }
        } else {
          // 스토리 형식인 경우: 기존 방식 (전체 텍스트 재생)
          await playSingleAudio(item.dialogueOrStory, null);
        }
      };

      // 반복 재생
      for (let i = 0; i < repeat; i++) {
        await playDialogue();
        if (i < repeat - 1) {
          // 반복 사이에 짧은 간격
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('[p6_comprehension] 오디오 재생 에러:', error);
      setFeedback('소리를 재생하는 데 문제가 생겼어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsAudioLoading(false);
    }
  }, [playSingleAudio]);

  const loadImagesForItem = useCallback(async (item: ComprehensionItem) => {
    setIsLoadingImages(true);
    const newImageUrls: Record<string, string> = {};
    
    try {
      item.options.forEach(option => {
        if (option.type === 'image') {
          const word = option.content.toLowerCase();
          const imagePath = `/images/vocabulary/chunjae-text-ham/${word}.png`;
          
          if (imageUrls[word]) {
            newImageUrls[word] = imageUrls[word];
          } else {
            // 이미지 로드 시도
            const img = new Image();
            img.onload = () => {
              setImageUrls(prev => ({ ...prev, [word]: imagePath }));
            };
            img.onerror = () => {
              console.warn(`[p6_comprehension] 이미지 파일 없음: ${word} -> ${imagePath}`);
            };
            img.src = imagePath;
            newImageUrls[word] = imagePath;
          }
        }
      });
      
      setImageUrls(prev => ({ ...prev, ...newImageUrls }));
    } catch (error) {
      console.error('[p6_comprehension] 이미지 로드 오류:', error);
    } finally {
      setIsLoadingImages(false);
    }
  }, [imageUrls]);

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

      const response = await fetch('/api/submit-p6_comprehension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialogueOrStory: currentItem.dialogueOrStory,
          question: currentItem.question,
          selectedAnswer: answer,
          correctAnswer: currentItem.correctAnswer,
          options: currentItem.options,
          userId: user.id,
          authToken: authUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[p6_comprehension] 제출 실패:', response.status, errorData);
        throw new Error(errorData.error || '제출 실패');
      }

      const result = await response.json();
      console.log('[p6_comprehension] 제출 성공:', result);
      setFeedback('좋아요! 다음 문제예요.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('[p6_comprehension] 제출 오류:', error);
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
      setIsSubmitting(false);
      setFeedback('');
      setShowText(false);
      setRepeatCount(0);
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

      const wrongAnswer = currentItem.options[0]?.content === currentItem.correctAnswer 
        ? currentItem.options[1]?.content || currentItem.options[0]?.content || ''
        : currentItem.options[0]?.content || '';
      
      const response = await fetch('/api/submit-p6_comprehension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialogueOrStory: currentItem.dialogueOrStory,
          question: currentItem.question,
          selectedAnswer: wrongAnswer,
          correctAnswer: currentItem.correctAnswer,
          options: currentItem.options,
          userId: user.id,
          authToken: authUser.id,
          skip: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[p6_comprehension] 넘어가기 저장 실패:', response.status, errorData);
      }

      setFeedback('다음 문제로 넘어갑니다.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('[p6_comprehension] 넘어가기 오류:', error);
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
    setRepeatCount(0);
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    minHeight: '200px',
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
  const storyDisplayStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: '1rem 0',
    color: '#6366f1',
    lineHeight: 1.8,
    minHeight: '60px',
    whiteSpace: 'pre-line',
  };
  const questionDisplayStyle: React.CSSProperties = {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    margin: '1.5rem 0',
    color: '#1f2937',
    minHeight: '50px',
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
        {phase !== 'finished' && <h1 style={titleStyle}>6교시: 대화를 듣거나 읽고, 질문에 대한 올바른 그림 고르기</h1>}

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
            <button onClick={handleStartTest} style={buttonStyle}>
              평가 시작하기
            </button>
          </div>
        )}

        {phase === 'testing' && currentItem && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <button
                onClick={() => {
                  const repeat = repeatCount < 2 ? repeatCount + 1 : 1;
                  setRepeatCount(repeat);
                  playStoryAudio(currentItem, repeat);
                }}
                style={{
                  ...buttonStyle,
                  fontSize: '2rem',
                  minHeight: '80px',
                  marginBottom: '1rem',
                  opacity: isAudioLoading ? 0.5 : 1,
                }}
                disabled={isAudioLoading || isSubmitting}
              >
                {isAudioLoading ? '재생 중...' : `🔊 듣기${repeatCount > 0 ? ` (${repeatCount}회 반복)` : ''}`}
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
            {showText && (
              <div style={storyDisplayStyle}>
                {currentItem.isDialogue ? (
                  currentItem.dialogueOrStory.split('\n').map((line, idx) => (
                    <div key={idx} style={{ marginBottom: '0.5rem' }}>
                      {line}
                    </div>
                  ))
                ) : (
                  currentItem.dialogueOrStory
                )}
              </div>
            )}
            <div style={questionDisplayStyle}>
              {currentItem.questionKr || currentItem.question}
            </div>
            <p style={feedbackStyle}>{feedback || '알맞은 이미지를 선택해주세요.'}</p>
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center',
                marginTop: '2rem',
              }}>
                {currentItem.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option.content)}
                    style={{
                      ...(selectedAnswer === option.content ? selectedChoiceButtonStyle : choiceButtonStyle),
                    }}
                    disabled={isSubmitting || isAudioLoading || isLoadingImages}
                  >
                    {option.type === 'image' && imageUrls[option.content] && !failedImages.has(option.content) ? (
                      <>
                        <div style={{ position: 'relative', width: '150px', height: '150px' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={imageUrls[option.content]} 
                            alt={option.displayText || option.content}
                            style={{
                              width: '150px',
                              height: '150px',
                              objectFit: 'contain',
                              borderRadius: '8px',
                            }}
                            onError={() => {
                              console.error(`[p6_comprehension] 이미지 로드 실패: ${option.content}`);
                              setFailedImages(prev => new Set(prev).add(option.content));
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
            <h1 style={titleStyle}>평가 종료!</h1>
            <p style={paragraphStyle}>
              {feedback || "6교시 평가가 끝났습니다. 수고 많으셨습니다!"}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
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
                    console.error('[p6_comprehension] 라우터 오류:', error);
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
          <div style={{ marginTop: '2rem' }}>
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
                  console.error('[p6_comprehension] 라우터 오류:', error);
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
