'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // [수정] 새로운 클라이언트 경로
import type { User } from '@supabase/supabase-js';

const getShuffledAlphabet = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    return alphabet.sort(() => 0.5 - Math.random());
};

export default function LnfTestPage() {
  const supabase = createClient() // [수정] 함수 호출 방식으로 변경
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [shuffledAlphabet, setShuffledAlphabet] = useState<string[]>([]);
  const [letterIndex, setLetterIndex] = useState(0);
  const [currentLetter, setCurrentLetter] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // [핵심 수정] 비동기 처리에서는 실시간 개수 파악이 불가능하므로 상태 제거
  // const [firstTenCorrectCount, setFirstTenCorrectCount] = useState(0);
  const [isMediaReady, setIsMediaReady] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const router = useRouter();

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/');
      else {
        setUser(user);
        setShuffledAlphabet(getShuffledAlphabet());
        // 미리 마이크 권한 요청 및 MediaRecorder 준비
        prepareMediaRecorder();
      }
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
        console.error("마이크 준비 에러:", err);
        setFeedback("마이크를 사용할 수 없어요. 브라우저 설정을 확인해주세요.");
      }
    }
  };
  
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
    // [핵심 수정] 실시간 채점 결과에 의존하는 시험 중단 규칙 제거
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
    setIsHesitation(false);
    
    try {
      let stream = streamRef.current;
      
      // 미리 준비된 스트림이 없으면 새로 생성
      if (!stream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
      
      if (!stream) {
        throw new Error('마이크 스트림을 가져올 수 없습니다.');
      }
      
      // 매번 새로운 MediaRecorder 생성 (재사용 불가)
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('🎤 오디오 데이터 수신:', event.data.size, 'bytes');
        }
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('🎵 녹음 완료:', audioBlob.size, 'bytes');
        if (audioBlob.size === 0) {
          console.warn('⚠️ 빈 오디오 파일이 생성되었습니다!');
          setFeedback('녹음이 제대로 되지 않았습니다. 다시 시도해주세요.');
          setIsSubmitting(false);
          return;
        }
        submitRecordingInBackground(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setFeedback('🎤 녹음 중... 룬 문자를 읽어주세요!');
      
      // 5초로 늘리고, 더 명확한 피드백 제공
      silenceTimeoutRef.current = setTimeout(() => {
        setIsHesitation(true);
        setFeedback('시간이 다 되어서 녹음을 종료합니다.');
        stopRecording();
      }, 5000);
      
    } catch (err) {
      console.error("마이크 접근 에러:", err);
      setFeedback("마이크를 사용할 수 없어요. 브라우저 설정을 확인해주세요.");
    }
  };

  const stopRecording = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // 스트림을 정리하지 않음 - 재사용을 위해 유지
      setIsRecording(false);
      setIsSubmitting(true);
      setFeedback('🎵 녹음 완료! 처리 중...');
    }
  };

  const submitRecordingInBackground = async (audioBlob: Blob) => {
    if (!user || !currentLetter) {
      setIsSubmitting(false);
      return;
    }

    // 사용자 세션에서 access token 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setFeedback("인증 토큰을 가져올 수 없습니다.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', currentLetter);
    formData.append('userId', user.id);
    formData.append('authToken', session.access_token);
    
    // [핵심 수정] API 호출 후 결과를 기다리지 않고, UI를 즉시 업데이트
    try {
        fetch('/api/submit-lnf', { method: 'POST', body: formData });
        
        // 피드백을 일반적인 긍정 메시지로 변경
        setFeedback("좋아요! 다음 룬 문자를 해독해 보세요!");
        // 즉시 다음 문제로 이동
        goToNextLetter();

    } catch (error) {
      console.error('LNF 요청 전송 실패:', error);
      setFeedback("요청 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartTest = () => {
    setPhase('testing');
    setLetterIndex(0);
    setCurrentLetter(shuffledAlphabet[0]);
    setTimeLeft(60);
    setFeedback("화면에 나타나는 룬 문자의 이름을 말해주세요.");
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s, transform 0.2s' };
  const letterBoxStyle: React.CSSProperties = { fontSize: '12rem', fontWeight: 'bold', margin: '2rem 0', color: '#FFD700', textShadow: '0 0 20px #FFD700', minHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'var(--font-lexend)' };
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
            <p style={{...feedbackStyle, color: isMediaReady ? '#90EE90' : '#FFB6C1'}}>
              {isMediaReady ? '🎤 마이크가 준비되었습니다!' : '🎤 마이크를 준비하고 있습니다...'}
            </p>
            <button onClick={handleStartTest} style={{...buttonStyle, opacity: isMediaReady ? 1 : 0.7}} disabled={!isMediaReady}>
              {isMediaReady ? '시험 시작하기' : '마이크 준비 중...'}
            </button>
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