'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

const psfWords = ["map", "sit", "dog", "run", "cut", "fish", "ship", "that", "them", "sing"];
const getShuffledWords = () => psfWords.sort(() => 0.5 - Math.random());

export default function PsfTestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // PSF는 1분
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // [핵심] DIBELS 규칙 관리를 위한 상태
  const [firstFiveCorrectSegments, setFirstFiveCorrectSegments] = useState(0);
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
    if (wordIndex === 4 && firstFiveCorrectSegments === 0) {
        setFeedback("첫 5개의 단어 중 정답 음소가 없어 시험을 중단합니다.");
        setPhase('finished');
        return;
    }
    const nextIndex = wordIndex + 1;
    if (nextIndex >= shuffledWords.length) {
      setPhase('finished');
    } else {
      setWordIndex(nextIndex);
      setCurrentWord(shuffledWords[nextIndex]);
      setFeedback("다음 단어의 소리를 들어보세요.");
    }
  };

  const playWordAudio = async (word: string) => {
    setIsAudioLoading(true);
    setFeedback("마법 물약의 재료 이름을 들어보세요...");
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.error("음성 재생 에러 상세 원인:", error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setFeedback(`소리를 재생하는 데 문제가 생겼어요: ${errorMessage}`);
      setIsAudioLoading(false);
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
          submitRecordingInBackground(audioBlob);
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

  const submitRecordingInBackground = async (audioBlob: Blob) => {
    if (!user || !currentWord) {
      setIsSubmitting(false);
      return;
    }
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', currentWord);
    formData.append('userId', user.id);
    try {
      const response = await fetch('/api/submit-psf', { method: 'POST', body: formData });
      if (!response.ok) throw new Error((await response.json()).error);
      const result = await response.json();
      console.log('PSF 백그라운드 처리 성공:', result);
      processEvaluation(result.evaluation, result.correctSegments);
    } catch (error) {
      console.error('PSF 백그라운드 처리 에러:', error);
      setFeedback("채점 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const processEvaluation = (evaluation: string, correctSegments: number) => {
    if (wordIndex < 5) {
        setFirstFiveCorrectSegments(prev => prev + correctSegments);
    }
    if (evaluation === 'hesitation') {
        setFeedback("다음 단어를 들어보세요.");
    } else if (evaluation === 'repeated_word') {
        setFeedback("단어 전체가 아닌, 개별 소리로 나누어 말해주세요.");
    } else {
        setFeedback("좋아요! 다음 문제예요.");
    }
    setTimeout(() => {
      goToNextWord();
    }, 1500);
  };

  const handleStartTest = () => {
    setPhase('testing');
    setWordIndex(0);
    setCurrentWord(shuffledWords[0]);
    setTimeLeft(60);
    setFeedback("아래 버튼을 눌러 첫 번째 문제의 소리를 들어보세요.");
    setFirstFiveCorrectSegments(0);
  };
  
  const handleReturnToReady = () => setPhase('ready');

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
        
        {phase === 'testing' && (<div style={timerStyle}>남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초{isSubmitting && <span style={{ marginLeft: '1rem', color: '#ccc' }}>(일시정지)</span>}</div>)}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>마법 구슬이 속삭이는 재료의 이름을 듣고, 그 이름을 구성하는 소리의 원소로 분리하여 말해야 합니다. <br/>(예: "cat" {"->"} "/k/ /æ/ /t/")</p>
            <button onClick={handleStartTest} style={buttonStyle}>시험 시작하기</button>
          </div>
        )}

        {(phase === 'practice' || phase === 'testing') && (
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
            <button style={buttonStyle} onClick={() => router.push('/test/nwf')}>다음 시험으로 이동</button>
          </div>
        )}
      </div>
    </div>
  );
}