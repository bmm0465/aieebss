'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// [수정] 모든 학생에게 동일한 고정된 문항 출제 (중복 제거: 85개)
const getFixedSightWords = () => {
    const fixedWords = [
        // 초고빈도 단어 (1-2글자) - 15개
        "no", "do", "he", "go", "it", "to", "me", "up", "the", "she", "yes", "you", "not", "who", "how",
        
        // 고빈도 단어 (3-4글자) - 35개
        "this", "that", "like", "look", "good", "come", "have", "said", "love",
        "hat", "cat", "dad", "sit", "mom", "big", "dog", "pig", "six", "can", "two", "one",
        "pen", "leg", "pan", "car", "zoo", "red", "ten", "too", "what", "here", "down", "open", "much", "nice",
        
        // 중빈도 단어 (4-5글자) - 25개
        "tall", "small", "hello", "three", "four", "five", "door", "book", "jump", "swim",
        "great", "green", "eight", "stand", "blue", "lion", "nine", "white", "many", "apple",
        "seven", "pizza", "sorry", "color", "close",
        
        // 저빈도/복합 단어 (5-6글자) - 10개
        "okay", "bye", "dance", "pencil", "sister", "sunny", "ball", "eraser"
    ];
    
    return fixedWords;
};

export default function WrfTestPage() {
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
  const [isMediaReady, setIsMediaReady] = useState(false);

  // [핵심 수정] 비동기 처리에서는 실시간 개수 파악이 불가능하므로 상태 제거
  // const [firstRowCorrectCount, setFirstRowCorrectCount] = useState(0);
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
        setShuffledWords(getFixedSightWords()); // [수정] 고정된 문항 사용
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

  const goToNextWord = () => {
    // [핵심 수정] 실시간 채점 결과에 의존하는 시험 중단 규칙 제거
    const nextIndex = wordIndex + 1;
    if (nextIndex >= shuffledWords.length) {
      setPhase('finished');
    } else {
      setWordIndex(nextIndex);
      setCurrentWord(shuffledWords[nextIndex]);
      setFeedback("다음 마법 단어를 읽어주세요.");
    }
  };

  const startRecording = async () => {
    setFeedback('');
    
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
      setFeedback('🎤 녹음 중... 단어를 읽어주세요!');
      
      // 5초로 늘리고, 더 명확한 피드백 제공
      silenceTimeoutRef.current = setTimeout(() => {
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
    if (!user || !currentWord) {
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
    formData.append('question', currentWord);
    formData.append('userId', user.id);
    formData.append('authToken', session.access_token);
    
    try {
      // [핵심 수정] API 호출 후 결과를 기다리지 않음
      fetch('/api/submit-wrf', { method: 'POST', body: formData });
      
      // UI를 즉시 업데이트
      setFeedback("좋아요!");
      goToNextWord();

    } catch (error) {
      console.error('WRF 요청 전송 실패:', error);
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
    setFeedback("두루마리에 나타난 마법 단어를 읽어주세요.");
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s, transform 0.2s' };
  const wordBoxStyle: React.CSSProperties = { fontSize: '8rem', fontWeight: 'bold', margin: '2rem 0', color: '#FFD700', textShadow: '0 0 20px #FFD700', minHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.8)', padding: '0 1rem' };
  const timerStyle: React.CSSProperties = { fontSize: '1.5rem', color: '#FFD700', marginBottom: '1rem', fontFamily: 'monospace' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2></div>); }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>4교시: 마법 단어 활성화 시험</h1>}
        
        {phase === 'testing' && (
          <div style={timerStyle}>
            남은 시간: {timeLeft}초
            {isSubmitting && <span style={{ marginLeft: '1rem', color: '#ccc' }}>(일시정지)</span>}
          </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>지식의 두루마리에 나타나는 마법 단어들을 정확하고 빠르게 읽어내야 합니다.<br/>단어를 성공적으로 읽으면 두루마리에 마력이 충전됩니다.</p>
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
            <div style={wordBoxStyle}>{currentWord}</div>
            <p style={feedbackStyle}>{feedback}</p>
            {!isRecording ? (<button onClick={startRecording} style={buttonStyle} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '단어 읽기'}</button>) : (<button onClick={stopRecording} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>녹음 끝내기</button>)}
          </div>
        )}

        {phase === 'finished' && (
            <div>
                <h1 style={titleStyle}>시험 종료!</h1>
                <p style={paragraphStyle}>{feedback || "4교시 '마법 단어 활성화 시험'이 끝났습니다. 수고 많으셨습니다!"}</p>
                <button style={buttonStyle} onClick={() => router.push('/test/orf')}>다음 시험으로 이동</button>
            </div>
        )}
      </div>
    </div>
  );
}