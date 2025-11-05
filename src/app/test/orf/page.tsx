'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// [수정] ORF 표준 규격에 맞는 5개 지문 (학년 수준에 맞는 어휘와 문장 구조)
const rawPassage = `Passage 1: Drawing a Picture
Leo: What are you doing?
Mia: I am drawing a picture.
Leo: Wow. What is it?
Mia: It is a big, yellow sun.
Leo: I like your picture.

Passage 2: Juice, Please
Dan: Do you have juice?
Pam: Yes, I do. Do you like orange juice?
Dan: Yes, I do. I like orange juice.
Pam: Here.
Dan: Thank you. Bye.

Passage 3: Counting Dogs
Ken: Hello. How many dogs?
Liz: Hi! One, two, three, four.
Ken: Four dogs! Okay.

Passage 4: My New Ball
Sam: Do you have a ball?
Ann: Yes, I do. Here you are.
Sam: Thank you.
Ann: Let's play together.

Passage 5: What is This?
Max: What is this?
Kim: It is a book.
Max: Is this your pencil?
Kim: Yes, it is. It is my new pencil.`;

// [개선] 대화문 가독성을 위한 화자별 줄바꿈 처리 및 스타일링
const formatPassage = (rawText: string) => {
  return rawText
    .split('\n')
    .map(line => {
      // 화자 이름 다음에 줄바꿈 추가
      if (line.match(/^[A-Za-z]+:/)) {
        return line.replace(/^([A-Za-z]+:)/, '$1');
      }
      return line;
    })
    .join('\n');
};

const passage = formatPassage(rawPassage);

// 텍스트를 스타일링된 JSX로 변환하는 함수
const renderStyledPassage = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    // 빈 줄 처리
    if (line.trim() === '') {
      return <br key={index} />;
    }
    
    // Passage 제목 처리 (예: "Passage 1: Drawing a Picture")
    if (line.match(/^Passage \d+:/)) {
      return (
        <div key={index} style={{ color: '#9ca3af', opacity: 0.6, fontSize: '1.2rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
          {line}
        </div>
      );
    }
    
    // 화자 이름 처리 (예: "Leo:", "Mia:")
    if (line.match(/^[A-Za-z]+:/)) {
      const [speaker, ...dialogueParts] = line.split(':');
      const dialogue = dialogueParts.join(':').trim();
      
      return (
        <div key={index} style={{ marginBottom: '0.5rem' }}>
          <span style={{ color: '#9ca3af', opacity: 0.6, fontSize: '1.2rem' }}>{speaker}:</span>
          {' '}
          <span style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#1f2937' }}>{dialogue}</span>
        </div>
      );
    }
    
    // 일반 텍스트 (볼드체로 표시)
    return (
      <div key={index} style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#1f2937', marginBottom: '0.5rem' }}>
        {line}
      </div>
    );
  });
};

