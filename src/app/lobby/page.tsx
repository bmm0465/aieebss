'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SkeletonPage } from '@/components/LoadingSkeleton'
import { useToastHelpers } from '@/components/Toast'

// 시험 정보를 담은 데이터 배열
const tests = [
  {
    period: 1,
    title: '고대 룬 문자 해독 시험',
    description: '고대의 마법 비석 앞에 섭니다. 비석에는 수많은 룬 문자(알파벳 대문자/소문자)가 무작위로 새겨져 있습니다. 1분 동안 이 룬 문자를 최대한 많이, 그리고 정확하게 읽어내야 합니다.',
    path: '/test/p1_alphabet'
  },
  {
    period: 2,
    title: '소리의 원소 분리 시험',
    description: '마법의 소리 파편이 공중에 떠다닙니다. 두 가지 비슷한 마법 주문이 들려오는데, 그 중 한 가지를 정확히 식별해야 합니다. 소리의 미묘한 차이를 듣는 능력이 마법사의 기본 소양입니다. (예: "pin"과 "fin"을 들려주면, 들려준 주문을 선택합니다)',
    path: '/test/p2_segmental_phoneme'
  },
  {
    period: 3,
    title: '마법 리듬 패턴 시험',
    description: '마법 주문을 올바르게 시전하려면 리듬과 강세를 정확히 알아야 합니다. 들려오는 주문의 리듬 패턴을 듣고, 올바른 강세가 표시된 마법 진동을 선택해야 합니다. (예: "computer"를 들려주면, 강세가 올바르게 표시된 패턴을 선택합니다)',
    path: '/test/p3_suprasegmental_phoneme'
  },
  {
    period: 4,
    title: '마법 주문 읽기 시험',
    description: '고대 마법서 앞에 섭니다. 책장을 넘기면 초급 주문(무의미 단어)부터 강력한 마법 단어, 그리고 고대 이야기까지 순차적으로 나타납니다. 소리와 철자의 관계를 이해하며 마법 주문을 읽어내는 능력이 시험됩니다.',
    path: '/test/p4_phonics'
  },
  {
    period: 5,
    title: '마법서 그림 해석 시험',
    description: '고대 마법서에는 그림과 주문이 함께 기록되어 있습니다. 들려오거나 보이는 마법 주문의 의미를 파악하여, 그에 맞는 그림을 찾아내야 합니다. 마법 언어의 의미를 이해하는 능력이 평가됩니다. (예: "a red apple"을 들려주거나 보여주면, 빨간 사과 그림을 선택합니다)',
    path: '/test/p5_vocabulary'
  },
  {
    period: 6,
    title: '고대 전설 이해 시험',
    description: '마법사들의 구전으로 전해 내려오는 고대 전설이 들려옵니다. 또는 마법서에 기록된 이야기를 읽게 됩니다. 이야기의 핵심을 파악하여 질문에 답해야 합니다. 마법 세계의 지혜를 이해하는 능력이 최종적으로 평가됩니다. (예: "Tom has a big, blue ball"을 듣고, "What color is the ball?"에 "blue"를 선택)',
    path: '/test/p6_comprehension'
  },
];

