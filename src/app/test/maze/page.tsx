'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// [수정] MAZE 표준 규격에 맞는 하나의 연결된 지문 (A Fun Day at the Park)
const mazePassage = {
  id: 'fun_day_at_park',
  title: "A Fun Day at the Park",
  content: [
    "Max has a small, brown puppy. His ",
    { choices: ["hat", "name", "on"], correctAnswer: "name" },
    " is Sam. Max likes to ",
    { choices: ["eat", "happy", "play"], correctAnswer: "play" },
    " with Sam. Today, they will ",
    { choices: ["go", "is", "red"], correctAnswer: "go" },
    " to the park. Max gets ",
    { choices: ["under", "his", "run"], correctAnswer: "his" },
    " red ball and they go. The ",
    { choices: ["see", "bed", "sun"], correctAnswer: "sun" },
    " is big and yellow in ",
    { choices: ["the", "sad", "she"], correctAnswer: "the" },
    " sky. At the park, Max ",
    { choices: ["makes", "throws", "happy"], correctAnswer: "throws" },
    " the red ball. Sam runs ",
    { choices: ["for", "very", "and"], correctAnswer: "for" },
    " catches it. They play for ",
    { choices: ["see", "a", "it"], correctAnswer: "a" },
    " long time. Max and Sam ",
    { choices: ["on", "eat", "are"], correctAnswer: "are" },
    " very happy together."
  ]
};

