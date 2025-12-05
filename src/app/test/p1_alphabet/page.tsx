'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { fetchApprovedTestItems, getUserGradeLevel } from '@/lib/utils/testItems';

// [폴백] 테스트용 알파벳 목록: 대문자 A~Z 26개, 소문자 a~z 26개 (총 52개)
// 모든 학생이 동일한 섞인 순서로 평가를 보도록 고정된 순서 사용
// 문서(1교시_알파벳_순서.md, 평가_문항_및_정답.md)에 정의된 순서를 그대로 사용
// 연속된 대소문자 쌍이 나오지 않도록 수동으로 순서 조정됨
const getFixedAlphabet = (): string[] => {
    // 문서에 명시된 정확한 순서 (총 52개)
    // I/i와 L/l은 함께 제시되므로 "I / i" 또는 "L / l"로 표시되지만, 실제로는 각각 한 번씩만 출제
    // 문서 기준: 'I'는 41번과 48번에, 'l'은 1번과 45번에 출제
    return [
        'l',  // 1. L / l
        'E',  // 2. E
        'm',  // 3. m
        'S',  // 4. S
        'O',  // 5. O
        'B',  // 6. B
        'J',  // 7. J
        'c',  // 8. c
        'w',  // 9. w
        'g',  // 10. g
        'y',  // 11. y
        'b',  // 12. b
        'F',  // 13. F
        'r',  // 14. r
        'k',  // 15. k
        'u',  // 16. u
        'j',  // 17. j
        'V',  // 18. V
        'Q',  // 19. Q
        's',  // 20. s
        'H',  // 21. H
        'h',  // 22. h
        'G',  // 23. G
        'z',  // 24. z
        'o',  // 25. o
        'T',  // 26. T
        'C',  // 27. C
        't',  // 28. t
        'R',  // 29. R
        'A',  // 30. A
        'N',  // 31. N
        'M',  // 32. M
        'X',  // 33. X
        'W',  // 34. W
        'Y',  // 35. Y
        'd',  // 36. d
        'f',  // 37. f
        'D',  // 38. D
        'v',  // 39. v
        'p',  // 40. p
        'I',  // 41. I / i
        'U',  // 42. U
        'K',  // 43. K
        'x',  // 44. x
        'l',  // 45. L / l (중복이지만 문서 기준)
        'e',  // 46. e
        'n',  // 47. n
        'I',  // 48. I / i (중복이지만 문서 기준)
        'P',  // 49. P
        'a',  // 50. a
        'Z',  // 51. Z
        'q',  // 52. q
    ];
};

