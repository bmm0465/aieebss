'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

interface ComprehensionOption {
  type: 'image' | 'word';
  content: string;
}

interface ComprehensionItem {
  dialogueOrStory: string;
  question: string;
  questionKr?: string; // 한국어 질문 (선택적)
  options: ComprehensionOption[];
  correctAnswer: string;
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

// 영어 보기를 한국어로 번역하는 매핑
const optionTranslations: Record<string, string> = {
  'blue ball': '파란 공',
  'red car': '빨간 자동차',
  'small yellow cat': '작은 노란 고양이',
  'blue': '파란색',
  'red': '빨간색',
  'yellow': '노란색',
  'white': '하얀색',
  'black': '검은색',
  'brown': '갈색',
  'big': '큰',
  'small': '작은',
  'tiny': '아주 작은',
};

function translateOption(option: string): string {
  return optionTranslations[option] || option;
}

// 영어 질문을 한국어로 번역하는 간단한 매핑
const questionTranslations: Record<string, string> = {
  'What does Tom have?': 'Tom은 무엇을 가지고 있나요?',
  'What color is the ball?': '공은 무슨 색인가요?',
  'What color is the cat?': '고양이는 무슨 색인가요?',
  'How big is the dog?': '강아지의 크기는 어떠한가요?',
  'What does he have?': '그는 무엇을 가지고 있나요?',
  'What color is it?': '그것은 무슨 색인가요?',
  'How big is it?': '그것의 크기는 어떠한가요?',
};

function translateQuestion(question: string): string {
  return questionTranslations[question] || question;
}

// [폴백] COMPREHENSION 고정 문항
const getFixedComprehensionItems = (): ComprehensionItem[] => {
  return [
    {
      dialogueOrStory: 'This is my friend, Tom. He has a big, blue ball.',
      question: 'What does Tom have?',
      questionKr: 'Tom은 무엇을 가지고 있나요?',
      options: [
        { type: 'word' as const, content: 'blue ball' },
        { type: 'word' as const, content: 'red car' },
        { type: 'word' as const, content: 'small yellow cat' },
      ],
      correctAnswer: 'blue ball',
    },
    {
      dialogueOrStory: 'This is my friend, Tom. He has a big, blue ball.',
      question: 'What color is the ball?',
      questionKr: '공은 무슨 색인가요?',
      options: [
        { type: 'word' as const, content: 'blue' },
        { type: 'word' as const, content: 'red' },
        { type: 'word' as const, content: 'yellow' },
      ],
      correctAnswer: 'blue',
    },
    {
      dialogueOrStory: 'I see a cat. It is small and white.',
      question: 'What color is the cat?',
      questionKr: '고양이는 무슨 색인가요?',
      options: [
        { type: 'word' as const, content: 'white' },
        { type: 'word' as const, content: 'black' },
        { type: 'word' as const, content: 'brown' },
      ],
      correctAnswer: 'white',
    },
    {
      dialogueOrStory: 'Look at the dog. It is big and brown.',
      question: 'How big is the dog?',
      questionKr: '강아지의 크기는 어떠한가요?',
      options: [
        { type: 'word' as const, content: 'big' },
        { type: 'word' as const, content: 'small' },
        { type: 'word' as const, content: 'tiny' },
      ],
      correctAnswer: 'big',
    },
  ];
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

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);

      try {
        // p6_items.json에서 문항 로드 시도
        const response = await fetch('/data/p6_items.json');
        if (response.ok) {
          const jsonItems = await response.json();
          console.log('[p6_comprehension] p6_items.json에서 문항 로드:', jsonItems.length, '개');
          
          // p6_items.json 형식을 ComprehensionItem 형식으로 변환
          const convertedItems: ComprehensionItem[] = (jsonItems as P6JsonItem[]).map((item: P6JsonItem) => {
            const correctOption = item.options.find((opt: P6JsonOption) => opt.isCorrect);
            return {
              dialogueOrStory: `${item.script.speaker1} ${item.script.speaker2}`,
              question: item.question.includes('묘사하는 내용') 
                ? 'What is being described?' 
                : item.question,
              questionKr: item.question,
              options: item.options.map((opt: P6JsonOption) => ({
                type: 'word' as const,
                content: opt.description
              })),
              correctAnswer: correctOption ? correctOption.description : ''
            };
          });
          
          setItems(convertedItems);
        } else {
          // DB에서 승인된 문항 조회 시도
          const gradeLevel = await getUserGradeLevel(user.id);
          const dbItems = await fetchApprovedTestItems('p6_comprehension', gradeLevel || undefined);

          if (dbItems && Array.isArray(dbItems.items)) {
            console.log('[p6_comprehension] DB에서 승인된 문항 사용:', dbItems.items.length, '개');
            setItems(dbItems.items as ComprehensionItem[]);
          } else {
            console.log('[p6_comprehension] 승인된 문항이 없어 기본 문항 사용');
            setItems(getFixedComprehensionItems());
          }
        }
      } catch (error) {
        console.error('[p6_comprehension] 문항 로딩 오류, 기본 문항 사용:', error);
        setItems(getFixedComprehensionItems());
      }
    };
    setup();
  }, [router, supabase.auth]);

  const playStoryAudio = useCallback(async (story: string) => {
    setIsAudioLoading(true);
    try {
      // 사전 생성된 오디오 파일 사용 시도
      const safeFileName = story.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 50);
      const audioPath = `/audio/comprehension/${safeFileName}.mp3`;
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
            body: JSON.stringify({ text: story }),
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
          skip: true, // 넘어가기 플래그
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
  const choiceButtonStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '300px',
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
  const storyDisplayStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: '1rem 0',
    color: '#6366f1',
    lineHeight: 1.6,
    minHeight: '60px',
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
        {phase !== 'finished' && <h1 style={titleStyle}>6교시: 고대 전설 이해 시험</h1>}

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
              짧은 대화나 이야기를 듣거나 읽고, 질문에 맞는 답을 선택해주세요.
              <br />
              (예: &quot;Tom has a big, blue ball&quot;을 듣고, &quot;What color is the ball?&quot;에 &quot;blue&quot;를 선택)
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
                onClick={() => playStoryAudio(currentItem.dialogueOrStory)}
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
            {showText && <div style={storyDisplayStyle}>{currentItem.dialogueOrStory}</div>}
            <div style={questionDisplayStyle}>
              {currentItem.questionKr || translateQuestion(currentItem.question)}
            </div>
            <p style={feedbackStyle}>{feedback || '알맞은 답을 선택해주세요.'}</p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center',
                marginTop: '2rem',
              }}
            >
              {currentItem.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option.content)}
                  style={selectedAnswer === option.content ? selectedChoiceButtonStyle : choiceButtonStyle}
                  disabled={isSubmitting || isAudioLoading}
                >
                  {translateOption(option.content)}
                </button>
              ))}
              
              <button
                onClick={handleSkip}
                style={{
                  ...buttonStyle,
                  backgroundColor: 'rgba(108, 117, 125, 0.8)',
                  color: 'white',
                  maxWidth: '300px',
                  marginTop: '1rem',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                disabled={isSubmitting || isAudioLoading}
              >
                {isSubmitting ? '처리 중...' : '넘어가기'}
              </button>
            </div>
          </div>
        )}

        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>시험 종료!</h1>
            <p style={paragraphStyle}>
              {feedback || "6교시 '고대 전설 이해 시험'이 끝났습니다. 수고 많으셨습니다!"}
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

