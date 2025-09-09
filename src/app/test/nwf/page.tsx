// src/app/test/nwf/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

// NWF 시험에 사용될 무의미 단어 목록 (간단한 CVC 위주)
const nwfWords = ["nuf", "tib", "vog", "jez", "zop", "quim", "yeb", "wix", "fip", "roz", "kud"];
const getShuffledWords = () => nwfWords.sort(() => 0.5 - Math.random());

export default function NwfTestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready'); // ready, practice, testing, finished
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);

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
        setShuffledWords(getShuffledWords());
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

  const goToNextWord = () => {
    const nextIndex = wordIndex + 1;
    if (nextIndex >= shuffledWords.length) {
      setPhase('finished');
    } else {
      setWordIndex(nextIndex);
      setCurrentWord(shuffledWords[nextIndex]);
    }
  };

  const startRecording = async () => {
    setFeedback('');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
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
          if (audioBlob.size > 0) {
            if (phase === 'testing') {
              goToNextWord();
              setFeedback("좋아요! 다음 주문이에요!");
            }
            submitRecordingInBackground(audioBlob);
          } else {
            console.warn("녹음된 데이터가 없어 제출하지 않습니다.");
            setIsSubmitting(false);
          }
        };
        
        mediaRecorder.start();
        setIsRecording(true);

        if (phase === 'testing') {
          silenceTimeoutRef.current = setTimeout(() => {
            setFeedback("3초 동안 주문이 없어 다음 문제로 넘어갑니다.");
            stopRecording();
          }, 3000);
        }
      } catch (err) {
        console.error("마이크 접근 에러:", err);
        setFeedback("마법 지팡이(마이크)를 사용할 수 없어요. 브라우저 설정을 확인해주세요.");
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

  const submitRecordingInBackground = async (audioBlob: Blob) => {
    if (!user || !currentWord) {
      setIsSubmitting(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', currentWord);
    formData.append('userId', user.id);
    // [핵심] 음소 개수를 백엔드로 전달
    formData.append('targetPhonemeCount', String(currentWord.length)); // CVC 단어는 글자 수가 음소 수와 같다고 가정

    try {
      const response = await fetch('/api/submit-nwf', { method: 'POST', body: formData });
      if (!response.ok) throw new Error((await response.json()).error);
      const result = await response.json();
      console.log('NWF 백그라운드 처리 성공:', result);
      if (phase === 'practice') {
        setFeedback(`음성인식 결과: "${result.studentAnswer}"`);
      }
    } catch (error) {
      console.error('NWF 백그라운드 처리 에러:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPractice = () => {
    setPhase('practice');
    setCurrentWord('hap'); // 연습용 단어
    setFeedback('연습 문제입니다. "h-a-p" 또는 "hap"처럼 말해보세요.');
  };
  
  const handleStartTest = () => {
    setPhase('testing');
    setWordIndex(0);
    setCurrentWord(shuffledWords[0]);
    setTimeLeft(90);
    setFeedback("마법 책에 나타난 주문을 읽고 녹음을 끝내세요.");
  };

  const handleReturnToReady = () => setPhase('ready');

  // --- 스타일 정의 (LNF, PSF와 동일한 테마) ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s, transform 0.2s' };
  const wordBoxStyle: React.CSSProperties = { fontSize: '10rem', fontWeight: 'bold', margin: '2rem 0', color: '#FFD700', textShadow: '0 0 20px #FFD700', minHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.8)', padding: '0 1rem' };
  const timerStyle: React.CSSProperties = { fontSize: '1.5rem', color: '#FFD700', marginBottom: '1rem', fontFamily: 'monospace' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2></div>); }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>3교시: 초급 주문 시전 시험</h1>}
        
        {phase === 'testing' && (
          <div style={timerStyle}>
            남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초
            {isSubmitting && <span style={{ marginLeft: '1rem', color: '#ccc' }}>(일시정지)</span>}
          </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>
              마법 책에 나타나는 낯선 주문(무의미 단어)을 파닉스 규칙에 따라 정확하고 빠르게 읽어내야 합니다.<br/>
              개별 소리로 분리해서 말하거나, 전체 단어를 한 번에 말할 수 있습니다.
            </p>
            <button onClick={handleStartPractice} style={buttonStyle}>연습 시작하기</button>
            <button onClick={handleStartTest} style={{...buttonStyle, marginTop: '1rem', backgroundColor: 'transparent', border: '2px solid #FFD700', color: '#FFD700'}}>시험 시작하기</button>
          </div>
        )}

        {(phase === 'practice' || phase === 'testing') && (
          <div>
            <div style={wordBoxStyle}>{currentWord}</div>
            <p style={feedbackStyle}>{feedback}</p>
            
            {!isRecording ? (
              <button onClick={startRecording} style={buttonStyle} disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : '주문 시전하기'}
              </button>
            ) : (
              <button onClick={stopRecording} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>주문 끝내기</button>
            )}

            {phase === 'practice' && !isRecording && (
                <button onClick={handleReturnToReady} style={{...buttonStyle, marginTop: '1rem', backgroundColor: 'transparent', border: '2px solid #FFD700', color: '#FFD700'}}>안내로 돌아가기</button>
            )}
          </div>
        )}

        {phase === 'finished' && (
            <div>
                <h1 style={titleStyle}>시험 종료!</h1>
                <p style={paragraphStyle}>3교시 '초급 주문 시전 시험'이 끝났습니다. 수고 많으셨습니다!<br/>모든 시험 결과는 마지막에 함께 공개됩니다.</p>
                <button style={buttonStyle} onClick={() => router.push('/test/wrf')}>
  다음 시험으로 이동
</button>
            </div>
        )}
      </div>
    </div>
  );
}