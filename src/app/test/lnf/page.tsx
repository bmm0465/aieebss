'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

// 시험에 사용될 알파벳 목록 (매번 새롭게 섞음)
const getShuffledAlphabet = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    return alphabet.sort(() => 0.5 - Math.random());
};

export default function LnfTestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready'); // ready, practice, testing, finished
  const [shuffledAlphabet, setShuffledAlphabet] = useState<string[]>([]);
  const [letterIndex, setLetterIndex] = useState(0);
  const [currentLetter, setCurrentLetter] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 연속 클릭 방지 및 타이머 제어용
  const [timeLeft, setTimeLeft] = useState(90);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 로그인 상태 확인 및 알파벳 섞기
  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
      } else {
        setUser(user);
        setShuffledAlphabet(getShuffledAlphabet());
      }
    };
    setup();
  }, [router]);

  // [핵심 수정] 타이머 로직: isSubmitting이 false일 때만 작동하도록 변경
  useEffect(() => {
    // 시험 중이 아니거나, 시간이 다 됐거나, 처리 중일 때는 타이머를 작동시키지 않음
    if (phase !== 'testing' || timeLeft <= 0 || isSubmitting) {
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    // isSubmitting 상태가 true로 바뀌면 이 cleanup 함수가 실행되어 타이머가 멈춤
    return () => clearInterval(timerId);
  }, [phase, timeLeft, isSubmitting]); // isSubmitting을 의존성 배열에 추가
  
  // 시간 종료 처리
  useEffect(() => {
    if (timeLeft <= 0 && phase === 'testing') {
        if (isRecording) {
            stopRecording();
        }
        setPhase('finished');
    }
  }, [timeLeft, phase, isRecording]);

  const goToNextLetter = () => {
    const nextIndex = letterIndex + 1;
    if (nextIndex >= shuffledAlphabet.length) {
      setPhase('finished');
    } else {
      setLetterIndex(nextIndex);
      setCurrentLetter(shuffledAlphabet[nextIndex]);
    }
  };

  const startRecording = async () => {
    setFeedback('');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 0) {
            if (phase === 'testing') {
              goToNextLetter();
              setFeedback("좋아요! 다음 문제예요.");
            }
            submitRecordingInBackground(audioBlob);
          } else {
            setIsSubmitting(false);
          }
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);

        if (phase === 'testing') {
            silenceTimeoutRef.current = setTimeout(() => {
                setFeedback("3초 동안 답변이 없어 다음 문제로 넘어갑니다.");
                stopRecording();
            }, 3000);
        }
      } catch (err) {
        console.error("마이크 접근 에러:", err);
        setFeedback("마이크를 사용할 수 없어요. 브라우저 설정을 확인해주세요.");
      }
    }
  };

  const stopRecording = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsSubmitting(true); // 타이머를 멈추기 위해 상태 변경
    }
  };

  const submitRecordingInBackground = async (audioBlob: Blob) => {
    if (!user || !currentLetter) {
        setIsSubmitting(false);
        return;
    };
    
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', currentLetter);
    formData.append('userId', user.id);

    try {
      const response = await fetch('/api/submit-lnf', { method: 'POST', body: formData });
      if (!response.ok) throw new Error((await response.json()).error || 'API 요청 실패');
      
      const result = await response.json();
      console.log('백그라운드 처리 성공:', result);

      if (phase === 'practice') {
        setFeedback(`음성인식 결과: "${result.studentAnswer}"`);
      }

    } catch (error) {
      console.error('백그라운드 처리 에러:', error);
    } finally {
      setIsSubmitting(false); // 타이머를 다시 시작하기 위해 상태 변경
    }
  };

  const handleStartPractice = () => {
    setPhase('practice');
    setCurrentLetter('A');
    setFeedback('연습 삼아 "에이"라고 말해보세요.');
  };
  
  const handleStartTest = () => {
    setPhase('testing');
    setLetterIndex(0);
    setCurrentLetter(shuffledAlphabet[0]);
    setTimeLeft(90);
    setFeedback("룬 문자의 이름을 말하고 녹음을 끝내세요.");
  };
  
  const handleReturnToReady = () => {
    setPhase('ready');
    setFeedback('');
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = {
    backgroundImage: `url('/background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    padding: '2rem',
    color: 'white',
    fontFamily: 'sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '3rem',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    textAlign: 'center',
  };

  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    fontFamily: 'var(--font-nanum-pen)',
    fontSize: '2.8rem',
    marginBottom: '2rem',
    color: '#FFD700',
    textShadow: '0 0 10px #FFD700'
  };

  const paragraphStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    lineHeight: 1.7,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '2.5rem',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '300px',
    padding: '15px',
    backgroundColor: '#FFD700',
    color: 'black',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    textAlign: 'center',
    transition: 'background-color 0.3s, transform 0.2s',
  };

  const letterBoxStyle: React.CSSProperties = {
    fontSize: '12rem',
    fontWeight: 'bold',
    margin: '2rem 0',
    color: '#FFD700',
    textShadow: '0 0 20px #FFD700',
    minHeight: '250px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const feedbackStyle: React.CSSProperties = {
    minHeight: '2.5em',
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.8)',
    padding: '0 1rem',
  };

  const timerStyle: React.CSSProperties = {
      fontSize: '1.5rem',
      color: '#FFD700',
      marginBottom: '1rem',
      fontFamily: 'monospace',
  };
  
  if (!user) {
    return (
      <div style={pageStyle}>
        <h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2>
      </div>
    );
  }
  
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>1교시: 고대 룬 문자 해독 시험</h1>}
        
        {phase === 'testing' && (
            <div style={timerStyle}>
              남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초
              {isSubmitting && <span style={{ marginLeft: '1rem', color: '#ccc' }}>(일시정지)</span>}
            </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>
              비석에 나타나는 고대 룬 문자의 이름을 정확하고 빠르게 읽어내야 합니다.<br/>
              시험을 시작하기 전에 마이크가 잘 작동하는지 연습해볼까요?
            </p>
            <button onClick={handleStartPractice} style={buttonStyle}>연습 시작하기</button>
            <button onClick={handleStartTest} style={{...buttonStyle, marginTop: '1rem', backgroundColor: 'transparent', border: '2px solid #FFD700', color: '#FFD700'}}>
              바로 시험 시작하기
            </button>
          </div>
        )}

        {(phase === 'practice' || phase === 'testing') && (
          <div>
            <div style={letterBoxStyle}>{currentLetter}</div>
            <p style={feedbackStyle}>{feedback}</p>
            
            {!isRecording ? (
              <button onClick={startRecording} style={buttonStyle} disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : '녹음하기'}
              </button>
            ) : (
              <button onClick={stopRecording} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>
                녹음 끝내기
              </button>
            )}

            {phase === 'practice' && !isRecording && (
                <button onClick={handleReturnToReady} style={{...buttonStyle, marginTop: '1rem', backgroundColor: 'transparent', border: '2px solid #FFD700', color: '#FFD700'}}>
                    안내로 돌아가기
                </button>
            )}
          </div>
        )}

        {phase === 'finished' && (
            <div>
                <h1 style={titleStyle}>시험 종료!</h1>
                <p style={paragraphStyle}>1교시 '고대 룬 문자 해독 시험'이 끝났습니다. 수고 많으셨습니다!<br/>모든 시험 결과는 마지막에 함께 공개됩니다.</p>
                <button style={buttonStyle} onClick={() => router.push('/test/psf')}>
  다음 시험으로 이동
</button>
            </div>
        )}
      </div>
    </div>
  );
}