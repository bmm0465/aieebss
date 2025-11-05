'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// [수정] NWF 표준 규격에 맞는 122개 고정된 nonsense words
const getFixedNonsenseWords = () => {
    // NWF 표준: 단순한 단모음 구조부터 시작하여 자음 연속까지 점진적 혼합
    const fixedWords = [
        // 초기 30개: 기본 CVC 패턴 우선 배치
        "sep", "nem", "dib", "rop", "lin", "fom", "mig", "rup", "dep", "fod",
        "pid", "rit", "mog", "pim", "sog", "tib", "pon", "heg", "dev", "seb",
        "dop", "nug", "tet", "wep", "vom", "bem", "kun", "yut", "yad", "heb",
        
        // 31-60: CVC 패턴 계속하여 기본기 강화
        "pom", "gid", "pag", "kom", "wog", "yig", "lan", "nen", "het", "som",
        "tig", "fon", "tup", "nin", "hon", "vid", "wim", "pob", "sed", "yod",
        "tud", "mem", "vot", "dob", "vun", "yed", "bim", "wod", "yab", "yun",
        
        // 61-90: CVC 패턴 마지막 섹션
        "lem", "fub", "vut", "gim", "wid", "reb", "wap", "mip", "wem", "yom",
        "vad", "wum", "nim", "kep", "biv", "lum", "rik", "sab", "wug", "pac",
        "fot", "lut", "nam", "tok", "zam", "neb", "wut", "cun", "rif", "lom",
        
        // 91-122: 자음 연속(Blends) 패턴 점진적 도입
        "stam", "clen", "frap", "smop", "grut", "ston", "cles", "snid", "blut", "pren",
        "glom", "trab", "clom", "snut", "krat", "flot", "clor", "jent", "galk", "vrop",
        "pler", "drem", "trul", "skom", "tolt", "vrat", "blim", "sner", "larm", "fral",
        "sket", "trak", "plon", "trup", "smot", "gren", "frim", "prun", "twet", "draf",
        "snib", "glap", "frem", "spov", "spen", "drup", "fran", "plap", "clut", "spet",
        "crum", "frin", "bap", "fek", "himp", "krad", "clanp", "zib", "wux", "jev"
    ];
    
    return fixedWords;
};

export default function NwfTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // [핵심 수정] 비동기 처리에서는 실시간 개수 파악이 불가능하므로 상태 제거
  // const [firstFiveCLS, setFirstFiveCLS] = useState(0);
  // const [isHesitation, setIsHesitation] = useState(false);

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
        setShuffledWords(getFixedNonsenseWords()); // [수정] NWF 표준 122개 고정 문항 사용
      }
    };
    setup();
  }, [router, supabase.auth]);
  
  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0 || isSubmitting) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [phase, timeLeft, isSubmitting]);

  const stopRecording = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && phase === 'testing') {
      if (isRecording) {
        stopRecording();
        // 녹음이 완료되고 제출될 때까지 기다리기 위해 약간의 딜레이
        setTimeout(() => {
          setPhase('finished');
        }, 2000);
      } else {
        setPhase('finished');
      }
    }
  }, [timeLeft, phase, isRecording, stopRecording]);

  // [개선] 자동 제출 기능 - 시간 만료 알림 추가
  useEffect(() => {
    if (timeLeft === 10 && phase === 'testing') {
      setFeedback('⏰ 10초 후 자동으로 제출됩니다. 서둘러 주세요!');
    } else if (timeLeft <= 5 && phase === 'testing' && timeLeft > 0) {
      setFeedback(`⏰ ${timeLeft}초 후 자동 제출됩니다!`);
    }
  }, [timeLeft, phase]);

  const goToNextWord = () => {
    // [핵심 수정] 실시간 채점 결과에 의존하는 시험 중단 규칙 제거
    const nextIndex = wordIndex + 1;
    if (nextIndex >= shuffledWords.length) {
      setPhase('finished');
    } else {
      setWordIndex(nextIndex);
      setCurrentWord(shuffledWords[nextIndex]);
      setFeedback("다음 주문을 시전해 보세요!");
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
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          submitRecordingInBackground(audioBlob);
        };
        mediaRecorder.start();
        setIsRecording(true);
        silenceTimeoutRef.current = setTimeout(() => {
          stopRecording();
        }, 3000);
      } catch (err) {
        console.error("마이크 접근 에러:", err);
        setFeedback("마법 지팡이(마이크)를 사용할 수 없어요. 브라우저 설정을 확인해주세요.");
      }
    }
  };


  const submitRecordingInBackground = async (audioBlob: Blob) => {
    if (!user || !currentWord) {
      setIsSubmitting(false);
      return;
    }

    // 사용자 인증 확인
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      setFeedback("인증이 필요합니다.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', currentWord);
    formData.append('userId', user.id);
    formData.append('authToken', authUser.id);
    
    try {
      // [핵심 수정] API 호출 후 결과를 기다리지 않음
      fetch('/api/submit-nwf', { method: 'POST', body: formData });

      setFeedback("좋아요!");
      goToNextWord();

    } catch (error) {
      console.error('NWF 요청 전송 실패:', error);
      setFeedback("요청 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleStartTest = () => {
    setPhase('testing');
    setWordIndex(0);
    setCurrentWord(shuffledWords[0]);
    setTimeLeft(60);
    setFeedback("낯선 주문(무의미 단어)을 파닉스 규칙에 따라 읽어주세요.");
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundColor: '#ffffff', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: '#171717', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: '#ffffff', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.05rem', lineHeight: 1.8, color: '#4b5563', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '16px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem', textAlign: 'center', transition: 'all 0.3s ease', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' };
  const wordBoxStyle: React.CSSProperties = { fontSize: '10rem', fontWeight: 'bold', margin: '2rem 0', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', minHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.1rem', color: '#171717', padding: '0 1rem' };
  const timerStyle: React.CSSProperties = { fontSize: '1.75rem', color: '#6366f1', marginBottom: '1rem', fontFamily: 'monospace', fontWeight: '600' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: '#171717'}}>사용자 정보를 불러오는 중...</h2></div>); }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>3교시: 초급 주문 시전 시험</h1>}
        
        {phase === 'testing' && (<div style={timerStyle}>남은 시간: {timeLeft}초</div>)}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>마법 책에 나타나는 낯선 주문(무의미 단어)을 파닉스 규칙에 따라 정확하고 빠르게 읽어내야 합니다.</p>
            <button onClick={handleStartTest} style={buttonStyle}>시험 시작하기</button>
          </div>
        )}

        {phase === 'testing' && (
          <div>
            <div style={wordBoxStyle}>{currentWord}</div>
            <p style={feedbackStyle}>{feedback}</p>
            {!isRecording ? (<button onClick={startRecording} style={buttonStyle} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '주문 시전하기'}</button>) : (<button onClick={stopRecording} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>주문 끝내기</button>)}
          </div>
        )}

        {phase === 'finished' && (
            <div>
                <h1 style={titleStyle}>시험 종료!</h1>
                <p style={paragraphStyle}>{feedback || "3교시 '초급 주문 시전 시험'이 끝났습니다. 수고 많으셨습니다!"}</p>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center'}}>
                  <button style={{...buttonStyle, maxWidth: '250px'}} onClick={() => router.push('/test/wrf')}>
                    다음 시험으로 이동
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

        {/* [개선] 홈으로 가기 버튼 (테스트 중에도 표시) */}
        {phase === 'testing' && (
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