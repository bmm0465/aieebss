'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// [수정] PSF 표준 규격에 맞는 110개 고정된 단어 문항 (다양한 음소 수 혼합)
const getFixedWords = () => {
    // PSF 표준: 초기에는 쉬운 단어, 이후 다양한 음소 수 혼합하여 모든 학생이 다양한 난이도 평가받도록
    const fixedWords = [
        // 초기 20개: 주로 2-3음소 단어로 구성 (학생들이 쉽게 시작할 수 있도록)
        "go", "on", "at", "up", "be", "it", "so", "in", "to", "an",
        "dad", "sit", "map", "cup", "top", "pen", "cat", "dog", "get", "hot",
        
        // 21-50: 2-3음소와 일부 4음소 혼합
        "mad", "van", "pin", "son", "rug", "hit", "nut", "box", "bat", "bug",
        "win", "web", "mug", "man", "pig", "dig", "pot", "bed", "mom", "fan",
        "wig", "car", "fog", "leg", "ten", "hen", "jog", "kid", "fit", "but",
        
        // 51-80: 다양한 음소 수 균형있게 혼합
        "red", "sun", "jam", "mud", "hug", "run", "cut", "not", "tap", "pet",
        "bell", "stop", "plan", "hand", "gift", "star", "belt", "doll", "gold", "sand",
        "dot", "big", "sip", "mop", "lid", "lip", "fin", "kit", "had", "can",
        
        // 81-110: 계속 혼합하되 더 복잡한 단어들 포함
        "zoo", "hop", "hat", "six", "rock", "road", "pan", "jet", "bib", "ship",
        "desk", "ski", "pull", "toad", "cold", "crab", "lamp", "drum", "nest", "tent",
        "milk", "pond", "coin", "deep", "moon", "heel", "frog", "camp", "farm", "star"
    ];
    return fixedWords;
};

