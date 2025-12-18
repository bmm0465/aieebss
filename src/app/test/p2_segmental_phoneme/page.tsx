'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

interface TestItem {
  id: number;
  type: 'minimal_pair' | 'phonics_letter';
  position: 'initial' | 'final';
  question?: string; // minimal_pair 타입용
  target_word?: string; // phonics_letter 타입용
  options: string[];
  answer: string;
}

// [폴백] 고정 문항 데이터
const getFixedTestItems = (): TestItem[] => {
  return [
    { id: 1, type: 'minimal_pair', position: 'initial', question: 'big / pig', options: ['big', 'pig'], answer: 'big' },
    { id: 2, type: 'phonics_letter', position: 'initial', target_word: 'apple', options: ['a', 'b', 'c'], answer: 'a' },
    { id: 3, type: 'minimal_pair', position: 'initial', question: 'cow / how', options: ['cow', 'how'], answer: 'cow' },
    { id: 4, type: 'phonics_letter', position: 'final', target_word: 'ball', options: ['r', 'l', 'b'], answer: 'l' },
    { id: 5, type: 'minimal_pair', position: 'final', question: 'fine / five', options: ['fine', 'five'], answer: 'fine' },
    { id: 6, type: 'phonics_letter', position: 'final', target_word: 'dog', options: ['k', 'h', 'g'], answer: 'g' },
    { id: 7, type: 'minimal_pair', position: 'initial', question: 'book / look', options: ['book', 'look'], answer: 'book' },
    { id: 8, type: 'phonics_letter', position: 'initial', target_word: 'game', options: ['j', 'g', 'h'], answer: 'g' },
    { id: 9, type: 'minimal_pair', position: 'initial', question: 'pen / ten', options: ['pen', 'ten'], answer: 'pen' },
    { id: 10, type: 'phonics_letter', position: 'initial', target_word: 'jump', options: ['g', 'j', 'z'], answer: 'j' },
    { id: 11, type: 'minimal_pair', position: 'initial', question: 'king / ring', options: ['king', 'ring'], answer: 'king' },
    { id: 12, type: 'phonics_letter', position: 'initial', target_word: 'wind', options: ['u', 'y', 'w'], answer: 'w' },
    { id: 13, type: 'minimal_pair', position: 'initial', question: 'cat / hat', options: ['cat', 'hat'], answer: 'cat' },
    { id: 14, type: 'phonics_letter', position: 'initial', target_word: 'door', options: ['t', 'd', 'b'], answer: 'd' },
    { id: 15, type: 'minimal_pair', position: 'final', question: 'sit / six', options: ['sit', 'six'], answer: 'sit' },
    { id: 16, type: 'phonics_letter', position: 'initial', target_word: 'right', options: ['r', 'l', 'y'], answer: 'r' },
    { id: 17, type: 'minimal_pair', position: 'initial', question: 'that / what', options: ['that', 'what'], answer: 'that' },
    { id: 18, type: 'phonics_letter', position: 'initial', target_word: 'tape', options: ['f', 't', 'p'], answer: 't' },
    { id: 19, type: 'minimal_pair', position: 'final', question: 'can / cat', options: ['can', 'cat'], answer: 'can' },
    { id: 20, type: 'phonics_letter', position: 'final', target_word: 'pink', options: ['t', 'c', 'k'], answer: 'k' },
    { id: 21, type: 'minimal_pair', position: 'initial', question: 'go / no', options: ['go', 'no'], answer: 'go' },
    { id: 22, type: 'phonics_letter', position: 'initial', target_word: 'potato', options: ['p', 'f', 't'], answer: 'p' },
    { id: 23, type: 'minimal_pair', position: 'initial', question: 'how / now', options: ['how', 'now'], answer: 'how' },
    { id: 24, type: 'phonics_letter', position: 'initial', target_word: 'violin', options: ['b', 'u', 'v'], answer: 'v' },
    { id: 25, type: 'minimal_pair', position: 'initial', question: 'do / go', options: ['do', 'go'], answer: 'do' },
    { id: 26, type: 'phonics_letter', position: 'final', target_word: 'swim', options: ['n', 'r', 'm'], answer: 'm' },
    { id: 27, type: 'minimal_pair', position: 'initial', question: 'at / it', options: ['at', 'it'], answer: 'at' },
    { id: 28, type: 'phonics_letter', position: 'final', target_word: 'cup', options: ['p', 'b', 'f'], answer: 'p' },
    { id: 29, type: 'minimal_pair', position: 'final', question: 'in / it', options: ['in', 'it'], answer: 'in' },
    { id: 30, type: 'phonics_letter', position: 'final', target_word: 'robot', options: ['d', 't', 'k'], answer: 't' },
    { id: 31, type: 'minimal_pair', position: 'initial', question: 'be / he', options: ['be', 'he'], answer: 'be' },
    { id: 32, type: 'phonics_letter', position: 'final', target_word: 'ten', options: ['m', 'n', 'l'], answer: 'n' },
    { id: 33, type: 'minimal_pair', position: 'final', question: 'nice / nine', options: ['nice', 'nine'], answer: 'nice' },
    { id: 34, type: 'phonics_letter', position: 'initial', target_word: 'zebra', options: ['j', 's', 'z'], answer: 'z' },
    { id: 35, type: 'minimal_pair', position: 'initial', question: 'ring / sing', options: ['ring', 'sing'], answer: 'ring' },
    { id: 36, type: 'phonics_letter', position: 'initial', target_word: 'egg', options: ['a', 'e', 'i'], answer: 'e' },
    { id: 37, type: 'minimal_pair', position: 'initial', question: 'she / the', options: ['she', 'the'], answer: 'she' },
    { id: 38, type: 'phonics_letter', position: 'final', target_word: 'red', options: ['t', 'b', 'd'], answer: 'd' },
    { id: 39, type: 'minimal_pair', position: 'final', question: 'not / now', options: ['not', 'now'], answer: 'not' },
    { id: 40, type: 'phonics_letter', position: 'initial', target_word: 'monkey', options: ['n', 'w', 'm'], answer: 'm' },
  ];
};

