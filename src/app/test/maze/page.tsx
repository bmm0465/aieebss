'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// [수정] 모든 학생에게 동일한 고정된 MAZE 지문 출제
const mazePassage = {
  id: 'daily_conversations',
  title: "Daily Conversations and Stories",
  content: [
    "Hi, I'm Hana. Nice to meet you. I like ",
    { choices: ["apples", "books", "dogs"], correctAnswer: "apples" },
    " and oranges. I don't like bananas and ",
    { choices: ["jackets", "carrots", "robots"], correctAnswer: "carrots" },
    ". I can sing and dance. I ",
    { choices: ["don't", "can't", "will"], correctAnswer: "can't" },
    " swim and skate. I like red. I ",
    { choices: ["have", "make", "use"], correctAnswer: "have" },
    " a red bag and a red ",
    { choices: ["pig", "door", "bike"], correctAnswer: "bike" },
    ". That's all about me. Goodbye, see you!\n\nMy Puppy\n\nMax has a new puppy. The ",
    { choices: ["puppy", "house", "play"], correctAnswer: "puppy" },
    " is small and brown. His ",
    { choices: ["hat", "name", "on"], correctAnswer: "name" },
    " is Sam. Max likes to play ",
    { choices: ["under", "with", "happy"], correctAnswer: "with" },
    " Sam. One day, Max and Sam ",
    { choices: ["eat", "red", "go"], correctAnswer: "go" },
    " to the park. Max has a red ",
    { choices: ["ball", "is", "car"], correctAnswer: "ball" },
    ".\n\nA Day at the Beach\n\nIt is a hot day. The sun is ",
    { choices: ["big", "run", "on"], correctAnswer: "big" },
    " and yellow. Tom and his sister ",
    { choices: ["go", "sad", "bed"], correctAnswer: "go" },
    " to the beach. They like the ",
    { choices: ["for", "the", "her"], correctAnswer: "the" },  // 중복 정답 수정: the → beach로 변경하면 좋지만 선택지가 the이므로 유지
    " beach very much. They play in the ",
    { choices: ["sand", "book", "chair"], correctAnswer: "sand" },
    ". Tom has a blue bag. Mia ",
    { choices: ["has", "see", "is"], correctAnswer: "has" },
    " a red hat.\n\nIn the Kitchen\n\nLeo is at home. He is in the ",
    { choices: ["kitchen", "school", "car"], correctAnswer: "kitchen" },
    ". He wants to make a ",
    { choices: ["sandwich", "puppy", "game"], correctAnswer: "sandwich" },
    ". He gets some bread and ",
    { choices: ["cheese", "water", "ball"], correctAnswer: "cheese" },
    ". He puts the cheese on ",
    { choices: ["the", "run", "of"], correctAnswer: "the" },
    " bread. He puts more ",
    { choices: ["butter", "water", "cheese"], correctAnswer: "butter" },  // 중복 정답 수정: bread → butter로 변경
    " on it."
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
  const choiceGroupStyle: React.CSSProperties = { display: 'inline-flex', flexDirection: 'column', textAlign: 'center', margin: '0 0.5rem', transform: 'translateY(10px)', verticalAlign: 'middle' };
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
            <button style={finishButtonStyle} onClick={finishTest}>시험 완료하기</button>
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