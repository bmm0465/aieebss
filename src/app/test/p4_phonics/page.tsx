'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

type ReadingPhase = 'nwf' | 'wrf' | 'orf';
type TestPhase = 'ready' | 'testing' | 'finished';

// [폴백] NWF 고정 문항 (무의미 단어)
const getFixedNonsenseWords = () => {
  return [
    'sep', 'het', 'tum', 'lut', 'dit', 'reg', 'fet', 'pom', 'teb', 'gid'
  ];
};

// [폴백] WRF 고정 문항 (천재교과서 함 - 강세 명확한 단어, 2음절 이상)
const getFixedSightWords = () => {
  return [
    'apple', 'banana', 'brother', 'carrot', 'chicken', 'color', 'elephant', 'eraser', 'flower', 'grandfather'
  ];
};

// [폴백] ORF 고정 문장 (천재교과서 함 - 핵심 표현, 2개 단어 이상)
const getFixedSentences = () => {
  return [
    "I'm Momo",
    'How are you?',
    "What's this",
    "It's a bike",
    "It's a robot",
    'Sit down, please',
    'Open the door, please',
    'Thank you',
    "You're welcome",
    'How many cows?',
  ];
};

export default function ReadingTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [testPhase, setTestPhase] = useState<TestPhase>('ready');
  const [readingPhase, setReadingPhase] = useState<ReadingPhase>('nwf');
  const [nwfWords, setNwfWords] = useState<string[]>([]);
  const [wrfWords, setWrfWords] = useState<string[]>([]);
  const [orfSentences, setOrfSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isMediaReady, setIsMediaReady] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);

      try {
        // p4_items.json에서 문항 로드 시도
        const response = await fetch('/data/p4_items.json');
        if (response.ok) {
          const jsonItems = await response.json();
          console.log('[p4_phonics] p4_items.json에서 문항 로드');
          if (jsonItems.nwf && Array.isArray(jsonItems.nwf)) {
            setNwfWords(jsonItems.nwf.slice(0, 5));
          } else {
            setNwfWords(getFixedNonsenseWords().slice(0, 5));
          }
          if (jsonItems.wrf && Array.isArray(jsonItems.wrf)) {
            setWrfWords(jsonItems.wrf.slice(0, 5));
          } else {
            setWrfWords(getFixedSightWords().slice(0, 5));
          }
          if (jsonItems.orf && Array.isArray(jsonItems.orf)) {
            setOrfSentences(jsonItems.orf.slice(0, 5));
          } else {
            setOrfSentences(getFixedSentences().slice(0, 5));
          }
        } else {
          // DB에서 승인된 문항 조회 시도
          const gradeLevel = await getUserGradeLevel(user.id);
          const phonicsItems = await fetchApprovedTestItems('p4_phonics', gradeLevel || undefined);
          if (phonicsItems && phonicsItems.items && typeof phonicsItems.items === 'object') {
            const items = phonicsItems.items as { nwf?: string[]; wrf?: string[]; orf?: string[] };
            if (items.nwf && Array.isArray(items.nwf)) {
              setNwfWords(items.nwf.slice(0, 5));
            } else {
              setNwfWords(getFixedNonsenseWords().slice(0, 5));
            }
            if (items.wrf && Array.isArray(items.wrf)) {
              setWrfWords(items.wrf.slice(0, 5));
            } else {
              setWrfWords(getFixedSightWords().slice(0, 5));
            }
            if (items.orf && Array.isArray(items.orf)) {
              setOrfSentences(items.orf.slice(0, 5));
            } else {
              setOrfSentences(getFixedSentences().slice(0, 5));
            }
          } else {
            // 폴백: 고정 문항 사용
            setNwfWords(getFixedNonsenseWords().slice(0, 5));
            setWrfWords(getFixedSightWords().slice(0, 5));
            setOrfSentences(getFixedSentences().slice(0, 5));
          }
        }
      } catch (error) {
        console.error('[Reading] 문항 로딩 오류, 기본 문항 사용:', error);
        setNwfWords(getFixedNonsenseWords());
        setWrfWords(getFixedSightWords());
        setOrfSentences(getFixedSentences());
      }

      prepareMediaRecorder();
    };
    setup();
  }, [router, supabase.auth]);

  const prepareMediaRecorder = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setIsMediaReady(true);
        setFeedback('마이크가 준비되었습니다!');
      } catch (err) {
        console.error('마이크 준비 에러:', err);
        setFeedback('마이크를 사용할 수 없어요. 브라우저 설정을 확인해주세요.');
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsSubmitting(true);
      setFeedback('🎵 녹음 완료! 처리 중...');
    }
  }, []);

  const goToNextItem = useCallback(() => {
    let currentItems: string[] = [];
    if (readingPhase === 'nwf') currentItems = nwfWords;
    else if (readingPhase === 'wrf') currentItems = wrfWords;
    else currentItems = orfSentences;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= currentItems.length) {
      // 현재 단계 완료, 다음 단계로
      setIsSubmitting(false); // phase 전환 시 상태 초기화
      if (readingPhase === 'nwf') {
        setReadingPhase('wrf');
        setCurrentIndex(0);
        setCurrentItem(wrfWords[0] || '');
        setFeedback('이제 실제 단어를 읽어주세요.');
      } else if (readingPhase === 'wrf') {
        setReadingPhase('orf');
        setCurrentIndex(0);
        setCurrentItem(orfSentences[0] || '');
        setFeedback('이제 문장을 읽어주세요.');
      } else {
        setTestPhase('finished');
      }
    } else {
      setCurrentIndex(nextIndex);
      setCurrentItem(currentItems[nextIndex]);
      setIsSubmitting(false);
      setFeedback('');
    }
  }, [readingPhase, nwfWords, wrfWords, orfSentences, currentIndex]);

  const handleSkip = useCallback(async () => {
    if (isSubmitting || !user || !currentItem || isRecording) return;
    
    setIsSubmitting(true);
    setFeedback('넘어가는 중...');
    
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        setFeedback('인증이 필요합니다.');
        setIsSubmitting(false);
        return;
      }

      // 빈 오디오 Blob을 보내서 오답으로 저장 (넘어가기 플래그 포함)
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', emptyBlob);
      formData.append('question', currentItem);
      formData.append('testType', readingPhase.toUpperCase());
      formData.append('userId', user.id);
      formData.append('authToken', authUser.id);
      formData.append('skip', 'true'); // 넘어가기 플래그
      
      // API 호출 (결과를 기다리지 않음)
      fetch('/api/submit-p4_phonics', { method: 'POST', body: formData })
        .catch(error => {
          console.error('[p4_phonics] 넘어가기 저장 실패:', error);
        });
      
      setFeedback('다음 문제로 넘어갑니다.');
      
      setTimeout(() => {
        goToNextItem();
        setIsSubmitting(false);
        setFeedback('');
      }, 500);
    } catch (error) {
      console.error('[p4_phonics] 넘어가기 오류:', error);
      setFeedback('오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  }, [user, currentItem, readingPhase, isSubmitting, isRecording, supabase, goToNextItem]);

  const submitRecording = useCallback(async (audioBlob: Blob) => {
    if (!user || !currentItem) {
      setIsSubmitting(false);
      return;
    }

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      setFeedback('인증이 필요합니다.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', currentItem);
    formData.append('testType', readingPhase.toUpperCase());
    formData.append('userId', user.id);
    formData.append('authToken', authUser.id);
    
    try {
      fetch('/api/submit-p4_phonics', { method: 'POST', body: formData })
        .catch(error => {
          console.error('Reading 요청 전송 실패:', error);
        });
      
      setFeedback('좋아요! 다음 문제예요.');
      
      setTimeout(() => {
        goToNextItem();
      }, 500);

    } catch (error) {
      console.error('Reading 요청 전송 실패:', error);
      setFeedback('요청 전송 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  }, [user, currentItem, readingPhase, supabase, goToNextItem]);

  const startRecording = useCallback(async () => {
    setFeedback('');
    
    try {
      let stream = streamRef.current;
      
      if (!stream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
      
      if (!stream) {
        throw new Error('마이크 스트림을 가져올 수 없습니다.');
      }
      
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) {
          setFeedback('녹음이 제대로 되지 않았습니다. 다시 시도해주세요.');
          setIsSubmitting(false);
          return;
        }
        submitRecording(audioBlob);
      };
      
      mediaRecorder.start();
      readingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setFeedback('🎤 녹음 중... 읽어주세요!');
      
      silenceTimeoutRef.current = setTimeout(() => {
        setFeedback('시간이 다 되어서 녹음을 종료합니다.');
        stopRecording();
      }, 5000);
      
    } catch (err) {
      console.error('마이크 접근 에러:', err);
      setFeedback('마이크를 사용할 수 없어요. 브라우저 설정을 확인해주세요.');
    }
  }, [stopRecording, submitRecording]);

  useEffect(() => {
    if (testPhase === 'testing') {
      if (readingPhase === 'nwf' && nwfWords.length > 0) {
        setCurrentItem(nwfWords[0]);
      } else if (readingPhase === 'wrf' && wrfWords.length > 0) {
        setCurrentItem(wrfWords[0]);
      } else if (readingPhase === 'orf' && orfSentences.length > 0) {
        setCurrentItem(orfSentences[0]);
      }
    }
  }, [testPhase, readingPhase, nwfWords, wrfWords, orfSentences]);

  useEffect(() => {
    if (testPhase !== 'testing' || timeLeft <= 0 || isSubmitting) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [testPhase, timeLeft, isSubmitting]);

  useEffect(() => {
    if (timeLeft <= 0 && testPhase === 'testing') {
      if (isRecording) {
        stopRecording();
        setTimeout(() => {
          setTestPhase('finished');
        }, 2000);
      } else {
        setTestPhase('finished');
      }
    }
  }, [timeLeft, testPhase, isRecording, stopRecording]);

  useEffect(() => {
    if (timeLeft <= 10 && timeLeft > 0 && testPhase === 'testing') {
      setFeedback(`${timeLeft}초 후 종료됩니다.`);
    } else if (timeLeft <= 0 && testPhase === 'testing') {
      setFeedback('');
    }
  }, [timeLeft, testPhase]);

  const handleStartTest = () => {
    setTestPhase('testing');
    setReadingPhase('nwf');
    setCurrentIndex(0);
    setTimeLeft(60);
    setCurrentItem(nwfWords[0] || '');
    setFeedback('무의미 단어를 읽어주세요.');
  };

  const getPhaseTitle = () => {
    return '4교시: 마법 주문 읽기 시험';
  };

  const getPhaseDescription = () => {
    if (readingPhase === 'nwf') return '무의미 단어를 파닉스 규칙에 따라 읽어주세요.';
    if (readingPhase === 'wrf') return '실제 단어를 정확하게 읽어주세요.';
    return '문장을 자연스럽게 읽어주세요.';
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
  const wordBoxStyle: React.CSSProperties = {
    fontSize: readingPhase === 'orf' ? '2.5rem' : '8rem',
    fontWeight: 'bold',
    margin: '2rem 0',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    minHeight: '250px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    lineHeight: 1.5,
  };
  const feedbackStyle: React.CSSProperties = {
    minHeight: '2.5em',
    fontSize: '1.1rem',
    color: '#171717',
    padding: '0 1rem',
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
        {testPhase !== 'finished' && <h1 style={titleStyle}>{getPhaseTitle()}</h1>}

        {testPhase === 'testing' && (
          <div>
            <div style={timerStyle}>
              남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초
              {isSubmitting && <span style={{ marginLeft: '1rem', color: '#ccc' }}>(일시정지)</span>}
            </div>
          </div>
        )}

        {testPhase === 'ready' && (
          <div>
            <p style={paragraphStyle}>
              소리와 철자의 관계를 이해하며 단어와 문장을 읽는 능력을 평가합니다.
              <br />
              무의미 단어 → 실제 단어 → 문장 순서로 진행됩니다.
            </p>
            <p style={{ ...feedbackStyle, color: isMediaReady ? '#90EE90' : '#FFB6C1' }}>
              {isMediaReady ? '🎤 마이크가 준비되었습니다!' : '🎤 마이크를 준비하고 있습니다...'}
            </p>
            <button
              onClick={handleStartTest}
              style={{ ...buttonStyle, opacity: isMediaReady ? 1 : 0.7 }}
              disabled={!isMediaReady}
            >
              {isMediaReady ? '시험 시작하기' : '마이크 준비 중...'}
            </button>
          </div>
        )}

        {testPhase === 'testing' && (
          <div>
            <div style={wordBoxStyle}>{currentItem}</div>
            <p style={feedbackStyle}>{feedback || getPhaseDescription()}</p>
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                {!isRecording ? (
                  <button onClick={startRecording} style={buttonStyle} disabled={isSubmitting}>
                    {isSubmitting ? '처리 중...' : '읽기 시작'}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    style={{ ...buttonStyle, backgroundColor: '#dc3545', color: 'white' }}
                  >
                    읽기 끝내기
                  </button>
                )}
              </div>
              
              {!isRecording && (
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
                  disabled={isSubmitting}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
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
              )}
            </div>
          </div>
        )}

        {testPhase === 'finished' && (
          <div>
            <h1 style={titleStyle}>시험 종료!</h1>
            <p style={paragraphStyle}>
              {feedback || '통합 읽기 평가가 끝났습니다. 수고 많으셨습니다!'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <button
                style={{ ...buttonStyle, maxWidth: '250px' }}
                onClick={() => router.push('/test/p5_vocabulary')}
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

        {testPhase === 'testing' && (
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

