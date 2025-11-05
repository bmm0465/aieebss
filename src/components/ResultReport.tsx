// src/components/ResultReport.tsx
'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AudioResultTable from './AudioResultTable';

// UI 컴포넌트가 받을 데이터의 타입을 명확하게 정의
export interface ProcessedResults {
  LNF: { correct: number; total: number; accuracy: number };
  PSF: { correct_segments: number; target_segments: number; accuracy: number; total: number };
  NWF: { phonemes_correct: number; whole_word_correct: number; total: number; phoneme_accuracy: number; whole_word_accuracy: number };
  WRF: { correct: number; total: number; accuracy: number };
  ORF: { total_wcpm: number; total_accuracy: number; count: number; avg_wcpm: number; avg_accuracy: number };
  MAZE: { correct: number; total: number; accuracy: number; score: number };
}

interface ResultProps {
  results: ProcessedResults;
  sessionId?: string;
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

export default function ResultReport({ results, sessionId }: ResultProps) {
  const router = useRouter();
  const [selectedTestType, setSelectedTestType] = useState<string | null>(null);

  const handleTestCardClick = (testType: string) => {
    if (sessionId) {
      setSelectedTestType(selectedTestType === testType ? null : testType);
    }
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = { backgroundColor: '#ffffff', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', padding: '2rem', color: '#1f2937', fontFamily: 'sans-serif' };
  const containerStyle: React.CSSProperties = { maxWidth: '900px', margin: '2rem auto', backgroundColor: '#ffffff', padding: '3rem', borderRadius: '20px', border: '2px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' };
  const titleStyle: React.CSSProperties = { 
    textAlign: 'center', 
    fontFamily: 'var(--font-nanum-pen)', 
    fontSize: '2.8rem', 
    marginBottom: '1rem', 
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 'bold'
  };
  const introStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', marginBottom: '2rem', backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '12px', border: '2px solid #e5e7eb' };
  const resultGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' };
  
  const getCardStyle = (testType: string): React.CSSProperties => {
    const isSelected = selectedTestType === testType;
    const isClickable = !!sessionId;
    
    return {
      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : '#ffffff',
      padding: '1.5rem',
      borderRadius: '12px',
      border: isSelected ? '2px solid #6366f1' : '2px solid #e5e7eb',
      cursor: isClickable ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
      transform: isSelected ? 'translateY(-2px)' : 'none',
      boxShadow: isSelected ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    };
  };
  const buttonStyle: React.CSSProperties = { 
    width: '100%', 
    maxWidth: '300px', 
    padding: '16px 24px', 
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    fontWeight: '600', 
    fontSize: '1.1rem', 
    textAlign: 'center', 
    transition: 'all 0.3s ease', 
    display: 'block', 
    margin: '3rem auto 0',
    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
  };

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
            <div 
              style={getCardStyle('LNF')}
              onClick={() => handleTestCardClick('LNF')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.LNF.title}</h3>
                <p>{testInfo.LNF.description}: <strong>{results.LNF.accuracy.toFixed(1)}%</strong> ({results.LNF.correct}/{results.LNF.total})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 음성 결과 확인</small>}
            </div>
            {/* PSF */}
            <div 
              style={getCardStyle('PSF')}
              onClick={() => handleTestCardClick('PSF')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.PSF.title}</h3>
                <p>{testInfo.PSF.description}: <strong>{results.PSF.accuracy.toFixed(1)}%</strong> ({results.PSF.correct_segments}/{results.PSF.target_segments})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 음성 결과 확인</small>}
            </div>
            {/* NWF */}
            <div 
              style={getCardStyle('NWF')}
              onClick={() => handleTestCardClick('NWF')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.NWF.title}</h3>
                <p>CLS (Correct Letter Sounds): <strong>{results.NWF.phoneme_accuracy.toFixed(0)}점</strong></p>
                <p>WRC (Words Read Correctly): <strong>{results.NWF.whole_word_accuracy.toFixed(1)}%</strong> ({results.NWF.whole_word_correct}/{results.NWF.total})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 음성 결과 확인</small>}
            </div>
            {/* WRF */}
            <div 
              style={getCardStyle('WRF')}
              onClick={() => handleTestCardClick('WRF')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.WRF.title}</h3>
                <p>{testInfo.WRF.description}: <strong>{results.WRF.accuracy.toFixed(1)}%</strong> ({results.WRF.correct}/{results.WRF.total})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 음성 결과 확인</small>}
            </div>
            {/* ORF */}
            <div 
              style={getCardStyle('ORF')}
              onClick={() => handleTestCardClick('ORF')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.ORF.title}</h3>
                <p>평균 WCPM: <strong>{results.ORF.avg_wcpm.toFixed(0)}</strong></p>
                <p>평균 정확도: <strong>{results.ORF.avg_accuracy.toFixed(1)}%</strong></p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 음성 결과 확인</small>}
            </div>
            {/* MAZE */}
            <div 
              style={getCardStyle('MAZE')}
              onClick={() => handleTestCardClick('MAZE')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.MAZE.title}</h3>
                <p>최종 점수: <strong>{results.MAZE.score.toFixed(1)}점</strong></p>
                <p>(맞은 개수: {results.MAZE.correct}, 틀린 개수: {results.MAZE.total - results.MAZE.correct})</p>
                {sessionId && <small style={{ color: '#ccc', fontSize: '0.8rem' }}>💡 클릭하여 상세 결과 확인</small>}
            </div>
        </div>

        {/* 선택된 교시의 상세 결과 표시 */}
        {selectedTestType && sessionId && (
          <div style={{ marginTop: '2rem' }}>
            {['LNF', 'PSF', 'NWF', 'WRF', 'ORF'].includes(selectedTestType) ? (
              <AudioResultTable
                testType={selectedTestType}
                sessionId={sessionId}
              />
            ) : selectedTestType === 'MAZE' ? (
              <div style={{ 
                backgroundColor: '#f9fafb', 
                padding: '2rem', 
                borderRadius: '16px', 
                textAlign: 'center',
                border: '2px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}>
                <h3 style={{ 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '1rem',
                  fontSize: '1.5rem',
                  fontWeight: '600'
                }}>
                  {testInfo.MAZE.title}
                </h3>
                <p style={{ color: '#4b5563', marginBottom: '1rem' }}>
                  지혜의 미로 탈출 테스트는 선택형 문제로 음성 파일이 없습니다.
                </p>
                <p style={{ color: '#1f2937', marginTop: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                  최종 점수: <strong style={{ 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>{results.MAZE.score.toFixed(1)}점</strong>
                </p>
              </div>
            ) : null}
          </div>
        )}

        <button style={buttonStyle} onClick={() => router.push('/lobby')}>시험 안내로 돌아가기</button>
      </div>
    </div>
  );
}

