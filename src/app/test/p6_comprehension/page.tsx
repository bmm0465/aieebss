'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

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


// 20개 고정 문항 정의
const getFixedComprehensionItems = async (): Promise<ComprehensionItem[]> => {
  const items: ComprehensionItem[] = [
    // 문항 1: 모습 - pizza
    {
      dialogueOrStory: "A: Do you like pizza?\nB: Yes, I do. I like pizza.",
      question: '두 사람이 이야기하고 있는 음식은 무엇인가요?',
      questionKr: '두 사람이 이야기하고 있는 음식은 무엇인가요?',
      options: [
        { type: 'image', content: 'pizza' },
        { type: 'image', content: 'chicken' },
        { type: 'image', content: 'steak' },
      ],
      correctAnswer: 'pizza',
      isDialogue: true,
      evaluationTarget: '모습',
      speaker1: 'Do you like pizza?',
      speaker2: 'Yes, I do. I like pizza.',
    },
    // 문항 2: 크기 - a big lion
    {
      dialogueOrStory: "A: Look at the lion.\nB: Wow! It's big.",
      question: '사자의 크기는 어떠한가요?',
      questionKr: '사자의 크기는 어떠한가요?',
      options: [
        { type: 'image', content: 'a small lion' },
        { type: 'image', content: 'a big lion' },
        { type: 'image', content: 'a big mouse' },
      ],
      correctAnswer: 'a big lion',
      isDialogue: true,
      evaluationTarget: '크기',
      speaker1: 'Look at the lion.',
      speaker2: 'Wow! It\'s big.',
    },
    // 문항 3: 색깔 - a yellow crayon
    {
      dialogueOrStory: "A: Do you have a crayon?\nB: Yes. It's yellow.",
      question: '여학생이 가지고 있는 크레용의 색깔은 무엇인가요?',
      questionKr: '여학생이 가지고 있는 크레용의 색깔은 무엇인가요?',
      options: [
        { type: 'image', content: 'a red crayon' },
        { type: 'image', content: 'a yellow crayon' },
        { type: 'image', content: 'a blue crayon' },
      ],
      correctAnswer: 'a yellow crayon',
      isDialogue: true,
      evaluationTarget: '색깔',
      speaker1: 'Do you have a crayon?',
      speaker2: 'Yes. It\'s yellow.',
    },
    // 문항 4: 인물 - dad
    {
      dialogueOrStory: "A: Who is he?\nB: He's my dad.",
      question: '남학생이 소개하는 사람은 누구인가요?',
      questionKr: '남학생이 소개하는 사람은 누구인가요?',
      options: [
        { type: 'image', content: 'dad' },
        { type: 'image', content: 'mom' },
        { type: 'image', content: 'brother' },
      ],
      correctAnswer: 'dad',
      isDialogue: true,
      evaluationTarget: '인물',
      speaker1: 'Who is he?',
      speaker2: 'He\'s my dad.',
    },
    // 문항 5: 모습 - cup
    {
      dialogueOrStory: "A: What's this?\nB: It's a cup. It's nice.",
      question: '여학생이 설명하고 있는 물건은 무엇인가요?',
      questionKr: '여학생이 설명하고 있는 물건은 무엇인가요?',
      options: [
        { type: 'image', content: 'bag' },
        { type: 'image', content: 'cup' },
        { type: 'image', content: 'bed' },
      ],
      correctAnswer: 'cup',
      isDialogue: true,
      evaluationTarget: '모습',
      speaker1: 'What\'s this?',
      speaker2: 'It\'s a cup. It\'s nice.',
    },
    // 문항 6: 크기 - a small bag
    {
      dialogueOrStory: "A: What's that?\nB: It's a bag. It's small.",
      question: '가방의 크기는 어떠한가요?',
      questionKr: '가방의 크기는 어떠한가요?',
      options: [
        { type: 'image', content: 'a big bag' },
        { type: 'image', content: 'a small bag' },
        { type: 'image', content: 'a small cap' },
      ],
      correctAnswer: 'a small bag',
      isDialogue: true,
      evaluationTarget: '크기',
      speaker1: 'What\'s that?',
      speaker2: 'It\'s a bag. It\'s small.',
    },
    // 문항 7: 색깔 - a black dog
    {
      dialogueOrStory: "A: Look at the dog.\nB: It's black. It's cute.",
      question: '강아지의 색깔은 무엇인가요?',
      questionKr: '강아지의 색깔은 무엇인가요?',
      options: [
        { type: 'image', content: 'a white dog' },
        { type: 'image', content: 'a black dog' },
        { type: 'image', content: 'a brown dog' },
      ],
      correctAnswer: 'a black dog',
      isDialogue: true,
      evaluationTarget: '색깔',
      speaker1: 'Look at the dog.',
      speaker2: 'It\'s black. It\'s cute.',
    },
    // 문항 8: 인물 - grandmother
    {
      dialogueOrStory: "A: Who is she?\nB: She's my grandmother.",
      question: '여학생이 가리키는 사람은 누구인가요?',
      questionKr: '여학생이 가리키는 사람은 누구인가요?',
      options: [
        { type: 'image', content: 'grandmother' },
        { type: 'image', content: 'grandfather' },
        { type: 'image', content: 'sister' },
      ],
      correctAnswer: 'grandmother',
      isDialogue: true,
      evaluationTarget: '인물',
      speaker1: 'Who is she?',
      speaker2: 'She\'s my grandmother.',
    },
    // 문항 9: 모습 - a boy jumping
    {
      dialogueOrStory: "A: Can you jump?\nB: Yes, I can. I can jump.",
      question: '남학생은 무엇을 할 수 있나요?',
      questionKr: '남학생은 무엇을 할 수 있나요?',
      options: [
        { type: 'image', content: 'a boy swimming' },
        { type: 'image', content: 'a boy jumping' },
        { type: 'image', content: 'a boy running' },
      ],
      correctAnswer: 'a boy jumping',
      isDialogue: true,
      evaluationTarget: '모습',
      speaker1: 'Can you jump?',
      speaker2: 'Yes, I can. I can jump.',
    },
    // 문항 10: 크기 - a big bear
    {
      dialogueOrStory: "A: Is it a bear?\nB: Yes, it is. It's big.",
      question: '곰의 모습으로 알맞은 것을 고르세요.',
      questionKr: '곰의 모습으로 알맞은 것을 고르세요.',
      options: [
        { type: 'image', content: 'a big bear' },
        { type: 'image', content: 'a small bear' },
        { type: 'image', content: 'a big dog' },
      ],
      correctAnswer: 'a big bear',
      isDialogue: true,
      evaluationTarget: '크기',
      speaker1: 'Is it a bear?',
      speaker2: 'Yes, it is. It\'s big.',
    },
    // 문항 11: 색깔 - a blue bird
    {
      dialogueOrStory: "A: Look! It's a bird.\nB: Oh, it's blue.",
      question: '남학생이 가리키는 새의 색깔은 무엇인가요?',
      questionKr: '남학생이 가리키는 새의 색깔은 무엇인가요?',
      options: [
        { type: 'image', content: 'a blue bird' },
        { type: 'image', content: 'a green bird' },
        { type: 'image', content: 'a red bird' },
      ],
      correctAnswer: 'a blue bird',
      isDialogue: true,
      evaluationTarget: '색깔',
      speaker1: 'Look! It\'s a bird.',
      speaker2: 'Oh, it\'s blue.',
    },
    // 문항 12: 인물 - brother
    {
      dialogueOrStory: "A: Who is he?\nB: He's my brother. He's tall.",
      question: '사진 속의 인물은 누구인가요?',
      questionKr: '사진 속의 인물은 누구인가요?',
      options: [
        { type: 'image', content: 'dad' },
        { type: 'image', content: 'brother' },
        { type: 'image', content: 'grandfather' },
      ],
      correctAnswer: 'brother',
      isDialogue: true,
      evaluationTarget: '인물',
      speaker1: 'Who is he?',
      speaker2: 'He\'s my brother. He\'s tall.',
    },
    // 문항 13: 모습 - skating
    {
      dialogueOrStory: "A: I can skate. Look at me!\nB: Wow, great!",
      question: '여학생이 잘하는 운동은 무엇인가요?',
      questionKr: '여학생이 잘하는 운동은 무엇인가요?',
      options: [
        { type: 'image', content: 'skating' },
        { type: 'image', content: 'skiing' },
        { type: 'image', content: 'dancing' },
      ],
      correctAnswer: 'skating',
      isDialogue: true,
      evaluationTarget: '모습',
      speaker1: 'I can skate. Look at me!',
      speaker2: 'Wow, great!',
    },
    // 문항 14: 크기 - a small fish
    {
      dialogueOrStory: "A: Look at the fish.\nB: It's small. It's cute.",
      question: '물고기의 크기는 어떠한가요?',
      questionKr: '물고기의 크기는 어떠한가요?',
      options: [
        { type: 'image', content: 'a big fish' },
        { type: 'image', content: 'a small fish' },
        { type: 'image', content: 'a small whale' },
      ],
      correctAnswer: 'a small fish',
      isDialogue: true,
      evaluationTarget: '크기',
      speaker1: 'Look at the fish.',
      speaker2: 'It\'s small. It\'s cute.',
    },
    // 문항 15: 색깔 - a white cat
    {
      dialogueOrStory: "A: Is it a cat?\nB: Yes. It's white.",
      question: '고양이의 색깔은 무엇인가요?',
      questionKr: '고양이의 색깔은 무엇인가요?',
      options: [
        { type: 'image', content: 'a black cat' },
        { type: 'image', content: 'a white cat' },
        { type: 'image', content: 'a yellow cat' },
      ],
      correctAnswer: 'a white cat',
      isDialogue: true,
      evaluationTarget: '색깔',
      speaker1: 'Is it a cat?',
      speaker2: 'Yes. It\'s white.',
    },
    // 문항 16: 인물 - sister
    {
      dialogueOrStory: "A: Who is she?\nB: She's my sister. She's pretty.",
      question: '두 사람이 이야기하고 있는 대상은 누구인가요?',
      questionKr: '두 사람이 이야기하고 있는 대상은 누구인가요?',
      options: [
        { type: 'image', content: 'mom' },
        { type: 'image', content: 'grandmother' },
        { type: 'image', content: 'sister' },
      ],
      correctAnswer: 'sister',
      isDialogue: true,
      evaluationTarget: '인물',
      speaker1: 'Who is she?',
      speaker2: 'She\'s my sister. She\'s pretty.',
    },
    // 문항 17: 모습 - raining
    {
      dialogueOrStory: "A: How's the weather?\nB: It's raining. Take an umbrella.",
      question: '창밖의 날씨는 어떠한가요?',
      questionKr: '창밖의 날씨는 어떠한가요?',
      options: [
        { type: 'image', content: 'sunny' },
        { type: 'image', content: 'raining' },
        { type: 'image', content: 'snowing' },
      ],
      correctAnswer: 'raining',
      isDialogue: true,
      evaluationTarget: '모습',
      speaker1: 'How\'s the weather?',
      speaker2: 'It\'s raining. Take an umbrella.',
    },
    // 문항 18: 크기 - a big ball
    {
      dialogueOrStory: "A: Do you have a ball?\nB: Yes. It's big.",
      question: '남학생이 설명하는 공의 크기는 어떠한가요?',
      questionKr: '남학생이 설명하는 공의 크기는 어떠한가요?',
      options: [
        { type: 'image', content: 'a small ball' },
        { type: 'image', content: 'a big ball' },
        { type: 'image', content: 'a big apple' },
      ],
      correctAnswer: 'a big ball',
      isDialogue: true,
      evaluationTarget: '크기',
      speaker1: 'Do you have a ball?',
      speaker2: 'Yes. It\'s big.',
    },
    // 문항 19: 색깔 - a green bag
    {
      dialogueOrStory: "A: What color is it?\nB: It's green.",
      question: '가방의 색깔로 알맞은 것을 고르세요.',
      questionKr: '가방의 색깔로 알맞은 것을 고르세요.',
      options: [
        { type: 'image', content: 'a red bag' },
        { type: 'image', content: 'a green bag' },
        { type: 'image', content: 'a pink bag' },
      ],
      correctAnswer: 'a green bag',
      isDialogue: true,
      evaluationTarget: '색깔',
      speaker1: 'What color is it?',
      speaker2: 'It\'s green.',
    },
    // 문항 20: 인물 - grandfather
    {
      dialogueOrStory: "A: Who is he?\nB: He's my grandfather.",
      question: '남학생이 소개하는 사람은 누구인가요?',
      questionKr: '남학생이 소개하는 사람은 누구인가요?',
      options: [
        { type: 'image', content: 'brother' },
        { type: 'image', content: 'dad' },
        { type: 'image', content: 'grandfather' },
      ],
      correctAnswer: 'grandfather',
      isDialogue: true,
      evaluationTarget: '인물',
      speaker1: 'Who is he?',
      speaker2: 'He\'s my grandfather.',
    },
  ];

  console.log('[p6_comprehension] 고정 문항 20개 로드 완료');
  
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
        // 고정 문항 20개 사용
        const fixedItems = await getFixedComprehensionItems();
        setItems(fixedItems);
        console.log('[p6_comprehension] 고정 문항 20개 로드 완료');
      } catch (error) {
        console.error('[p6_comprehension] 문항 로딩 오류:', error);
        const fixedItems = await getFixedComprehensionItems();
        setItems(fixedItems);
      }
    };
    setup();
  }, [router, supabase.auth]);

  // 텍스트를 파일명으로 변환 (화자별 음성 파일용)
  const textToFileName = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // 특수문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50);
  }, []);

  // 단일 음성 파일 재생 (사전 생성 파일 또는 TTS)
  const playSingleAudio = useCallback(async (text: string, speaker: 'A' | 'B' | null = null): Promise<void> => {
    // A 또는 B가 지정된 경우 p6_comprehension 폴더에서 파일 찾기
    let audioPath = '';
    if (speaker) {
      const fileName = `${speaker}_${textToFileName(text)}.mp3`;
      audioPath = `/audio/p6_comprehension/${fileName}`;
    } else {
      // 기존 방식: 전체 스토리 파일
      const safeFileName = text.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 50);
      audioPath = `/audio/p6_comprehension/${safeFileName}.mp3`;
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
          // Speaker A 재생
          try {
            await playSingleAudio(item.speaker1, 'A');
            // 화자 사이 간격
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.warn('[p6_comprehension] Speaker A 재생 실패:', error);
            // 계속 진행
          }

          // Speaker B 재생
          try {
            await playSingleAudio(item.speaker2, 'B');
          } catch (error) {
            console.warn('[p6_comprehension] Speaker B 재생 실패:', error);
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
          const word = textToFileName(option.content);
          const imagePath = `/images/p6_comprehension/${word}.png`;
          
          if (imageUrls[option.content]) {
            newImageUrls[option.content] = imageUrls[option.content];
          } else {
            // 이미지 로드 시도
            const img = new Image();
            img.onload = () => {
              setImageUrls(prev => ({ ...prev, [option.content]: imagePath }));
            };
            img.onerror = () => {
              console.warn(`[p6_comprehension] 이미지 파일 없음: ${option.content} -> ${imagePath}`);
            };
            img.src = imagePath;
            newImageUrls[option.content] = imagePath;
          }
        }
      });
      
      setImageUrls(prev => ({ ...prev, ...newImageUrls }));
    } catch (error) {
      console.error('[p6_comprehension] 이미지 로드 오류:', error);
    } finally {
      setIsLoadingImages(false);
    }
  }, [imageUrls, textToFileName]);

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
    fontFamily: 'var(--font-noto-sans-kr)',
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
                {/* 모르겠음 버튼 */}
                <button
                  onClick={() => handleAnswerSelect('모르겠음')}
                  style={{
                    ...(selectedAnswer === '모르겠음' ? selectedChoiceButtonStyle : choiceButtonStyle),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '1.5rem',
                  }}
                  disabled={isSubmitting || isAudioLoading || isLoadingImages}
                >
                  모르겠음
                </button>
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