export default function PsfTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [items, setItems] = useState<TestItem[]>([]);
  const [itemIndex, setItemIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState<TestItem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const testStartTimeRef = React.useRef<number | null>(null); // 평가 시작 시간 기록

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
          setItems(dbItems.items as TestItem[]);
        } else {
          // 폴백: 고정 문항 사용
          console.log('[p2_segmental_phoneme] 승인된 문항이 없어 기본 문항 사용');
          setItems(getFixedTestItems());
        }
      } catch (error) {
        console.error('[p2_segmental_phoneme] 문항 로딩 오류, 기본 문항 사용:', error);
        setItems(getFixedTestItems());
      }
    };
    setup();
  }, [router, supabase.auth]);

  const playWordAudio = useCallback(async (word: string, itemType?: 'minimal_pair' | 'phonics_letter') => {
    setIsAudioLoading(true);
    try {
      // 타입에 따라 다른 폴더에서 음성 파일 로드
      const folder = itemType === 'phonics_letter' ? 'first-last-phoneme' : 'minimal-pairs';
      const audioPath = `/audio/p2_segmental_phoneme/${folder}/${word.toLowerCase()}.mp3`;
      const audio = new Audio(audioPath);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('오디오 재생 타임아웃'));
        }, 10000);
        
        audio.onended = () => {
          clearTimeout(timeout);
          resolve();
        };
        audio.onerror = (error) => {
          clearTimeout(timeout);
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
                const fallbackTimeout = setTimeout(() => {
                  URL.revokeObjectURL(audioUrl);
                  rejectFallback(new Error('TTS 오디오 재생 타임아웃'));
                }, 10000);
                
                fallbackAudio.onended = () => {
                  clearTimeout(fallbackTimeout);
                  URL.revokeObjectURL(audioUrl);
                  resolveFallback();
                };
                fallbackAudio.onerror = (fallbackError) => {
                  clearTimeout(fallbackTimeout);
                  URL.revokeObjectURL(audioUrl);
                  console.warn(`[p2_segmental_phoneme] TTS 오디오 재생 실패:`, fallbackError);
                  rejectFallback(fallbackError);
                };
                fallbackAudio.onloadeddata = () => {
                  fallbackAudio.play().catch((playError) => {
                    clearTimeout(fallbackTimeout);
                    URL.revokeObjectURL(audioUrl);
                    rejectFallback(playError);
                  });
                };
                fallbackAudio.load(); // 명시적으로 로드 시작
              });
            })
            .then(() => resolve())
            .catch(reject);
        };
        audio.onloadeddata = () => {
          // 파일이 완전히 로드된 후 재생
          audio.play().catch((playError) => {
            clearTimeout(timeout);
            console.warn(`[p2_segmental_phoneme] 재생 시작 실패, TTS로 폴백:`, playError);
            // TTS로 폴백 시도
            audio.onerror?.(playError);
          });
        };
        audio.load(); // 명시적으로 로드 시작
      });
    } catch (error) {
      console.error('오디오 재생 에러:', error);
      setFeedback('소리를 재생하는 데 문제가 생겼어요.');
    } finally {
      setIsAudioLoading(false);
    }
  }, []);

  const playCorrectAnswer = useCallback(async () => {
    if (!currentItem) return;
    setFeedback('정답을 들어보세요...');
    setIsAudioLoading(true);
    
    // 타입에 따라 다른 단어 재생
    if (currentItem.type === 'minimal_pair') {
      // minimal_pair: 정답 단어 재생
      await playWordAudio(currentItem.answer, 'minimal_pair');
    } else {
      // phonics_letter: target_word 재생
      if (currentItem.target_word) {
        await playWordAudio(currentItem.target_word, 'phonics_letter');
      }
    }
    
    // 문항 유형에 따라 적절한 피드백 메시지 설정
    if (currentItem.type === 'minimal_pair') {
      setFeedback('들어본 내용을 선택해주세요.');
    } else if (currentItem.type === 'phonics_letter') {
      if (currentItem.position === 'initial') {
        setFeedback('들어본 단어의 첫소리에 해당하는 알파벳을 선택해주세요.');
      } else {
        setFeedback('들어본 단어의 끝소리에 해당하는 알파벳을 선택해주세요.');
      }
    } else {
      setFeedback('들어본 내용을 선택해주세요.');
    }
    setIsAudioLoading(false);
  }, [currentItem, playWordAudio]);

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

      // 타입에 따라 다른 형식으로 제출
      let question: string;
      if (currentItem.type === 'minimal_pair') {
        question = currentItem.question || '';
      } else {
        question = currentItem.target_word || '';
      }

      // 평가 시작 시간부터 현재까지 경과 시간 계산 (초 단위)
      const elapsedSeconds = testStartTimeRef.current 
        ? Math.floor((Date.now() - testStartTimeRef.current) / 1000)
        : 0;

      const response = await fetch('/api/submit-p2_segmental_phoneme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          selectedAnswer: answer,
          correctAnswer: currentItem.answer,
          userId: user.id,
          authToken: authUser.id,
          itemType: currentItem.type,
          timeTaken: elapsedSeconds,
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
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('[p2_segmental_phoneme] 제출 오류:', error);
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

      // 잘못된 답안으로 저장 (첫 번째 옵션을 선택한 것으로 처리)
      const wrongAnswer = currentItem.options[0] === currentItem.answer ? currentItem.options[1] : currentItem.options[0];
      
      let question: string;
      if (currentItem.type === 'minimal_pair') {
        question = currentItem.question || '';
      } else {
        question = currentItem.target_word || '';
      }
      
      const response = await fetch('/api/submit-p2_segmental_phoneme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          selectedAnswer: wrongAnswer,
          correctAnswer: currentItem.answer,
          userId: user.id,
          authToken: authUser.id,
          skip: true, // 넘어가기 플래그
          itemType: currentItem.type,
          timeTaken: testStartTimeRef.current 
            ? Math.floor((Date.now() - testStartTimeRef.current) / 1000)
            : 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[p2_segmental_phoneme] 넘어가기 저장 실패:', response.status, errorData);
      }

      setFeedback('다음 문제로 넘어갑니다.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);
    } catch (error) {
      console.error('[p2_segmental_phoneme] 넘어가기 오류:', error);
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
    setTimeLeft(120);
    setCurrentItem(items[0]);
    testStartTimeRef.current = Date.now(); // 평가 시작 시간 기록
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
        {phase !== 'finished' && <h1 style={titleStyle}>2교시: 단어를 듣고 올바른 단어 또는 알파벳 고르기</h1>}

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
              1. 단어를 들려드립니다. 들려준 단어를 선택해주세요.
              <br />
              (예: &quot;pin&quot;을 들려주면, &quot;pin&quot;을 선택합니다)
              <br />
              <br />
              2. 단어를 들려드립니다. 들려준 단어의 첫소리 또는 끝소리에 해당하는 알파벳을 선택해주세요.
              <br />
              (예: &quot;green&quot;을 들려주면, 단어의 첫소리는 &quot;g&quot;, 끝소리는 &quot;n&quot;을 선택합니다)
            </p>
            <button onClick={handleStartTest} style={buttonStyle}>
              평가 시작하기
            </button>
          </div>
        )}

        {phase === 'testing' && currentItem && (
          <div>
            <button
              onClick={playCorrectAnswer}
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
              {isAudioLoading ? '재생 중...' : '🔊 듣기'}
            </button>
            <p style={feedbackStyle}>
              {feedback || (
                currentItem.type === 'minimal_pair' 
                  ? '단어를 듣고, 들리는 단어를 선택해주세요.' 
                  : currentItem.position === 'initial'
                    ? '단어를 듣고, 첫소리에 해당하는 알파벳을 선택해주세요.'
                    : '단어를 듣고, 끝소리에 해당하는 알파벳을 선택해주세요.'
              )}
            </p>
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '2rem' }}>
                {currentItem.type === 'minimal_pair' ? (
                  // minimal_pair: 두 단어 버튼
                  <>
                    <button
                      onClick={() => handleAnswerSelect(currentItem.options[0])}
                      style={selectedAnswer === currentItem.options[0] ? selectedWordButtonStyle : wordButtonStyle}
                      disabled={isSubmitting || isAudioLoading}
                    >
                      {currentItem.options[0]}
                    </button>
                    <button
                      onClick={() => handleAnswerSelect(currentItem.options[1])}
                      style={selectedAnswer === currentItem.options[1] ? selectedWordButtonStyle : wordButtonStyle}
                      disabled={isSubmitting || isAudioLoading}
                    >
                      {currentItem.options[1]}
                    </button>
                  </>
                ) : (
                  // phonics_letter: 알파벳 버튼들
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', width: '100%' }}>
                      {currentItem.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(option)}
                          style={selectedAnswer === option ? selectedWordButtonStyle : wordButtonStyle}
                          disabled={isSubmitting || isAudioLoading}
                        >
                          {option.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
        )}

        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>평가 종료!</h1>
            <p style={paragraphStyle}>
              {feedback || "2교시 평가가 끝났습니다. 수고 많으셨습니다!"}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <button style={{ ...buttonStyle, maxWidth: '250px' }} onClick={() => router.push('/test/p3_suprasegmental_phoneme')}>
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
