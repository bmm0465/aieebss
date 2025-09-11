// src/components/ResultReport.tsx
'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { ProcessedResults } from '@/app/results/page';
// 이 컴포넌트가 받을 데이터의 타입을 정의
interface ResultProps {
  results: ProcessedResults; // import한 타입 사용
}

// 각 시험별 제목과 설명
const testInfo = {
  LNF: { title: "1교시: 고대 룬 문자 해독", description: "알파벳 이름 인지 정확도" },
  PSF: { title: "2교시: 소리의 원소 분리", description: "음소 분절 능력 정확도" },
  NWF: { title: "3교시: 초급 주문 시전", description: "파닉스 규칙 적용 능력" },
  WRF: { title: "4교시: 마법 단어 활성화", description: "주요 단어 인지 정확도" },
  ORF: { title: "5교시: 고대 이야기 소생술", description: "문장 유창성 및 정확도" },
  MAZE: { title: "6교시: 지혜의 미로 탈출", description: "문맥 이해 및 추론 능력" },
};

export default function ResultReport({ results }: ResultProps) {
  const router = useRouter();

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: 'white', fontFamily: 'sans-serif' };
  const containerStyle: React.CSSProperties = { maxWidth: '900px', margin: '2rem auto', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: '3rem', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' };
  const titleStyle: React.CSSProperties = { textAlign: 'center', fontFamily: 'var(--font-nanum-pen)', fontSize: '2.8rem', marginBottom: '1rem', color: '#FFD700', textShadow: '0 0 10px #FFD700' };
  const introStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', marginBottom: '2rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '10px' };
  const resultGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' };
  const cardStyle: React.CSSProperties = { backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '10px', borderLeft: '3px solid #FFD700' };
  const buttonStyle: React.CSSProperties = { width: '100%', maxWidth: '300px', padding: '15px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', transition: 'background-color 0.3s', display: 'block', margin: '3rem auto 0' };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={introStyle}>
          <Image src="/owl.png" alt="안내하는 부엉이" width={80} height={80} />
          <div style={{marginLeft: '1rem'}}>
            <h1 style={titleStyle}>마법 적성 분석 두루마리</h1>
            <p>모든 시험을 통과한 것을 축하합니다! 예비 마법사님의 놀라운 잠재력을 확인해보세요.</p>
          </div>
        </div>

        <div style={resultGridStyle}>
            {/* LNF */}
            <div style={cardStyle}>
                <h3>{testInfo.LNF.title}</h3>
                <p>{testInfo.LNF.description}: <strong>{results.LNF.accuracy.toFixed(1)}%</strong> ({results.LNF.correct}/{results.LNF.total})</p>
            </div>
            {/* PSF */}
            <div style={cardStyle}>
                <h3>{testInfo.PSF.title}</h3>
                <p>{testInfo.PSF.description}: <strong>{results.PSF.accuracy.toFixed(1)}%</strong> ({results.PSF.correct}/{results.PSF.total})</p>
            </div>
            {/* NWF */}
            <div style={cardStyle}>
                <h3>{testInfo.NWF.title}</h3>
                <p>개별 소리 정확도: <strong>{results.NWF.phoneme_accuracy.toFixed(1)}%</strong></p>
                <p>전체 단어 정확도: <strong>{results.NWF.whole_word_accuracy.toFixed(1)}%</strong></p>
            </div>
            {/* WRF */}
            <div style={cardStyle}>
                <h3>{testInfo.WRF.title}</h3>
                <p>{testInfo.WRF.description}: <strong>{results.WRF.accuracy.toFixed(1)}%</strong> ({results.WRF.correct}/{results.WRF.total})</p>
            </div>
            {/* ORF */}
            <div style={cardStyle}>
                <h3>{testInfo.ORF.title}</h3>
                <p>평균 WCPM: <strong>{results.ORF.avg_wcpm.toFixed(0)}</strong></p>
                <p>평균 정확도: <strong>{results.ORF.avg_accuracy.toFixed(1)}%</strong></p>
            </div>
            {/* MAZE */}
<div style={cardStyle}>
    <h3>{testInfo.MAZE.title}</h3>
    {/* [핵심 수정] accuracy 대신 score를 표시 */}
    <p>최종 점수: <strong>{results.MAZE.score.toFixed(1)}점</strong></p>
    <p>(맞은 개수: {results.MAZE.correct}, 틀린 개수: {results.MAZE.total - results.MAZE.correct})</p>
</div>
        </div>

        <button style={buttonStyle} onClick={() => router.push('/lobby')}>시험 안내로 돌아가기</button>
      </div>
    </div>
  );
}

// 서버 컴포넌트의 함수를 클라이언트에서 사용하기 위한 트릭
type CalculateResultsType = (results: any[]) => any;
declare const calculateResults: CalculateResultsType;