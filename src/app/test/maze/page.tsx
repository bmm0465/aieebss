'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

// MAZE 시험 문제 목록
const mazeQuestions = [
  { id: 1, sentenceParts: ["The cat sat on the ", "."], choices: ["mat", "sun", "fly"], correctAnswer: "mat" },
  { id: 2, sentenceParts: ["A dog can ", "."], choices: ["sing", "bark", "read"], correctAnswer: "bark" },
  { id: 3, sentenceParts: ["I see a little ", " in the sky."], choices: ["pig", "car", "bird"], correctAnswer: "bird" },
  { id: 4, sentenceParts: ["We ", " with a ball."], choices: ["play", "eat", "sleep"], correctAnswer: "play" },
  { id: 5, sentenceParts: ["The sun is very ", "."], choices: ["cold", "hot", "blue"], correctAnswer: "hot" },
];

export default function MazeTestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; correct: boolean | null }>({ message: '', correct: null });
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2분

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/');
      else setUser(user);
    };
    checkUser();
  }, [router]);
  
  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0 || isAnswered) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [phase, timeLeft, isAnswered]);

  useEffect(() => {
    if (timeLeft <= 0 && phase === 'testing') {
      setPhase('finished');
    }
  }, [timeLeft, phase]);

  const goToNextQuestion = () => {
    if (questionIndex + 1 >= mazeQuestions.length) {
      setPhase('finished');
    } else {
      setQuestionIndex(prev => prev + 1);
      setIsAnswered(false);
      setFeedback({ message: '', correct: null });
    }
  };

  const handleAnswerClick = async (chosenWord: string) => {
    if (isAnswered || !user) return;
    setIsAnswered(true);

    const currentQuestion = mazeQuestions[questionIndex];
    const isCorrect = chosenWord === currentQuestion.correctAnswer;

    if (isCorrect) {
      setFeedback({ message: "정답입니다! 다음 길로 나아갑니다.", correct: true });
    } else {
      setFeedback({ message: `아쉬워요. 정답은 '${currentQuestion.correctAnswer}' 입니다.`, correct: false });
    }

    try {
      await fetch('/api/submit-maze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.sentenceParts.join('___'),
          studentAnswer: chosenWord,
          correctAnswer: currentQuestion.correctAnswer,
          userId: user.id,
        }),
      });
    } catch (error) {
      console.error("MAZE 결과 저장 실패:", error);
    }

    setTimeout(() => {
      goToNextQuestion();
    }, 1500);
  };

  const handleStartTest = () => {
    setPhase('testing');
    setQuestionIndex(0);
    setTimeLeft(120);
    setIsAnswered(false);
    setFeedback({ message: '', correct: null });
  };

  // [핵심 수정] 결과 페이지 이동을 위한 핸들러
  const handleGoToResults = () => {
    router.refresh();
    setTimeout(() => {
      router.push('/results');
    }, 100);
  };
  
  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s, transform 0.2s' };
  const sentenceBoxStyle: React.CSSProperties = { fontSize: '2.5rem', fontWeight: 'bold', margin: '2rem 0', minHeight: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' };
  const blankStyle: React.CSSProperties = { borderBottom: '3px solid #FFD700', padding: '0 1rem', display: 'inline-block', minWidth: '100px' };
  const choiceContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' };
  const choiceButtonStyle = (word: string): React.CSSProperties => {
    let backgroundColor = '#FFD700';
    if (isAnswered) {
      const currentQuestion = mazeQuestions[questionIndex];
      if (word === currentQuestion.correctAnswer) {
        backgroundColor = '#28a745';
      } else if (word !== currentQuestion.correctAnswer && feedback.correct === false) {
        backgroundColor = '#dc3545';
      } else {
        backgroundColor = '#6c757d';
      }
    }
    return { ...buttonStyle, width: 'auto', minWidth: '150px', backgroundColor };
  };
  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.1rem', color: feedback.correct === false ? '#ffc107' : 'white', padding: '1rem 0' };
  const timerStyle: React.CSSProperties = { fontSize: '1.5rem', color: '#FFD700', marginBottom: '1rem', fontFamily: 'monospace' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2></div>); }

  const currentQuestion = mazeQuestions[questionIndex];

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>6교시: 지혜의 미로 탈출</h1>}
        
        {phase === 'testing' && (
          <div>
            <div style={timerStyle}>남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초</div>
            <div style={sentenceBoxStyle}>
              <span>{currentQuestion.sentenceParts[0]}</span>
              <span style={blankStyle}></span>
              <span>{currentQuestion.sentenceParts[1]}</span>
            </div>
            <div style={choiceContainerStyle}>
              {currentQuestion.choices.map(choice => (
                <button key={choice} onClick={() => handleAnswerClick(choice)} style={choiceButtonStyle(choice)} disabled={isAnswered}>
                  {choice}
                </button>
              ))}
            </div>
            <p style={feedbackStyle}>{feedback.message}</p>
          </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>
              미로의 갈림길마다 나타나는 문장의 빈칸에 가장 알맞은 단어를 선택해야 올바른 길로 나아갈 수 있습니다.<br/>
              제한 시간 내에 미로를 탈출하여 최종 관문을 통과하세요!
            </p>
            <button onClick={handleStartTest} style={buttonStyle}>미로 입장하기</button>
          </div>
        )}

        {phase === 'finished' && (
            <div>
                <h1 style={titleStyle}>최종 시험 종료!</h1>
                <p style={paragraphStyle}>모든 입학 시험을 무사히 마쳤습니다! 정말 대단합니다, 예비 마법사님!<br/>곧 교수님들께서 시험 결과를 분석하여 알려주실 거예요.</p>
                {/* [핵심 수정] 버튼에 새로 만든 핸들러 연결 */}
                <button style={buttonStyle} onClick={handleGoToResults}>
                  최종 결과 확인하기
                </button>
            </div>
        )}
      </div>
    </div>
  );
}