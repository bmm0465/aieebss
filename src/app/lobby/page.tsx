'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// 시험 정보를 담은 데이터 배열
const tests = [
  {
    period: 1,
    title: '고대 룬 문자 해독 시험',
    description: '고대의 마법 비석 앞에 섭니다. 비석에는 수많은 룬 문자(알파벳 대문자/소문자)가 무작위로 새겨져 있습니다. 1분 동안 이 룬 문자를 최대한 많이, 그리고 정확하게 읽어내야 합니다. 읽어낸 룬 문자는 하나씩 빛나기 시작하며, 시험이 끝나면 빛나는 룬 문자의 개수로 마법 언어 기초 능력을 평가합니다.',
    path: '/test/lnf' // 각 시험별 경로 추가
  },
  {
    period: 2,
    title: '소리의 원소 분리 시험',
    description: '마법 물약 제조실입니다. 시험관이 "map"과 같은 재료의 이름을 마법 구슬에 속삭입니다. 학생은 그 이름을 구성하는 소리의 원소(/m/ /a/ /p/)로 분리하여 말해야 합니다. 소리 원소를 하나씩 정확하게 말할 때마다 투명한 물약에 해당 색상의 원소가 추가되어 영롱한 빛을 내뿜습니다.',
    path: '/test/psf' // 각 시험별 경로 추가
  },
  {
    period: 3,
    title: '초급 주문 시전 시험',
    description: '마법 주문 연습장입니다. 마법 책에 한 번도 본 적 없는 짧은 주문들(예: "wep", "haj")이 나타납니다. 학생은 이 낯선 주문들을 파닉스 규칙에 따라 정확하고 빠르게 읽어내야 합니다. 주문을 성공적으로 시전할 때마다 지팡이 끝에서 귀여운 마법 생명체(예: 별똥별, 반짝이는 나비)가 소환됩니다.',
    path: '/test/nwf' // 각 시험별 경로 추가
  },
  {
    period: 4,
    title: '마법 단어 활성화 시험',
    description: '마법 도서관의 \'지식의 두루마리\'가 펼쳐집니다. 두루마리에는 마법의 힘을 가진 여러 단어들(예: in, see, play, little)이 적혀 있습니다. 1분 동안 최대한 많은 마법 단어를 정확하게 읽어내면, 읽어낸 단어들이 황금빛으로 변하며 두루마리에 마력이 충전됩니다.',
    path: '/test/wrf' // 예상 경로
  },
  {
    period: 5,
    title: '고대 이야기 소생술 시험',
    description: '낡은 이야기책이 놓여 있습니다. 학생이 책에 적힌 짧은 이야기를 자연스러운 억양과 속도로 읽기 시작하면, 그 목소리에 힘입어 멈춰 있던 책 속의 그림들이 생생하게 움직이는 애니메이션으로 살아납니다. 이야기에 생명력을 불어넣는 마법 능력을 평가합니다.',
    path: '/test/orf' // 예상 경로
  },
  {
    period: 6,
    title: '지혜의 미로 탈출',
    description: '마지막 시험은 \'지혜의 미로\'입니다. 미로의 갈림길마다 문장이 나타나고, 괄호 안에 세 개의 단어 선택지가 주어집니다. "The cat sat on the (mat / sun / fly)." 학생은 문맥에 가장 잘 맞는 단어를 골라야 올바른 길로 나아갈 수 있습니다. 제한 시간 내에 미로를 탈출하면 최종 합격입니다.',
    path: '/test/maze' // 예상 경로
  },
];

export default function LobbyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

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

  const testItemStyle: React.CSSProperties = {
    marginBottom: '1.5rem',
    borderLeft: '3px solid #FFD700',
    paddingLeft: '1rem',
    cursor: 'pointer', // 클릭 가능함을 시각적으로 알려줌
    transition: 'background-color 0.2s',
  };
  // hover 효과를 위한 인라인 스타일 함수 (Next.js 13+에서는 더 직접적인 방법 필요할 수 있음)
  const getTestItemHoverStyle = (isHovered: boolean): React.CSSProperties => ({
    backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
  });

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
        <div style={{ textAlign: 'center' }}>
          <h2>마법학교 입학 허가를 확인하는 중...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
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

        {/* 첫 번째 시험 시작 버튼 (별도 강조) */}
        <button
          style={buttonStyle}
          onClick={() => router.push(tests[0].path)} // 1교시 시험으로 연결
        >
          첫 번째 시험 시작하기
        </button>
      </div>
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
  const [isHovered, setIsHovered] = useState(false);

  const testItemStyle: React.CSSProperties = {
    marginBottom: '1.5rem',
    borderLeft: '3px solid #FFD700',
    paddingLeft: '1rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent', // 호버 상태에 따라 배경색 변경
  };

  return (
    <div
      style={testItemStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 style={{ margin: 0, color: '#FFD700' }}>{test.period}교시: {test.title}</h3>
      <p style={{ marginTop: '0.5rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.9)' }}>
        {test.description}
      </p>
    </div>
  );
};