export default function MazeTestPage() {
  const supabase = createClient(); // useRouter는 여전히 다른 곳에서 필요할 수 있으므로 유지
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(180);
  const totalItems = mazePassage.content.filter(item => typeof item === 'object').length;

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/');
      else setUser(user);
    };
    checkUser();
  }, [router, supabase.auth]);

  // [개선] 확인 팝업 추가
  const handleFinishTestWithConfirmation = () => {
    if (phase === 'submitting') return;
    
    const answeredCount = answers.filter(answer => answer !== null).length;
    const totalQuestions = totalItems;
    
    if (answeredCount === 0) {
      if (!confirm('아직 답을 선택하지 않았습니다. 정말로 시험을 종료하시겠습니까?')) {
        return;
      }
    } else if (answeredCount < totalQuestions) {
      if (!confirm(`${totalQuestions}개 문제 중 ${answeredCount}개만 답했습니다. 정말로 시험을 완료하시겠습니까?`)) {
        return;
      }
    } else {
      if (!confirm('모든 문제에 답했습니다. 시험을 완료하시겠습니까?')) {
        return;
      }
    }
    
    finishTest();
  };

  const finishTest = useCallback(async () => {
    if (!user || phase === 'submitting') return;
    setPhase('submitting');

    // 사용자 세션에서 access token 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error("인증 토큰을 가져올 수 없습니다.");
      setPhase('testing');
      return;
    }

    const choices = mazePassage.content.filter(item => typeof item === 'object') as { choices: string[], correctAnswer: string }[];
    
    // 모든 답변을 배치로 한 번에 전송
    const submissions = [];
    for (let i = 0; i < choices.length; i++) {
        const studentAnswer = answers[i];
        if (studentAnswer) {
            const correctAnswer = choices[i].correctAnswer;
            const question = `${mazePassage.title}_${i+1}`;
            
            submissions.push({
                question,
                studentAnswer,
                correctAnswer
            });
        }
    }
    
    if (submissions.length > 0) {
        try {
            const response = await fetch('/api/submit-maze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    submissions,
                    userId: user.id,
                    authToken: session.access_token
                })
            });
            
            if (!response.ok) {
                console.error('MAZE 배치 저장 실패:', await response.text());
            }
        } catch (error) {
            console.error('MAZE 배치 전송 실패:', error);
        }
    }
    
    setPhase('finished');
  }, [user, phase, answers, supabase.auth]);

  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && phase === 'testing') {
      finishTest();
    }
  }, [timeLeft, phase, finishTest]);

  const handleStartTest = () => {
    setPhase('testing');
    setTimeLeft(180);
    setAnswers(Array(totalItems).fill(null));
  };
  
  const handleAnswerSelect = (choiceIndex: number, selectedWord: string) => {
    const newAnswers = [...answers];
    newAnswers[choiceIndex] = selectedWord;
    setAnswers(newAnswers);
  };
  
  // [핵심 수정] 결과 페이지 이동을 위한 핸들러
  const handleGoToResults = () => {
    window.location.href = '/results';
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.1rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.9)', marginBottom: '2.5rem' };
  const passageContainerStyle: React.CSSProperties = { textAlign: 'left', fontSize: '1.5rem', lineHeight: '3.5rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '10px', maxHeight: '60vh', overflowY: 'auto' };
  const choiceGroupStyle: React.CSSProperties = { 
    display: 'inline-flex', 
    flexDirection: 'column', 
    textAlign: 'center', 
    margin: '0 0.5rem', 
    transform: 'translateY(10px)', 
    verticalAlign: 'middle',
    border: '1px solid rgba(255, 215, 0, 0.3)',
    borderRadius: '8px',
    padding: '0.5rem',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    minWidth: '120px'
  };
  const choiceButtonStyle = (isSelected: boolean): React.CSSProperties => ({
      border: isSelected ? '2px solid #FFD700' : '1px solid #ccc',
      borderRadius: '5px', padding: '0.2rem 0.5rem', margin: '0.1rem 0', cursor: 'pointer',
      background: isSelected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
      color: 'white', fontSize: '1.2rem', minWidth: '80px',
  });
  const timerStyle: React.CSSProperties = { fontSize: '1.5rem', color: '#FFD700', marginBottom: '1rem', fontFamily: 'monospace' };
  const finishButtonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s', display: 'block', margin: '2rem auto 0' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2></div>); }

  let choiceCounter = -1;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>6교시: 지혜의 미로 탈출</h1>
        
        {phase === 'testing' && (
          <div>
            <div style={timerStyle}>남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초</div>
            <div style={passageContainerStyle}>
              {mazePassage.content.map((item, index) => {
                if (typeof item === 'string') {
                  return <span key={index}>{item}</span>;
                }
                choiceCounter++;
                const currentChoiceIndex = choiceCounter;
                return (
                  <div key={index} style={choiceGroupStyle}>
                    {item.choices.map(word => (
                      <button key={word} 
                        style={choiceButtonStyle(answers[currentChoiceIndex] === word)} 
                        onClick={() => handleAnswerSelect(currentChoiceIndex, word)}>
                          {word}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
            <button style={finishButtonStyle} onClick={handleFinishTestWithConfirmation}>시험 완료하기</button>
            
            {/* [개선] 홈으로 가기 버튼 */}
            <div style={{marginTop: '1rem'}}>
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
          </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={paragraphStyle}>미로의 갈림길마다 나타나는 문장의 빈칸에 가장 알맞은 단어를 선택해야 올바른 길로 나아갈 수 있습니다.<br/>제한 시간 내에 미로를 탈출하여 최종 관문을 통과하세요!</p>
            <button onClick={handleStartTest} style={{...finishButtonStyle, backgroundColor: '#FFD700', color: 'black'}}>미로 입장하기</button>
          </div>
        )}

        {phase === 'submitting' && (
          <div>
            <h2 style={{color: 'white', fontFamily: 'var(--font-nanum-pen)', fontSize: '2rem'}}>결과를 저장하는 중...</h2>
            <p style={paragraphStyle}>잠시만 기다려주세요. 마법 두루마리가 당신의 여정을 기록하고 있습니다.</p>
          </div>
        )}

        {phase === 'finished' && (
            <div>
                <h1 style={titleStyle}>최종 시험 종료!</h1>
                <p style={paragraphStyle}>모든 입학 시험을 무사히 마쳤습니다! 정말 대단합니다, 예비 마법사님!<br/>곧 교수님들께서 시험 결과를 분석하여 알려주실 거예요.</p>
                <button style={finishButtonStyle} onClick={handleGoToResults}>최종 결과 확인하기</button>
            </div>
        )}
      </div>
    </div>
  );
}