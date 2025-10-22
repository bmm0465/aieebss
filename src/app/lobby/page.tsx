'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SkeletonPage, SkeletonCard } from '@/components/LoadingSkeleton'
import { useToastHelpers } from '@/components/Toast'

// 시험 정보를 담은 데이터 배열
const tests = [
  {
    period: 1,
    title: '고대 룬 문자 해독 시험',
    description: '고대의 마법 비석 앞에 섭니다. 비석에는 수많은 룬 문자(알파벳 대문자/소문자)가 무작위로 새겨져 있습니다. 1분 동안 이 룬 문자를 최대한 많이, 그리고 정확하게 읽어내야 합니다.',
    path: '/test/lnf' // 각 시험별 경로 추가
  },
  {
    period: 2,
    title: '소리의 원소 분리 시험',
    description: '마법 물약 제조실입니다. 시험관이 "map"과 같은 재료의 이름을 마법 구슬에 속삭입니다. 학생은 그 이름을 구성하는 소리의 원소(/m/ /a/ /p/)로 분리하여 말해야 합니다.',
    path: '/test/psf' // 각 시험별 경로 추가
  },
  {
    period: 3,
    title: '초급 주문 시전 시험',
    description: '마법 주문 연습장입니다. 마법 책에 한 번도 본 적 없는 짧은 주문들(예: "wep", "haj")이 나타납니다. 학생은 이 낯선 주문들을 파닉스 규칙에 따라 정확하고 빠르게 읽어내야 합니다.',
    path: '/test/nwf' // 각 시험별 경로 추가
  },
  {
    period: 4,
    title: '마법 단어 활성화 시험',
    description: '마법 도서관의 \'지식의 두루마리\'가 펼쳐집니다. 두루마리에는 마법의 힘을 가진 여러 단어들(예: in, see, play, little)이 적혀 있습니다. 1분 동안 최대한 많은 마법 단어를 정확하게 읽어내면, 두루마리에 마력이 충전됩니다.',
    path: '/test/wrf' // 예상 경로
  },
  {
    period: 5,
    title: '고대 이야기 소생술 시험',
    description: '낡은 이야기책이 놓여 있습니다. 학생이 책에 적힌 짧은 이야기를 자연스러운 억양과 속도로 읽어내야 합니다.',
    path: '/test/orf' // 예상 경로
  },
  {
    period: 6,
    title: '지혜의 미로 탈출',
    description: '마지막 시험은 \'지혜의 미로\'입니다. 미로의 갈림길마다 문장이 나타나고, 괄호 안에 세 개의 단어 선택지가 주어집니다. 학생은 문맥에 가장 잘 맞는 단어를 골라야 올바른 길로 나아갈 수 있습니다. 제한 시간 내에 미로를 탈출하면 최종 합격입니다.',
    path: '/test/maze' // 예상 경로
  },
];

export default function LobbyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { success } = useToastHelpers();
  const [hasTestResults, setHasTestResults] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [userEmail, setUserEmail] = useState('');
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

        // 교사 권한 확인
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setIsTeacher(profile?.role === 'teacher');
        
        setLoading(false);
        success('환영합니다!', '마법학교 입학 허가가 확인되었습니다.');
      }
    };
    checkUser();
  }, [router]);

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
    backgroundImage: `url('/background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    padding: '2rem',
    color: 'white',
    fontFamily: 'sans-serif',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: '2rem',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };

  const introStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2rem',
  };

  const owlMessageStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '1rem',
    borderRadius: '10px',
    marginLeft: '1rem',
    flex: 1,
  };


  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '15px',
    marginTop: '2rem',
    backgroundColor: '#FFD700',
    color: 'black',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    textAlign: 'center'
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
          marginBottom: '1rem',
          padding: '0.8rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            로그인: <strong>{userEmail}</strong>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              backgroundColor: loggingOut ? 'rgba(244, 67, 54, 0.5)' : 'rgba(244, 67, 54, 0.2)',
              color: '#F44336',
              border: '2px solid rgba(244, 67, 54, 0.5)',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
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
              달빛 마법학교 입학처에 온 것을 환영합니다!
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
                backgroundColor: 'rgba(156, 39, 176, 0.2)',
                border: '2px solid rgba(156, 39, 176, 0.5)',
                color: '#9C27B0',
                fontSize: '1.1rem',
                fontWeight: 'bold'
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
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                border: '2px solid rgba(76, 175, 80, 0.5)',
                color: '#4CAF50',
                fontSize: '1.1rem',
                fontWeight: 'bold'
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
              fontSize: '1.2rem',
              fontWeight: 'bold'
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
    borderLeft: '3px solid #FFD700',
    paddingLeft: '1rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    backgroundColor: 'transparent',
  };

  return (
    <div
      style={testItemStyle}
      onClick={onClick}
      className="test-item"
    >
      <h3 style={{ margin: 0, color: '#FFD700' }}>{test.period}교시: {test.title}</h3>
      <p style={{ marginTop: '0.5rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.9)' }}>
        {test.description}
      </p>
    </div>
  );
};