// src/components/ResultReport.tsx
'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AudioResultTable from './AudioResultTable';

// UI 컴포넌트가 받을 데이터의 타입을 명확하게 정의
export interface ProcessedResults {
  p1_alphabet: { correct: number; total: number; accuracy: number };
  p2_segmental_phoneme: { correct: number; total: number; accuracy: number };
  p3_suprasegmental_phoneme: { correct: number; total: number; accuracy: number };
  p4_phonics: { correct: number; total: number; accuracy: number; total_wcpm?: number; total_accuracy?: number; avg_wcpm?: number; avg_accuracy?: number };
  p5_vocabulary: { correct: number; total: number; accuracy: number };
  p6_comprehension: { correct: number; total: number; accuracy: number };
}

interface ResultProps {
  results: ProcessedResults;
  sessionId?: string;
}

// 각 시험별 제목과 설명
const testInfo = {
  p1_alphabet: { title: "1교시: 고대 룬 문자 해독 시험", description: "알파벳 이름 인지 정확도" },
  p2_segmental_phoneme: { title: "2교시: 소리의 원소 분리 시험", description: "최소대립쌍 듣고 식별 능력" },
  p3_suprasegmental_phoneme: { title: "3교시: 마법 리듬 패턴 시험", description: "강세 패턴 식별 능력" },
  p4_phonics: { title: "4교시: 마법 주문 읽기 시험", description: "파닉스 규칙 적용 및 유창성" },
  p5_vocabulary: { title: "5교시: 마법서 그림 해석 시험", description: "단어/문장 의미 이해 능력" },
  p6_comprehension: { title: "6교시: 고대 전설 이해 시험", description: "주요 정보 파악 능력" },
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
            {/* p1_alphabet */}
            <div 
              style={getCardStyle('p1_alphabet')}
              onClick={() => handleTestCardClick('p1_alphabet')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.p1_alphabet.title}</h3>
                <p>{testInfo.p1_alphabet.description}: <strong>{results.p1_alphabet.accuracy.toFixed(1)}%</strong> ({results.p1_alphabet.correct}/{results.p1_alphabet.total})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 음성 결과 확인</small>}
            </div>
            {/* p2_segmental_phoneme */}
            <div 
              style={getCardStyle('p2_segmental_phoneme')}
              onClick={() => handleTestCardClick('p2_segmental_phoneme')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.p2_segmental_phoneme.title}</h3>
                <p>{testInfo.p2_segmental_phoneme.description}: <strong>{results.p2_segmental_phoneme.accuracy.toFixed(1)}%</strong> ({results.p2_segmental_phoneme.correct}/{results.p2_segmental_phoneme.total})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 상세 결과 확인</small>}
            </div>
            {/* p3_suprasegmental_phoneme */}
            <div 
              style={getCardStyle('p3_suprasegmental_phoneme')}
              onClick={() => handleTestCardClick('p3_suprasegmental_phoneme')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.p3_suprasegmental_phoneme.title}</h3>
                <p>{testInfo.p3_suprasegmental_phoneme.description}: <strong>{results.p3_suprasegmental_phoneme.accuracy.toFixed(1)}%</strong> ({results.p3_suprasegmental_phoneme.correct}/{results.p3_suprasegmental_phoneme.total})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 상세 결과 확인</small>}
            </div>
            {/* p4_phonics */}
            <div 
              style={getCardStyle('p4_phonics')}
              onClick={() => handleTestCardClick('p4_phonics')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.p4_phonics.title}</h3>
                <p>파닉스 규칙 적용 및 유창성: <strong>{results.p4_phonics.accuracy.toFixed(1)}%</strong></p>
                {results.p4_phonics.avg_wcpm !== undefined && <p>평균 WCPM: <strong>{results.p4_phonics.avg_wcpm.toFixed(0)}</strong></p>}
                {results.p4_phonics.avg_accuracy !== undefined && <p>평균 정확도: <strong>{results.p4_phonics.avg_accuracy.toFixed(1)}%</strong></p>}
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 음성 결과 확인</small>}
            </div>
            {/* p5_vocabulary */}
            <div 
              style={getCardStyle('p5_vocabulary')}
              onClick={() => handleTestCardClick('p5_vocabulary')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.p5_vocabulary.title}</h3>
                <p>{testInfo.p5_vocabulary.description}: <strong>{results.p5_vocabulary.accuracy.toFixed(1)}%</strong> ({results.p5_vocabulary.correct}/{results.p5_vocabulary.total})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 상세 결과 확인</small>}
            </div>
            {/* p6_comprehension */}
            <div 
              style={getCardStyle('p6_comprehension')}
              onClick={() => handleTestCardClick('p6_comprehension')}
              title={sessionId ? "클릭하여 상세 결과 보기" : undefined}
            >
                <h3>{testInfo.p6_comprehension.title}</h3>
                <p>{testInfo.p6_comprehension.description}: <strong>{results.p6_comprehension.accuracy.toFixed(1)}%</strong> ({results.p6_comprehension.correct}/{results.p6_comprehension.total})</p>
                {sessionId && <small style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: '500' }}>💡 클릭하여 상세 결과 확인</small>}
            </div>
        </div>

        {/* 선택된 교시의 상세 결과 표시 */}
        {selectedTestType && sessionId && (
          <div style={{ marginTop: '2rem' }}>
            <AudioResultTable
              testType={selectedTestType}
              sessionId={sessionId}
            />
          </div>
        )}

        <button style={buttonStyle} onClick={() => router.push('/lobby')}>시험 안내로 돌아가기</button>
      </div>
    </div>
  );
}

