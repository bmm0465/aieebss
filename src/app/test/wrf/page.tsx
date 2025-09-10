'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

const wrfWords = ["the", "a", "see", "in", "it", "is", "and", "go", "can", "me", "like", "my", "little", "play", "with", "for", "you", "big", "red", "one"];
const getShuffledWords = () => wrfWords.sort(() => 0.5 - Math.random());

export default function WrfTestPage() {
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

  const [firstRowCorrectCount, setFirstRowCorrectCount] = useState(0);
  const [isHesitation, setIsHesitation] = useState(false);
  const wordsInFirstRow = 10;

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
    if (wordIndex === (wordsInFirstRow - 1) && firstRowCorrectCount === 0) {
      setFeedback("첫 줄의 단어 중 정답이 없어 시험을 중단합니다.");
      setPhase('finished');
      return;
    }
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

    // [핵심 수정] 3초 주저로 인해 녹음 파일이 비어있는 경우, API 호출 없이 바로 오답 처리
    if (isHesitation && audioBlob.size === 0) {
      console.log("3초 주저 감지, API 호출 생략.");
      // 백엔드 API를 모방하여 DB에 직접 저장 (선택적이지만, 데이터 일관성을 위해 추천)
      try {
        await supabase.from('test_results').insert({
            user_id: user.id, test_type: 'WRF', question: currentWord, 
            is_correct: false, error_type: 'hesitation'
        });
      } catch (dbError) {
         console.error("주저(hesitation) 결과 DB 저장 실패:", dbError);
      }
      processEvaluation('hesitation'); // 프론트엔드에서 바로 'hesitation'으로 처리
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('question', currentWord);
    formData.append('userId', user.id);
    try {
      const response = await fetch('/api/submit-wrf', { method: 'POST', body: formData });
      if (!response.ok) throw new Error((await response.json()).error);
      const result = await response.json();
      console.log('WRF 백그라운드 처리 성공:', result);
      processEvaluation(result.evaluation);
    } catch (error) {
      console.error('WRF 백그라운드 처리 에러:', error);
      setFeedback("채점 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const processEvaluation = (evaluation: string) => {
    let nextStepDelay = 1500;
    if (evaluation === 'correct') {
      if (wordIndex < wordsInFirstRow) {
        setFirstRowCorrectCount(prev => prev + 1);
      }
      setFeedback("좋아요!");
    } else if (evaluation === 'hesitation') { // [핵심 수정] isHesitation 상태 대신, 명시적인 evaluation 값으로 처리
        setFeedback(`이 단어는 '${currentWord}'(이)라고 읽어요. Keep going.`);
        nextStepDelay = 3000;
    }
    else {
      setFeedback("아쉬워요, 다음 단어!");
    }
    setTimeout(() => {
      goToNextWord();
    }, nextStepDelay);
  };

  const handleStartTest = () => {
    setPhase('testing');
    setWordIndex(0);
    setCurrentWord(shuffledWords[0]);
    setTimeLeft(60);
    setFeedback("두루마리에 나타난 마법 단어를 읽어주세요.");
    setFirstRowCorrectCount(0);
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
            <button onClick={handleStartTest} style={buttonStyle}>시험 시작하기</button>
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