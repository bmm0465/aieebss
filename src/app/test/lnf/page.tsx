'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

const getShuffledAlphabet = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    return alphabet.sort(() => 0.5 - Math.random());
};

export default function LnfTestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [shuffledAlphabet, setShuffledAlphabet] = useState<string[]>([]);
  const [letterIndex, setLetterIndex] = useState(0);
  const [currentLetter, setCurrentLetter] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const [letterSoundPromptUsed, setLetterSoundPromptUsed] = useState(false);
  const [firstTenCorrectCount, setFirstTenCorrectCount] = useState(0);
  const [isHesitation, setIsHesitation] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/');
      else {
        setUser(user);
        setShuffledAlphabet(getShuffledAlphabet());
      }
    };
    setup();
  }, [router]);
  
  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0 || isSubmitting) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [phase, timeLeft, isSubmitting]);

  useEffect(() => {
    if (timeLeft <= 0 && phase === 'testing') {
      if (isRecording) stopRecording();
      setPhase('finished');
    }
  }, [timeLeft, phase, isRecording]);

  const goToNextLetter = () => {
    if (letterIndex === 9 && firstTenCorrectCount === 0) {
      setFeedback("첫 10개의 문자 중 정답이 없어 시험을 중단합니다.");
      setPhase('finished');
      return;
    }
    const nextIndex = letterIndex + 1;
    if (nextIndex >= shuffledAlphabet.length) {
      setPhase('finished');
    } else {
      setLetterIndex(nextIndex);
      setCurrentLetter(shuffledAlphabet[nextIndex]);
      setFeedback("다음 룬 문자를 해독해 보세요!");
    }
  };

  const startRecording = async () => {
    setFeedback('');
    setIsHesitation(false);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const options = { mimeType: 'audio/webm;codecs=opus' };
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 0) {
            submitRecordingInBackground(audioBlob);
          } else if (isHesitation) {
            submitRecordingInBackground(audioBlob, true);
          } else {
            setIsSubmitting(false);
          }
        };
        mediaRecorder.start();
        setIsRecording(true);
        silenceTimeoutRef.current = setTimeout(() => {
          setIsHesitation(true);
          stopRecording();
        }, 3000);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setIsSubmitting(true);
    }
  };

  const submitRecordingInBackground = async (audioBlob: Blob, fromHesitation = false) => {
    if (!user || !currentLetter) {
      setIsSubmitting(false);
      return;
    }
    if (fromHesitation) {
        processEvaluation('hesitation');
        setIsSubmitting(false);
        return;
    }
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', currentLetter);
    formData.append('userId', user.id);
    try {
      const response = await fetch('/api/submit-lnf', { method: 'POST', body: formData });
      if (!response.ok) throw new Error((await response.json()).error);
      const result = await response.json();
      console.log('LNF 백그라운드 처리 성공:', result);
      processEvaluation(result.evaluation);
    } catch (error) {
      console.error('LNF 백그라운드 처리 에러:', error);
      setFeedback("채점 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const processEvaluation = (evaluation: string) => {
    let nextStepDelay = 1500;
    if (evaluation === 'correct') {
      if (letterIndex < 10) setFirstTenCorrectCount(prev => prev + 1);
      setFeedback("좋아요!");
    } else if (evaluation === 'letter_sound') {
      if (!letterSoundPromptUsed) {
        setFeedback(`이건 '${currentLetter}'(이)라고 읽어요. 소리가 아니라 이름을 말해주세요.`);
        setLetterSoundPromptUsed(true);
        nextStepDelay = 3000;
      } else {
        setFeedback("아쉬워요.");
      }
    } else if (evaluation === 'hesitation') {
        setFeedback(`이건 '${currentLetter}'(이)라고 읽어요. 계속하세요 (Keep going).`);
        nextStepDelay = 3000;
    }
    else {
      setFeedback(`이건 '${currentLetter}'(이)라고 읽어요.`);
      nextStepDelay = 2000;
    }
    setTimeout(() => {
      goToNextLetter();
    }, nextStepDelay);
  };
  
  const handleStartPractice = () => { /* 연습 모드는 현재 비활성화 */ };
  
  const handleStartTest = () => {
    setPhase('testing');
    setLetterIndex(0);
    setCurrentLetter(shuffledAlphabet[0]);
    setTimeLeft(60);
    setFeedback("화면에 나타나는 룬 문자의 이름을 말해주세요.");
    setLetterSoundPromptUsed(false);
    setFirstTenCorrectCount(0);
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s, transform 0.2s' };
  
  // [핵심 수정] letterBoxStyle에 fontFamily를 추가합니다.
  const letterBoxStyle: React.CSSProperties = { 
    fontSize: '12rem', 
    fontWeight: 'bold', 
    margin: '2rem 0', 
    color: '#FFD700', 
    textShadow: '0 0 20px #FFD700', 
    minHeight: '250px', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    fontFamily: 'var(--font-lexend)', // layout.tsx에서 설정한 Lexend 폰트 변수 사용
  };

  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.8)', padding: '0 1rem', transition: 'color 0.3s' };
  const timerStyle: React.CSSProperties = { fontSize: '1.5rem', color: '#FFD700', marginBottom: '1rem', fontFamily: 'monospace' };
  
  if (!user) { return (<div style={pageStyle}><h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2></div>); }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>1교시: 고대 룬 문자 해독 시험</h1>}
        
        {phase === 'testing' && (<div style={timerStyle}>남은 시간: {timeLeft}초</div>)}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>비석에 나타나는 고대 룬 문자의 이름을 정확하고 빠르게 읽어내야 합니다.<br/>DIBELS 공식 규칙에 따라 시험이 진행됩니다.</p>
            <button onClick={handleStartTest} style={buttonStyle}>시험 시작하기</button>
          </div>
        )}

        {phase === 'testing' && (
          <div>
            <div style={letterBoxStyle}>{currentLetter}</div>
            <p style={feedbackStyle}>{feedback}</p>
            {!isRecording ? (<button onClick={startRecording} style={buttonStyle} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '녹음하기'}</button>) : (<button onClick={stopRecording} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>녹음 끝내기</button>)}
          </div>
        )}

        {phase === 'finished' && (
            <div>
                <h1 style={titleStyle}>시험 종료!</h1>
                <p style={paragraphStyle}>{feedback || "1교시 '고대 룬 문자 해독 시험'이 끝났습니다. 수고 많으셨습니다!"}</p>
                <button style={buttonStyle} onClick={() => router.push('/test/psf')}>다음 시험으로 이동</button>
            </div>
        )}
      </div>
    </div>
  );
}