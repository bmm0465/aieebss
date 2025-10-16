'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// [수정] 모든 학생에게 동일한 고정된 지문 출제
const passage = `Hello! How many dogs?
Hi! One, two, three, four. Four dogs!
Okay. Come in.

Do you have a ball?
Yes, I do. Here you are.
Thank you.

Catch the ball!

Do you have juice?
Yes, I do. Do you like orange juice?
Yes, I do. I like orange juice.
Here.
Thank you. Bye.
Goodbye.

At the Desk
Leo: What are you doing?
Mia: I am drawing a picture.
Leo: Wow. What is it?
Mia: It is a big, yellow sun.
Leo: I like your picture. It is very nice.
Mia: Thank you, Leo.

My Cookie
Sam: I have a cookie.
Kim: Wow, it is a big cookie.
Sam: Yes, it is. Do you want some?
Kim: Yes, please.
Sam: Here you are.
Kim: Thank you, Sam.

In the Park
Ann: What is that?
Ben: This is my new ball.
Ann: Wow, it is a big ball. I like the color.
Ben: Thank you. It is blue.
Ann: Can we play with the ball?
Ben: Yes! Let's play together.`;

export default function OrfTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const readingStartTimeRef = useRef<number>(0); // [핵심 수정] 읽기 시작 시간 기록

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/');
      else setUser(user);
    };
    checkUser();
  }, [router, supabase.auth]);
  
  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && phase === 'testing') {
      stopRecording();
    }
  }, [timeLeft, phase]);

  const startRecording = async () => {
    setFeedback('이야기에 생명력을 불어넣어 주세요...');
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
          const readingEndTime = Date.now();
          // [핵심 수정] 실제 읽기 소요 시간 계산 (초 단위)
          const timeTaken = Math.round((readingEndTime - readingStartTimeRef.current) / 1000);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 0) {
            submitRecording(audioBlob, timeTaken);
          } else {
            setPhase('finished');
          }
        };
        
        mediaRecorder.start();
        readingStartTimeRef.current = Date.now(); // [핵심 수정] 녹음 시작 시간 기록
        setIsRecording(true);
        setPhase('testing');
        setTimeLeft(60);
      } catch (err) {
        console.error("마이크 접근 에러:", err);
        setFeedback("마법 지팡이(마이크)를 사용할 수 없어요.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
    }
  };

  // [핵심 수정] timeTaken 값을 함께 전송
  const submitRecording = async (audioBlob: Blob, timeTaken: number) => {
    if (!user) return;
    
    // 사용자 세션에서 access token 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setFeedback("인증 토큰을 가져올 수 없습니다.");
      return;
    }
    
    setPhase('submitting');
    setFeedback("이야기를 분석하고 있습니다...");
    
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', passage);
    formData.append('userId', user.id);
    formData.append('timeTaken', String(timeTaken)); // 소요 시간 추가
    formData.append('authToken', session.access_token);

    try {
      const response = await fetch('/api/submit-orf', { method: 'POST', body: formData });
      if (!response.ok) throw new Error((await response.json()).error);
      const result = await response.json();
      console.log('ORF 처리 성공:', result);
    } catch (error) {
      console.error('ORF 처리 에러:', error);
      setFeedback("이야기 분석에 문제가 생겼습니다.");
    } finally {
      setPhase('finished');
    }
  };

  // --- (이하 스타일 정의 및 JSX return 구문은 이전 답변과 동일) ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s, transform 0.2s' };
  const passageBoxStyle: React.CSSProperties = { textAlign: 'left', fontSize: '1.5rem', lineHeight: '2.2rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '10px', maxHeight: '50vh', overflowY: 'auto' };
  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.8)', padding: '1rem 0' };
  const timerStyle: React.CSSProperties = { fontSize: '1.5rem', color: '#FFD700', marginBottom: '1rem', fontFamily: 'monospace' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2></div>); }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>5교시: 고대 이야기 소생술 시험</h1>
        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>낡은 이야기책에 적힌 짧은 이야기를 자연스러운 억양과 속도로 읽어 생명력을 불어넣어야 합니다.<br/>&apos;이야기 시작하기&apos; 버튼을 누르면 1분간 녹음이 시작됩니다.</p>
            <button onClick={startRecording} style={buttonStyle}>이야기 시작하기</button>
          </div>
        )}
        {(phase === 'testing' || phase === 'submitting') && (
          <div>
            <div style={timerStyle}>남은 시간: {timeLeft}초</div>
            <div style={passageBoxStyle}><p>{passage}</p></div>
            <p style={feedbackStyle}>{feedback}</p>
            {isRecording && (<button onClick={stopRecording} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>읽기 끝내기</button>)}
          </div>
        )}
        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>시험 종료!</h1>
            <p style={paragraphStyle}>5교시 &apos;고대 이야기 소생술 시험&apos;이 끝났습니다. 수고 많으셨습니다!</p>
            <button style={buttonStyle} onClick={() => router.push('/test/maze')}>
  마지막 시험으로 이동
</button>
          </div>
        )}
      </div>
    </div>
  );
}