export default function OrfTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready'); // ready -> countdown -> testing -> submitting -> finished
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(0); // 3초 카운트다운용
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAutoStop, setIsAutoStop] = useState(false); // 자동 종료인지 수동 종료인지 구분
  const shouldSubmitRef = useRef(true); // 제출 여부를 제어하는 ref

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
  
  // stopRecording 함수를 먼저 정의
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // 자동 종료인 경우 바로 제출
      if (isAutoStop) {
        mediaRecorderRef.current.stop();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        setIsAutoStop(false);
        return;
      }
      
      // 수동 종료인 경우 확인 대화상자 표시
      setShowConfirmDialog(true);
    }
  }, [isAutoStop]);
  
  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && phase === 'testing' && isRecording) {
      setIsAutoStop(true); // 자동 종료 표시
      stopRecording();
    }
  }, [timeLeft, phase, isRecording, stopRecording]);

  // [개선] 자동 제출 기능 - 시간 만료 10초 전 알림
  useEffect(() => {
    if (timeLeft === 10 && phase === 'testing') {
      setFeedback('⏰ 10초 후 자동으로 제출됩니다. 서둘러 주세요!');
    } else if (timeLeft <= 5 && phase === 'testing' && timeLeft > 0) {
      setFeedback(`⏰ ${timeLeft}초 후 자동 제출됩니다!`);
    }
  }, [timeLeft, phase]);

  // [개선] 카운트다운 처리
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      // 카운트다운 완료 후 testing 단계로 이동
      setPhase('testing');
      setTimeLeft(60); // 시간 초기화
      setFeedback('이제 녹음 버튼을 눌러 이야기를 읽어주세요.');
    }
  }, [phase, countdown]);

  // [개선] 테스트 준비 시작 (카운트다운 단계)
  const handleStartTest = () => {
    setPhase('countdown');
    setCountdown(3);
    setFeedback('잠시 후 이야기를 읽을 준비를 해주세요...');
  };

  // [개선] 실제 녹음 시작
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
          // 제출하지 않기로 결정한 경우 아무것도 하지 않음
          if (!shouldSubmitRef.current) {
            shouldSubmitRef.current = true; // 다음을 위해 초기화
            return;
          }
          
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
        shouldSubmitRef.current = true; // 새 녹음 시작 시 제출 플래그 초기화
        setIsRecording(true);
        setTimeLeft(60);
      } catch (err) {
        console.error("마이크 접근 에러:", err);
        setFeedback("마법 지팡이(마이크)를 사용할 수 없어요.");
      }
    }
  };

  // 확인 대화상자에서 제출하기
  const handleConfirmSubmit = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setShowConfirmDialog(false);
    }
  };

  // 녹음 재시작
  const handleRestartRecording = async () => {
    // 제출하지 않기로 결정
    shouldSubmitRef.current = false;
    
    // 현재 녹음 중지 (onstop 콜백은 실행되지만 제출하지 않음)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 오디오 청크 초기화
    audioChunksRef.current = [];
    
    setIsRecording(false);
    setShowConfirmDialog(false);
    
    // 잠시 후 다시 녹음 시작
    setFeedback('녹음을 다시 시작합니다...');
    setTimeout(() => {
      startRecording();
    }, 500);
  };

  // [핵심 수정] timeTaken 값을 함께 전송
  const submitRecording = async (audioBlob: Blob, timeTaken: number) => {
    if (!user) return;
    
    // 사용자 인증 확인
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      setFeedback("인증이 필요합니다.");
      return;
    }
    
    setPhase('submitting');
    setFeedback("이야기를 분석하고 있습니다...");
    
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', passage);
    formData.append('userId', user.id);
    formData.append('timeTaken', String(timeTaken)); // 소요 시간 추가
    formData.append('authToken', authUser.id);

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
  const pageStyle: React.CSSProperties = { backgroundColor: '#ffffff', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: '#171717', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: '#ffffff', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.05rem', lineHeight: 1.8, color: '#4b5563', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '16px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem', textAlign: 'center', transition: 'all 0.3s ease', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' };
  const passageBoxStyle: React.CSSProperties = { textAlign: 'left', fontSize: '1.5rem', lineHeight: '2.2rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2rem', borderRadius: '10px', maxHeight: '50vh', overflowY: 'auto', color: '#171717' };
  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.1rem', color: '#171717', padding: '1rem 0' };
  const timerStyle: React.CSSProperties = { fontSize: '1.75rem', color: '#6366f1', marginBottom: '1rem', fontFamily: 'monospace', fontWeight: '600' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: '#171717'}}>사용자 정보를 불러오는 중...</h2></div>); }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>5교시: 고대 이야기 소생술 시험</h1>
        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>낡은 이야기책에 적힌 짧은 이야기를 자연스러운 억양과 속도로 읽어 생명력을 불어넣어야 합니다.<br/>대화 내용만 읽어주세요. 화자 이름과 &quot;Passage&quot;는 읽지 않아도 됩니다.</p>
            <button onClick={handleStartTest} style={buttonStyle}>이야기 시작하기</button>
          </div>
        )}
        {phase === 'countdown' && (
          <div>
            <div style={timerStyle}>준비 시간: {countdown}초</div>
            <div style={passageBoxStyle}>
              {renderStyledPassage(passage)}
            </div>
            <p style={feedbackStyle}>{feedback}</p>
          </div>
        )}
        {(phase === 'testing' || phase === 'submitting') && (
          <div>
            <div style={timerStyle}>남은 시간: {timeLeft}초</div>
            <div style={passageBoxStyle}>
              {renderStyledPassage(passage)}
            </div>
            <p style={feedbackStyle}>{feedback}</p>
            {!isRecording ? (
              <button onClick={startRecording} style={buttonStyle} disabled={timeLeft <= 0}>
                {timeLeft <= 0 ? '시간 초과' : '녹음하기'}
              </button>
            ) : (
              <button onClick={stopRecording} style={{...buttonStyle, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white'}}>
                읽기 끝내기
              </button>
            )}
          </div>
        )}
        
        {/* 확인 대화상자 */}
        {showConfirmDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              padding: '2.5rem',
              borderRadius: '20px',
              border: '2px solid #e5e7eb',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxWidth: '400px',
              textAlign: 'center'
            }}>
              <h2 style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem'
              }}>
                녹음을 종료하시겠습니까?
              </h2>
              <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: 1.6 }}>
                지금까지 녹음한 내용을 제출하시겠습니까?<br/>
                제출하지 않으면 다시 녹음할 수 있습니다.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={handleConfirmSubmit}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  그대로 제출하기
                </button>
                <button
                  onClick={handleRestartRecording}
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#4b5563',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  다시 녹음하기
                </button>
              </div>
            </div>
          </div>
        )}
        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>시험 종료!</h1>
            <p style={paragraphStyle}>5교시 &apos;고대 이야기 소생술 시험&apos;이 끝났습니다. 수고 많으셨습니다!</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center'}}>
              <button style={{...buttonStyle, maxWidth: '250px'}} onClick={() => router.push('/test/maze')}>
                마지막 시험으로 이동
              </button>
              <button 
                style={{
                  ...buttonStyle, 
                  maxWidth: '200px', 
                  backgroundColor: 'rgba(108, 117, 125, 0.8)', 
                  color: 'white',
                  fontSize: '1rem'
                }} 
                onClick={() => router.push('/lobby')}
              >
                🏠 홈으로 가기
              </button>
            </div>
          </div>
        )}

        {/* [개선] 홈으로 가기 버튼 (모든 단계에서 표시) */}
        {phase !== 'finished' && phase !== 'ready' && (
          <div style={{marginTop: '2rem'}}>
            <button 
              style={{
                backgroundColor: 'rgba(108, 117, 125, 0.5)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.7rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
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