export default function LnfTestPage() {
  const supabase = createClient() // [수정] 함수 호출 방식으로 변경
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState('ready');
  const [shuffledAlphabet, setShuffledAlphabet] = useState<string[]>([]);
  const [letterIndex, setLetterIndex] = useState(0);
  const [currentLetter, setCurrentLetter] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // [핵심 수정] 비동기 처리에서는 실시간 개수 파악이 불가능하므로 상태 제거
  // const [firstTenCorrectCount, setFirstTenCorrectCount] = useState(0);
  const [isMediaReady, setIsMediaReady] = useState(false);


  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const router = useRouter();

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);

      // DB에서 승인된 문항 조회 시도
      try {
        const gradeLevel = await getUserGradeLevel(user.id);
        const dbItems = await fetchApprovedTestItems('p1_alphabet', gradeLevel || undefined);

        if (dbItems && Array.isArray(dbItems.items)) {
          // DB에서 가져온 문항 사용 (이미 섞인 순서로 저장되어 있다고 가정)
          console.log('[p1_alphabet] DB에서 승인된 문항 사용:', dbItems.items.length, '개');
          setShuffledAlphabet(dbItems.items as string[]);
        } else {
          // 폴백: 고정 문항 사용 (이미 섞인 순서)
          console.log('[p1_alphabet] 승인된 문항이 없어 기본 문항 사용');
          setShuffledAlphabet(getFixedAlphabet());
        }
      } catch (error) {
        console.error('[p1_alphabet] 문항 로딩 오류, 기본 문항 사용:', error);
        setShuffledAlphabet(getFixedAlphabet());
      }

      // 미리 마이크 권한 요청 및 MediaRecorder 준비
      prepareMediaRecorder();
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
  

  const goToNextLetter = useCallback(() => {
    // [핵심 수정] 실시간 채점 결과에 의존하는 시험 중단 규칙 제거
    const nextIndex = letterIndex + 1;
    
    if (nextIndex >= shuffledAlphabet.length) {
      setPhase('finished');
    } else {
      setLetterIndex(nextIndex);
      setCurrentLetter(shuffledAlphabet[nextIndex]);
    }
  }, [letterIndex, shuffledAlphabet]);

  const handleSkip = useCallback(async () => {
    if (isSubmitting || !user || !currentLetter || isRecording) return;
    
    setIsSubmitting(true);
    setFeedback('넘어가는 중...');
    
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        setFeedback('인증이 필요합니다.');
        setIsSubmitting(false);
        return;
      }

      // 빈 오디오 Blob을 보내서 오답으로 저장 (넘어가기 플래그 포함)
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', emptyBlob);
      formData.append('question', currentLetter);
      formData.append('userId', user.id);
      formData.append('skip', 'true'); // 넘어가기 플래그
      
      // API 호출 (결과를 기다리지 않음)
      fetch('/api/submit-p1_alphabet', { method: 'POST', body: formData })
        .catch(error => {
          console.error('[p1_alphabet] 넘어가기 저장 실패:', error);
        });
      
      setFeedback('다음 문제로 넘어갑니다.');
      
      setTimeout(() => {
        goToNextLetter();
        setIsSubmitting(false);
        setFeedback('');
      }, 500);
    } catch (error) {
      console.error('[p1_alphabet] 넘어가기 오류:', error);
      setFeedback('오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  }, [user, currentLetter, isSubmitting, isRecording, supabase, goToNextLetter]);

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

  const submitRecordingInBackground = useCallback(async (audioBlob: Blob) => {
    if (!user || !currentLetter) {
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
    formData.append('question', currentLetter);
    formData.append('userId', user.id);
    
    // [핵심 수정] API 호출 후 결과를 기다리지 않고, UI를 즉시 업데이트
    try {
        fetch('/api/submit-p1_alphabet', { method: 'POST', body: formData });
        
      // 피드백을 일반적인 긍정 메시지로 변경
      setFeedback("좋아요! 다음 알파벳을 읽어보세요!");
      
      
      
      // 즉시 다음 문제로 이동
      goToNextLetter();

    } catch (error) {
      console.error('p1_alphabet 요청 전송 실패:', error);
      setFeedback("요청 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [user, currentLetter, supabase.auth, goToNextLetter]);

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
        submitRecordingInBackground(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setFeedback('🎤 녹음 중... 알파벳을 읽어주세요!');
      
      // 5초로 늘리고, 더 명확한 피드백 제공
      silenceTimeoutRef.current = setTimeout(() => {
        setFeedback('시간이 다 되어서 녹음을 종료합니다.');
        stopRecording();
      }, 5000);
      
    } catch (err) {
      console.error("마이크 접근 에러:", err);
      setFeedback("마이크를 사용할 수 없어요. 브라우저 설정을 확인해주세요.");
    }
  }, [stopRecording, submitRecordingInBackground]);

  
  const handleStartTest = () => {
    setPhase('testing');
    setLetterIndex(0);
    setCurrentLetter(shuffledAlphabet[0]);
    setTimeLeft(60);
    setFeedback("화면에 나타나는 알파벳의 이름을 말해주세요.");
  };

  // useEffect들 - 모든 함수 선언 후에 배치
  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0 || isSubmitting) return;
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [phase, timeLeft, isSubmitting]);

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

  // [개선] 자동 제출 기능 - 시간 만료 카운트다운
  useEffect(() => {
    if (timeLeft <= 10 && timeLeft > 0 && phase === 'testing') {
      setFeedback(`${timeLeft}초 후 종료됩니다.`);
    } else if (timeLeft <= 0 && phase === 'testing') {
      setFeedback('');
    }
  }, [timeLeft, phase]);

  // 키보드 단축키 지원
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (phase === 'testing' && !isSubmitting) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          if (!isRecording) {
            startRecording();
          } else {
            stopRecording();
          }
        } else if (event.key === 'Escape') {
          if (isRecording) {
            stopRecording();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [phase, isRecording, isSubmitting, startRecording, stopRecording]);


  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundColor: '#ffffff', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: '#171717', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const containerStyle: React.CSSProperties = { maxWidth: '800px', width: '100%', margin: '0 auto', backgroundColor: '#ffffff', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(0, 0, 0, 0.1)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)', textAlign: 'center' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold' };
  const paragraphStyle: React.CSSProperties = { fontSize: '1.05rem', lineHeight: 1.8, color: '#4b5563', marginBottom: '2.5rem' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '16px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem', textAlign: 'center', transition: 'all 0.3s ease', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' };
  const letterBoxStyle: React.CSSProperties = { fontSize: '12rem', fontWeight: 'bold', margin: '2rem 0', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', minHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Verdana, Tahoma, sans-serif' };
  const feedbackStyle: React.CSSProperties = { minHeight: '2.5em', fontSize: '1.05rem', color: '#1f2937', padding: '0 1rem', transition: 'color 0.3s', fontWeight: '500' };
  const timerStyle: React.CSSProperties = { fontSize: '1.75rem', color: '#6366f1', marginBottom: '1rem', fontFamily: 'monospace', fontWeight: '600' };
  
  // CSS 애니메이션 스타일
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `;
  
  if (!user) { return (<div style={pageStyle}><h2 style={{color: 'white'}}>사용자 정보를 불러오는 중...</h2></div>); }

  return (
    <div style={pageStyle}>
      <style>{animationStyles}</style>
      <div style={containerStyle}>
        {phase !== 'finished' && <h1 style={titleStyle}>1교시: 알파벳 대소문자를 소리 내어 읽기</h1>}
        
        {phase === 'testing' && (
          <div>
            <div style={timerStyle}>남은 시간: {timeLeft}초</div>
          </div>
        )}

        {phase === 'ready' && (
          <div>
            <p style={{...feedbackStyle, color: isMediaReady ? '#90EE90' : '#FFB6C1'}}>
              {isMediaReady ? '🎤 마이크가 준비되었습니다!' : '🎤 마이크를 준비하고 있습니다...'}
            </p>
            <button onClick={handleStartTest} style={{...buttonStyle, opacity: isMediaReady ? 1 : 0.7}} disabled={!isMediaReady}>
              {isMediaReady ? '평가 시작하기' : '마이크 준비 중...'}
            </button>
          </div>
        )}

        {phase === 'testing' && (
          <div>
            <div style={letterBoxStyle}>
              {currentLetter === 'I' || currentLetter === 'i' ? 'I / i' : 
               currentLetter === 'L' || currentLetter === 'l' ? 'L / l' : 
               currentLetter}
            </div>
            <p style={feedbackStyle}>{feedback}</p>
            
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                {!isRecording ? (
                  <button 
                    onClick={startRecording} 
                    style={buttonStyle} 
                    disabled={isSubmitting}
                    aria-label={`${currentLetter} 문자 녹음하기`}
                    title="스페이스바 또는 엔터키로도 녹음할 수 있습니다"
                  >
                    {isSubmitting ? '처리 중...' : '녹음하기'}
                  </button>
                ) : (
                  <button 
                    onClick={stopRecording} 
                    style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}}
                    aria-label="녹음 중지하기"
                    title="스페이스바, 엔터키 또는 ESC키로도 중지할 수 있습니다"
                  >
                    녹음 끝내기
                  </button>
                )}
              </div>
              
              {!isRecording && (
                <button 
                  onClick={handleSkip} 
                  style={{
                    position: 'absolute',
                    bottom: '-60px',
                    right: '0',
                    padding: '8px 16px',
                    backgroundColor: '#f97316',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    opacity: isSubmitting ? 0.6 : 1,
                    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  disabled={isSubmitting}
                  aria-label="이 문제 넘어가기"
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = '#ea580c';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f97316';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {isSubmitting ? '처리 중...' : '⏭️ 넘어가기'}
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'finished' && (
            <div>
                <h1 style={titleStyle}>평가 종료!</h1>
                <p style={paragraphStyle}>{feedback || "1교시 평가가 끝났습니다. 수고 많으셨습니다!"}</p>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center'}}>
                  <button style={{...buttonStyle, maxWidth: '250px'}} onClick={() => router.push('/test/p2_segmental_phoneme')}>
                    다음 평가로 이동
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