export default function PsfTestPage() {
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
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  // [핵심 수정] 비동기 처리에서는 실시간 개수 파악이 불가능하므로 상태 제거
  // const [firstFiveCorrectSegments, setFirstFiveCorrectSegments] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isInitialMount = useRef(true);
  const submitRecordingRef = useRef<((audioBlob: Blob) => void) | null>(null);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/');
      else {
        setUser(user);
        setShuffledWords(getFixedWords()); // [수정] PSF 표준 110개 고정 문항 사용
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
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (phase === 'testing' && currentWord) {
      playWordAudio(currentWord);
    }
  }, [currentWord, phase, playWordAudio]);

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
  }, [timeLeft, phase, isRecording, stopRecording]);

  const goToNextWord = useCallback(() => {
    // [핵심 수정] 실시간 채점 결과에 의존하는 시험 중단 규칙 제거
    const nextIndex = wordIndex + 1;
    
    if (nextIndex >= shuffledWords.length) {
      setPhase('finished');
    } else {
      // [수정] 상태 초기화하여 버튼들이 다시 활성화되도록 함
      setIsSubmitting(false);
      setIsAudioLoading(false);
      setIsRecording(false);
      setWordIndex(nextIndex);
      setCurrentWord(shuffledWords[nextIndex]);
      setFeedback('');
    }
  }, [wordIndex, shuffledWords]);

  const fetchTtsAudio = useCallback(async (word: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word }),
      });
      if (!response.ok) {
        const errorData = await response.json(); 
        throw new Error(errorData.error || '음성 생성 실패');
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => {
        setFeedback("들은 소리를 원소 단위로 분리해서 말해주세요.");
        setIsAudioLoading(false);
      };
    } catch (error) {
      console.error("TTS API 에러:", error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setFeedback(`소리를 재생하는 데 문제가 생겼어요: ${errorMessage}`);
      setIsAudioLoading(false);
    }
  }, []);

  const playWordAudio = useCallback(async (word: string) => {
    setIsAudioLoading(true);
    setFeedback("마법 물약의 재료 이름을 들어보세요...");
    
    // 먼저 미리 생성된 오디오 파일 존재 확인
    const audioUrl = `/audio/psf/${word}.mp3`;
    
    try {
      const response = await fetch(audioUrl, { method: 'HEAD' });
      
      if (response.ok) {
        // 미리 생성된 파일 사용
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setFeedback("들은 소리를 원소 단위로 분리해서 말해주세요.");
          setIsAudioLoading(false);
        };
        audio.onerror = () => {
          console.error(`오디오 재생 실패: ${word}`);
          setIsAudioLoading(false);
        };
        audio.play();
      } else {
        // 파일이 없으면 TTS API 사용
        fetchTtsAudio(word);
      }
    } catch (error) {
      // 네트워크 오류 시 TTS API 사용
      console.warn(`오디오 파일 확인 실패, TTS API 사용:`, error);
      fetchTtsAudio(word);
    }
  }, [fetchTtsAudio]);
  
  const stopRecording = useCallback(() => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // 스트림을 정리하지 않음 - 재사용을 위해 유지
      setIsRecording(false);
      setIsSubmitting(true);
      setFeedback('🎵 녹음 완료! 처리 중...');
    }
  }, []);

  const startRecording = useCallback(async () => {
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
        if (submitRecordingRef.current) {
          submitRecordingRef.current(audioBlob);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setFeedback('🎤 녹음 중... 말씀해주세요!');
      
      // 5초로 늘리고, 더 명확한 피드백 제공
      silenceTimeoutRef.current = setTimeout(() => {
        setFeedback('시간이 다 되어서 녹음을 종료합니다.');
        stopRecording();
      }, 5000);
      
    } catch (err) {
      console.error("마이크 접근 에러:", err);
      setFeedback("마이크를 사용할 수 없어요. 브라우저 설정을 확인해주세요.");
    }
  }, [stopRecording]);

  const submitRecordingInBackground = useCallback(async (audioBlob: Blob) => {
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
      fetch('/api/submit-psf', { method: 'POST', body: formData })
        .catch(error => {
          console.error('PSF 요청 전송 실패:', error);
          // 백그라운드에서 실패해도 UI에는 영향을 주지 않음
        });
      
      // UI를 즉시 업데이트
      setFeedback("좋아요! 다음 문제예요.");
      
      setTimeout(() => {
        goToNextWord();
      }, 500); // 잠시 딜레이를 두어 사용자가 피드백을 볼 수 있도록 함

    } catch (error) {
      console.error('PSF 요청 전송 실패:', error);
      setFeedback("요청 전송 중 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  }, [user, currentWord, supabase, goToNextWord]);

  useEffect(() => {
    submitRecordingRef.current = submitRecordingInBackground;
  }, [submitRecordingInBackground]);

  const handleStartTest = () => {
    setPhase('testing');
    setWordIndex(0);
    setTimeLeft(60);
    isInitialMount.current = false;
    setCurrentWord(shuffledWords[0]);
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s, transform 0.2s' };
  const soundButtonStyle: React.CSSProperties = { fontSize: '6rem', margin: '2rem 0', minHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: 'none', border: 'none', color: '#FFD700', textShadow: '0 0 20px #FFD700', opacity: isAudioLoading ? 0.5 : 1, transition: 'opacity 0.3s' };
  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.8)', padding: '0 1rem' };
  const timerStyle: React.CSSProperties = { fontSize: '1.5rem', color: '#FFD700', marginBottom: '1rem', fontFamily: 'monospace' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2></div>); }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>2교시: 소리의 원소 분리 시험</h1>}
        
        {phase === 'testing' && (
          <div>
            <div style={timerStyle}>남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초{isSubmitting && <span style={{ marginLeft: '1rem', color: '#ccc' }}>(일시정지)</span>}</div>
          </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>마법 구슬이 속삭이는 재료의 이름을 듣고, 그 이름을 구성하는 소리의 원소로 분리하여 말해야 합니다. <br/>(예: &quot;cat&quot; {"->"} &quot;/k/ /æ/ /t/&quot;)</p>
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
            <button onClick={() => playWordAudio(currentWord)} style={soundButtonStyle} disabled={isAudioLoading || isRecording || isSubmitting}>🔊</button>
            <p style={feedbackStyle}>{feedback}</p>
            {!isRecording ? (<button onClick={startRecording} style={buttonStyle} disabled={isSubmitting || isAudioLoading}>{isSubmitting ? '처리 중...' : '녹음하기'}</button>) : (<button onClick={stopRecording} style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}>녹음 끝내기</button>)}
          </div>
        )}

        {phase === 'finished' && (
          <div>
            <h1 style={titleStyle}>시험 종료!</h1>
            <p style={paragraphStyle}>{feedback || "2교시 '소리의 원소 분리 시험'이 끝났습니다. 수고 많으셨습니다!"}</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center'}}>
              <button style={{...buttonStyle, maxWidth: '250px'}} onClick={() => router.push('/test/nwf')}>
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