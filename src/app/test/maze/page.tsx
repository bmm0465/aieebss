'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

// [폴백] MAZE 표준 규격에 맞는 하나의 연결된 지문 (A Fun Day at the Park)
const defaultMazePassage = {
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
    { choices: ["for", "very", "and"], correctAnswer: "and" },
    " catches it. They play for ",
    { choices: ["see", "a", "it"], correctAnswer: "a" },
    " long time. Max and Sam ",
    { choices: ["on", "eat", "are"], correctAnswer: "are" },
    " very happy together."
  ]
};

type MazeItem = string | { choices: string[]; correctAnswer: string };

interface MazePassage {
  id: string;
  title: string;
  content: MazeItem[];
}

export default function MazeTestPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(180);
  const [mazePassage, setMazePassage] = useState<MazePassage>(defaultMazePassage);
  const totalItems = mazePassage.content.filter(item => typeof item === 'object').length;

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);

      // DB에서 승인된 문항 조회 시도
      try {
        const gradeLevel = await getUserGradeLevel(user.id);
        const dbItems = await fetchApprovedTestItems('MAZE', gradeLevel || undefined);

        if (dbItems && Array.isArray(dbItems.items)) {
          // DB에서 가져온 MAZE 문항 사용
          console.log('[MAZE] DB에서 승인된 문항 사용:', dbItems.items.length, '개');
          
          // MAZE 문항 형식 변환: [{num, sentence, choices, answer}, ...] -> MazePassage 형식
          const mazeItems: MazeItem[] = [];
          
          (dbItems.items as Array<{
            num: number;
            sentence: string;
            choices: string[];
            answer: string;
          }>).forEach((item) => {
            // 문장에서 빈칸 부분 추출
            const blankIndex = item.sentence.indexOf('_____');
            if (blankIndex !== -1) {
              const beforeBlank = item.sentence.substring(0, blankIndex).trim();
              const afterBlank = item.sentence.substring(blankIndex + 5).trim();
              
              if (beforeBlank) {
                // 이전 문항의 마지막 부분과 연결
                if (mazeItems.length > 0 && typeof mazeItems[mazeItems.length - 1] === 'string') {
                  mazeItems[mazeItems.length - 1] = (mazeItems[mazeItems.length - 1] as string) + ' ' + beforeBlank;
                } else {
                  mazeItems.push(beforeBlank);
                }
              }
              
              mazeItems.push({
                choices: item.choices,
                correctAnswer: item.answer
              });
              
              if (afterBlank) {
                mazeItems.push(afterBlank);
              }
            } else {
              // 빈칸이 없으면 전체 문장 추가
              if (mazeItems.length > 0 && typeof mazeItems[mazeItems.length - 1] === 'string') {
                mazeItems[mazeItems.length - 1] = (mazeItems[mazeItems.length - 1] as string) + ' ' + item.sentence;
              } else {
                mazeItems.push(item.sentence);
              }
            }
          });

          setMazePassage({
            id: 'db_generated',
            title: 'Generated Passage',
            content: mazeItems
          });
        } else {
          // 폴백: 고정 문항 사용
          console.log('[MAZE] 승인된 문항이 없어 기본 문항 사용');
          setMazePassage(defaultMazePassage);
        }
      } catch (error) {
        console.error('[MAZE] 문항 로딩 오류, 기본 문항 사용:', error);
        setMazePassage(defaultMazePassage);
      }
    };
    checkUser();
  }, [router, supabase.auth]);

  // [개선] 확인 팝업 추가
  const handleFinishTestWithConfirmation = () => {
    if (phase === 'submitting') return;
    
    const answeredCount = answers.filter(answer => answer !== null).length;
    const totalQuestions = totalItems;
    const unansweredCount = totalQuestions - answeredCount;
    
    let confirmMessage = '시험을 완료하시겠습니까?';
    
    if (unansweredCount > 0) {
      confirmMessage = `아직 ${unansweredCount}개 문제에 답을 선택하지 않았습니다.\n그대로 시험을 완료하시겠습니까?`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    finishTest();
  };

  const finishTest = useCallback(async () => {
    if (!user || phase === 'submitting') return;
    setPhase('submitting');

    // 사용자 인증 확인
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      console.error("인증이 필요합니다.");
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
                    authToken: authUser.id
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
  }, [user, phase, answers, supabase.auth, mazePassage]);

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
  const pageStyle: React.CSSProperties = { backgroundColor: '#ffffff', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: '#171717', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: '#ffffff', padding: '3rem', borderRadius: '20px', border: '2px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.05rem', lineHeight: 1.8, color: '#4b5563', marginBottom: '2.5rem' };
  const passageContainerStyle: React.CSSProperties = { textAlign: 'left', fontSize: '1.5rem', lineHeight: '3.5rem', backgroundColor: '#f9fafb', padding: '2rem', borderRadius: '12px', maxHeight: '60vh', overflowY: 'auto', color: '#1f2937', border: '2px solid #e5e7eb' };
  const choiceGroupStyle: React.CSSProperties = { 
    display: 'inline-flex', 
    flexDirection: 'column', 
    textAlign: 'center', 
    margin: '0 0.5rem', 
    transform: 'translateY(10px)', 
    verticalAlign: 'middle',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '0.75rem',
    backgroundColor: '#ffffff',
    minWidth: '130px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s ease'
  };
  const choiceButtonStyle = (isSelected: boolean): React.CSSProperties => ({
      border: isSelected ? '2px solid #6366f1' : '2px solid #e5e7eb',
      borderRadius: '8px', 
      padding: '0.5rem 1rem', 
      margin: '0.25rem 0', 
      cursor: 'pointer',
      background: isSelected ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#ffffff',
      color: isSelected ? 'white' : '#1f2937', 
      fontSize: '1.2rem', 
      fontWeight: isSelected ? '600' : '500',
      minWidth: '100px',
      transition: 'all 0.3s ease',
      boxShadow: isSelected ? '0 4px 6px -1px rgba(99, 102, 241, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  });
  const timerStyle: React.CSSProperties = { fontSize: '1.75rem', color: '#6366f1', marginBottom: '1rem', fontFamily: 'monospace', fontWeight: '600' };
  const finishButtonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '16px 24px', background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem', textAlign: 'center', transition: 'all 0.3s ease', display: 'block', margin: '2rem auto 0', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' };

  if (!user) { return (<div style={pageStyle}><h2 style={{color: '#171717'}}>사용자 정보를 불러오는 중...</h2></div>); }

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
                  <div 
                    key={index} 
                    style={choiceGroupStyle}
                    className="maze-choice-group"
                  >
                    {item.choices.map(word => (
                      <button 
                        key={word} 
                        style={choiceButtonStyle(answers[currentChoiceIndex] === word)} 
                        onClick={() => handleAnswerSelect(currentChoiceIndex, word)}
                        onMouseEnter={(e) => {
                          if (answers[currentChoiceIndex] !== word) {
                            e.currentTarget.style.borderColor = '#6366f1';
                            e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (answers[currentChoiceIndex] !== word) {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }
                        }}
                      >
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
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  border: '2px solid #e5e7eb',
                  padding: '0.7rem 1.5rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
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
            <button onClick={handleStartTest} style={{...finishButtonStyle, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'}}>미로 입장하기</button>
          </div>
        )}

        {phase === 'submitting' && (
          <div>
            <h2 style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'var(--font-nanum-pen)', 
              fontSize: '2rem',
              fontWeight: 'bold'
            }}>결과를 저장하는 중...</h2>
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