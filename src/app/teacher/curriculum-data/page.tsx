'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

interface CoreExpressionEntry {
  index: number;
  donga_yoon?: string | null;
  icecream_park?: string | null;
  ybm_kim?: string | null;
  ybm_choi?: string | null;
  chunjae_text_kim?: string | null;
  chunjae_text_ham?: string | null;
  chunjae_edu_lee?: string | null;
}

interface VocabularyEntry {
  index: number;
  donga_yoon?: string | null;
  icecream_park?: string | null;
  ybm_kim?: string | null;
  ybm_choi?: string | null;
  chunjae_text_kim?: string | null;
  chunjae_text_ham?: string | null;
  chunjae_edu_lee?: string | null;
}

interface Unit {
  unit: number;
  entries: CoreExpressionEntry[] | VocabularyEntry[];
}

interface CurriculumData {
  metadata: {
    source: string;
    created: string;
    description: string;
    publishers: {
      [key: string]: string;
    };
  };
  units: Unit[];
}

export default function CurriculumDataPage() {
  const [dataType, setDataType] = useState<'expressions' | 'vocabulary' | 'wordlist'>('expressions');
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [coreExpressions, setCoreExpressions] = useState<CurriculumData | null>(null);
  const [vocabulary, setVocabulary] = useState<CurriculumData | null>(null);
  const [wordList, setWordList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Core Expressions 로드
        const expressionsResponse = await fetch('/data/core_expressions.json');
        if (!expressionsResponse.ok) throw new Error('핵심 표현 데이터를 불러올 수 없습니다.');
        const expressionsData = await expressionsResponse.json();
        setCoreExpressions(expressionsData);
        
        // Vocabulary 로드
        const vocabularyResponse = await fetch('/data/vocabulary_level.json');
        if (!vocabularyResponse.ok) throw new Error('어휘 난이도 데이터를 불러올 수 없습니다.');
        const vocabularyData = await vocabularyResponse.json();
        setVocabulary(vocabularyData);
        
        // 초등 필수 어휘 목록 로드
        const wordListResponse = await fetch('/data/초등 필수 어휘 목록(800개).txt');
        if (!wordListResponse.ok) throw new Error('초등 필수 어휘 목록을 불러올 수 없습니다.');
        const wordListText = await wordListResponse.text();
        const words = wordListText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            // 괄호 안의 내용 제거 (예: "a (an)" -> "a")
            const mainWord = line.split('(')[0].trim();
            return mainWord;
          });
        setWordList(words);
        
        setError(null);
      } catch (err) {
        console.error('데이터 로드 오류:', err);
        setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const currentData = dataType === 'expressions' ? coreExpressions : vocabulary;
  const currentUnit = currentData?.units.find(u => u.unit === selectedUnit);
  const publishers = currentData?.metadata.publishers || {};

  const publisherKeys = Object.keys(publishers);

  if (loading) {
    return (
      <div style={{ 
        backgroundColor: '#ffffff', 
        minHeight: '100vh',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', color: '#6366f1' }}>데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        backgroundColor: '#ffffff', 
        minHeight: '100vh',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ 
          textAlign: 'center',
          backgroundColor: '#fee2e2',
          padding: '2rem',
          borderRadius: '10px',
          border: '1px solid #fca5a5'
        }}>
          <p style={{ fontSize: '1.2rem', color: '#dc2626', marginBottom: '1rem' }}>⚠️ 오류</p>
          <p style={{ color: '#991b1b' }}>{error}</p>
          <Link 
            href="/teacher/dashboard"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.8rem 1.5rem',
              backgroundColor: '#6366f1',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      minHeight: '100vh',
      padding: '2rem',
      color: '#171717'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '2rem', 
              margin: 0,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 'bold'
            }}>
              📚 교육과정 데이터
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>
              {dataType === 'expressions' ? '핵심 표현' : dataType === 'vocabulary' ? '어휘 난이도' : '초등 필수 어휘 목록'} 데이터 확인
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <Link
              href="/teacher/dashboard"
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                border: '1px solid #e5e7eb'
              }}
            >
              ← 대시보드
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* 데이터 타입 선택 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>데이터 타입:</span>
          <button
            onClick={() => setDataType('expressions')}
            style={{
              padding: '0.8rem 1.5rem',
              backgroundColor: dataType === 'expressions' ? '#6366f1' : '#f3f4f6',
              color: dataType === 'expressions' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            핵심 표현
          </button>
          <button
            onClick={() => setDataType('vocabulary')}
            style={{
              padding: '0.8rem 1.5rem',
              backgroundColor: dataType === 'vocabulary' ? '#6366f1' : '#f3f4f6',
              color: dataType === 'vocabulary' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            어휘 난이도
          </button>
          <button
            onClick={() => setDataType('wordlist')}
            style={{
              padding: '0.8rem 1.5rem',
              backgroundColor: dataType === 'wordlist' ? '#6366f1' : '#f3f4f6',
              color: dataType === 'wordlist' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            초등 필수 어휘 목록
          </button>
        </div>

        {/* 메타데이터 */}
        {currentData && dataType !== 'wordlist' && (
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              📋 메타데이터
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <strong>출처:</strong> {currentData.metadata.source}
              </div>
              <div>
                <strong>생성일:</strong> {currentData.metadata.created}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>설명:</strong> {currentData.metadata.description}
              </div>
            </div>
          </div>
        )}

        {/* 어휘 목록 정보 */}
        {dataType === 'wordlist' && (
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              📋 어휘 목록 정보
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <strong>총 어휘 수:</strong> {wordList.length}개
              </div>
              <div>
                <strong>검색 결과:</strong> {searchTerm ? wordList.filter(word => word.toLowerCase().includes(searchTerm.toLowerCase())).length : wordList.length}개
              </div>
            </div>
          </div>
        )}

        {/* 검색 기능 (어휘 목록만) */}
        {dataType === 'wordlist' && (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              🔍 어휘 검색
            </h3>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="어휘를 검색하세요 (예: apple, cat, ...)"
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                fontSize: '1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            />
          </div>
        )}

        {/* 단원 선택 */}
        {currentData && dataType !== 'wordlist' && (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              단원 선택
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {currentData.units.map((unit) => (
                <button
                  key={unit.unit}
                  onClick={() => setSelectedUnit(unit.unit)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    backgroundColor: selectedUnit === unit.unit ? '#6366f1' : '#f3f4f6',
                    color: selectedUnit === unit.unit ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {unit.unit}단원
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 데이터 테이블 */}
        {dataType === 'wordlist' ? (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '15px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              초등 필수 어휘 목록 ({wordList.length}개)
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '0.8rem'
            }}>
              {wordList
                .filter(word => 
                  searchTerm === '' || word.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((word, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.8rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontSize: '0.95rem',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#6366f1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    {word}
                  </div>
                ))}
            </div>
            {searchTerm && wordList.filter(word => word.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                color: '#6b7280'
              }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>검색 결과가 없습니다</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>다른 검색어를 입력해보세요</p>
              </div>
            )}
          </div>
        ) : currentUnit ? (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '15px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            overflowX: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: '600' }}>
              {selectedUnit}단원 데이터
            </h3>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '0.8rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600' }}>
                    번호
                  </th>
                  {publisherKeys.map((key) => (
                    <th key={key} style={{ padding: '0.8rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: '600' }}>
                      {publishers[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentUnit.entries.map((entry) => (
                  <tr key={entry.index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.8rem', border: '1px solid #e5e7eb', fontWeight: '600' }}>
                      {entry.index}
                    </td>
                    {publisherKeys.map((key) => {
                      const publisherKey = key as keyof CoreExpressionEntry;
                      const value = (entry as CoreExpressionEntry)[publisherKey] ?? (entry as VocabularyEntry)[publisherKey as keyof VocabularyEntry];
                      return (
                        <td key={key} style={{ padding: '0.8rem', border: '1px solid #e5e7eb' }}>
                          {value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