export default function LobbyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { success } = useToastHelpers();
  const [hasTestResults, setHasTestResults] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
      } else {
        setLoading(false);
        setUserEmail(user.email || '');
        
        // 사용자의 테스트 결과가 있는지 확인
        const { data: results } = await supabase
          .from('test_results')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        setHasTestResults(Boolean(results && results.length > 0));

        // 교사 권한 확인 및 사용자 이름 가져오기
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();
        
        setIsTeacher(profile?.role === 'teacher');
        setUserName(profile?.full_name || '');
        
        setLoading(false);
        success('환영합니다!', '마법학교 입학 허가가 확인되었습니다.');
      }
    };
    checkUser();
  }, [router, success]);

  const handleLogout = async () => {
    if (!confirm('정말 로그아웃 하시겠습니까?')) {
      return;
    }

    setLoggingOut(true);
    const supabase = createClient();
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 로그아웃 성공 시 로그인 페이지로 이동
      router.push('/');
    } catch (error) {
      console.error('로그아웃 에러:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
      setLoggingOut(false);
    }
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    padding: '2rem',
    color: '#171717',
    fontFamily: 'sans-serif',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '15px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  };

  const introStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2rem',
  };

  const owlMessageStyle: React.CSSProperties = {
    backgroundColor: '#f9fafb',
    padding: '1.25rem',
    borderRadius: '12px',
    marginLeft: '1rem',
    flex: 1,
    border: '1px solid #e5e7eb',
  };


  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 24px',
    marginTop: '2rem',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1.1rem',
    textAlign: 'center',
    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
    transition: 'all 0.3s ease',
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <SkeletonPage />
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* 사용자 정보 및 로그아웃 버튼 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div>
              로그인 ID: <strong style={{ color: '#1f2937' }}>{userEmail}</strong>
            </div>
            {userName && (
              <div>
                사용자: <strong style={{ color: '#1f2937' }}>{userName}</strong>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: loggingOut ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              transition: 'all 0.3s ease',
              boxShadow: loggingOut ? 'none' : '0 4px 6px -1px rgba(239, 68, 68, 0.3)'
            }}
            className="logout-button"
          >
            {loggingOut ? '로그아웃 중...' : '🚪 로그아웃'}
          </button>
        </div>

        <div style={introStyle}>
          <Image src="/owl.png" alt="안내하는 부엉이" width={80} height={80} />
          <div style={owlMessageStyle}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
              달빛 마법학교에 온 것을 환영합니다!
            </p>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              여러분은 총 여섯 가지의 입학 시험 과목에 참여하게 됩니다.
            </p>
          </div>
        </div>

        <div>
          {tests.map((test) => (
            <TestItem
              key={test.period}
              test={test}
              onClick={() => router.push(test.path)}
            />
          ))}
        </div>

        {/* 결과 확인 및 시험 시작 버튼들 */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          marginTop: '2rem'
        }}>
          {/* 교사 대시보드 버튼 (교사일 때만 표시) */}
          {isTeacher && (
            <button
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                fontSize: '1rem',
                boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
              }}
              onClick={() => router.push('/teacher/dashboard')}
              className="teacher-button"
            >
              🎓 교사 관리 대시보드
            </button>
          )}

          {/* 결과 확인 버튼 (테스트 결과가 있을 때만 표시) */}
          {hasTestResults && (
            <button
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                fontSize: '1rem',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
              }}
            onClick={() => router.push('/results')}
            className="results-button"
            >
              📊 이전 평가 결과 보기
            </button>
          )}

          {/* 첫 번째 시험 시작 버튼 (별도 강조) */}
          <button
            style={{
              ...buttonStyle,
              fontSize: '1.15rem',
              padding: '18px 24px',
            }}
            onClick={() => router.push(tests[0].path)} // 1교시 시험으로 연결
          >
            {hasTestResults ? '🚀 새로운 시험 시작하기' : '🎯 첫 번째 시험 시작하기'}
          </button>
        </div>
      </div>

      {/* 스타일 추가 */}
      <style jsx>{`
        .logout-button:hover:not(:disabled) {
          background-color: rgba(244, 67, 54, 0.4) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

// 시험 항목 개별 컴포넌트 (호버 효과를 위해 분리)
interface TestItemProps {
  test: {
    period: number;
    title: string;
    description: string;
    path: string;
  };
  onClick: () => void;
}

const TestItem: React.FC<TestItemProps> = ({ test, onClick }) => {
  const testItemStyle: React.CSSProperties = {
    marginBottom: '1.5rem',
    borderLeft: '4px solid #6366f1',
    paddingLeft: '1.25rem',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  };

  return (
    <div
      style={testItemStyle}
      onClick={onClick}
      className="test-item"
    >
      <h3 style={{ margin: 0, color: '#6366f1', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>{test.period}교시: {test.title}</h3>
      <p style={{ marginTop: '0.5rem', lineHeight: 1.7, color: '#4b5563', fontSize: '0.95rem' }}>
        {test.description}
      </p>
    </div>
  );
};