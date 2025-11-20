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

  // 분석 함수: 출판사별 겹치는 항목 분석
  const analyzeOverlaps = () => {
    if (!currentData) return null;

    const publisherSets: { [key: string]: Set<string> } = {};
    const allItems: { [key: string]: { publishers: string[], count: number, units: number[] } } = {};
    const unitStats: { [unitNum: number]: { total: number, overlaps: number } } = {};

    // 각 출판사별 항목 수집
    publisherKeys.forEach(publisherKey => {
      publisherSets[publisherKey] = new Set();
      currentData.units.forEach(unit => {
        if (!unitStats[unit.unit]) {
          unitStats[unit.unit] = { total: 0, overlaps: 0 };
        }
        unit.entries.forEach(entry => {
          const value = (entry as unknown as Record<string, string | null | undefined>)[publisherKey];
          if (value && typeof value === 'string') {
            // 표현의 경우 정규화 (대소문자, 공백, 구두점)
            const normalized = value.trim().toLowerCase();
            if (normalized) {
              publisherSets[publisherKey].add(normalized);
              unitStats[unit.unit].total++;
              if (!allItems[normalized]) {
                allItems[normalized] = { publishers: [], count: 0, units: [] };
              }
              if (!allItems[normalized].publishers.includes(publisherKey)) {
                allItems[normalized].publishers.push(publisherKey);
                allItems[normalized].count++;
              }
              if (!allItems[normalized].units.includes(unit.unit)) {
                allItems[normalized].units.push(unit.unit);
              }
            }
          }
        });
      });
    });

    // 단원별 겹침 계산
    Object.keys(unitStats).forEach(unitNumStr => {
      const unitNum = parseInt(unitNumStr);
      const unit = currentData.units.find(u => u.unit === unitNum);
      if (unit) {
        const unitItems: { [item: string]: string[] } = {};
        unit.entries.forEach(entry => {
          publisherKeys.forEach(publisherKey => {
            const value = (entry as unknown as Record<string, string | null | undefined>)[publisherKey];
            if (value && typeof value === 'string') {
              const normalized = value.trim().toLowerCase();
              if (normalized) {
                if (!unitItems[normalized]) {
                  unitItems[normalized] = [];
                }
                if (!unitItems[normalized].includes(publisherKey)) {
                  unitItems[normalized].push(publisherKey);
                }
              }
            }
          });
        });
        unitStats[unitNum].overlaps = Object.values(unitItems).filter(pubs => pubs.length >= 2).length;
      }
    });

    // 겹치는 항목 찾기 (2개 이상 출판사에서 사용)
    const overlaps = Object.entries(allItems)
      .filter(([, data]) => data.count >= 2)
      .map(([item, data]) => ({
        item,
        publishers: data.publishers,
        count: data.count,
        units: data.units
      }))
      .sort((a, b) => b.count - a.count);

    // 출판사별 총 항목 수
    const publisherStats = publisherKeys.map(key => {
      const uniqueItems = Object.values(allItems)
        .filter(data => data.publishers.length === 1 && data.publishers[0] === key);
      return {
        publisher: publishers[key],
        publisherKey: key,
        totalCount: publisherSets[key].size,
        uniqueCount: uniqueItems.length,
        overlapCount: Object.values(allItems)
          .filter(data => data.publishers.includes(key) && data.count >= 2).length,
        uniqueRatio: publisherSets[key].size > 0 
          ? ((uniqueItems.length / publisherSets[key].size) * 100).toFixed(1) 
          : '0.0'
      };
    });

    // 출판사 쌍별 겹치는 항목 수
    const pairOverlaps: { [pair: string]: { count: number, ratio: number } } = {};
    publisherKeys.forEach((key1, i) => {
      publisherKeys.slice(i + 1).forEach(key2 => {
        const set1 = publisherSets[key1];
        const set2 = publisherSets[key2];
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        const pairKey = `${publishers[key1]} & ${publishers[key2]}`;
        pairOverlaps[pairKey] = {
          count: intersection.size,
          ratio: union.size > 0 ? ((intersection.size / union.size) * 100) : 0
        };
      });
    });

    // 가장 많이 겹치는 단원
    const unitOverlapStats = Object.entries(unitStats)
      .map(([unitNum, stats]) => ({
        unit: parseInt(unitNum),
        total: stats.total,
        overlaps: stats.overlaps,
        overlapRatio: stats.total > 0 ? ((stats.overlaps / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.overlapRatio - a.overlapRatio);

    return {
      overlaps,
      publisherStats,
      pairOverlaps,
      unitOverlapStats,
      totalUniqueItems: Object.keys(allItems).length,
      totalOverlaps: overlaps.length
    };
  };

  const analysis = currentData ? analyzeOverlaps() : null;

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
          <p style={{ fontSize: '1.2rem', color: '#dc2626', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span>
            <span>오류</span>
          </p>
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
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '2rem' }}>📚</span>
              <span style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                교육과정 데이터
              </span>
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>
              {dataType === 'expressions' ? '2022 개정 교육과정 3학년 영어 교과서 의사소통 기능' : dataType === 'vocabulary' ? '2022 개정 교육과정 3학년 영어 교과서 신출 어휘' : '2022 개정 교육과정 영어과 기본 어휘(초등 권장)'} 데이터 확인
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
            의사소통 기능
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
            신출 어휘
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
            기본 어휘(초등 권장)
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
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋</span>
              <span>메타데이터</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <strong>데이터 타입:</strong> {currentData.metadata.dataType || (dataType === 'expressions' ? '2022 개정 교육과정 3학년 영어 교과서 의사소통 기능' : '2022 개정 교육과정 3학년 영어 교과서 신출 어휘')}
              </div>
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

        {/* 분석 결과 */}
        {analysis && dataType !== 'wordlist' && (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📊</span>
              <span>출판사별 겹침 분석</span>
            </h3>
            
            {/* 전체 통계 */}
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.3rem' }}>전체 고유 항목 수</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6366f1' }}>{analysis.totalUniqueItems}개</div>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.3rem' }}>겹치는 항목 수 (2개 이상)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{analysis.totalOverlaps}개</div>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.3rem' }}>겹침 비율</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {analysis.totalUniqueItems > 0 ? ((analysis.totalOverlaps / analysis.totalUniqueItems) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {/* 출판사별 통계 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                출판사별 항목 수
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.8rem'
              }}>
                {analysis.publisherStats.map((stat, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#f9fafb',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      {stat.publisher}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#6366f1' }}>
                      총 {stat.totalCount}개
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.3rem' }}>
                      (고유: {stat.uniqueCount}개)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 출판사별 상세 통계 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                출판사별 상세 통계
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.8rem'
              }}>
                {analysis.publisherStats.map((stat, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#f9fafb',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600' }}>
                      {stat.publisher}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#6366f1', marginBottom: '0.3rem' }}>
                      총 {stat.totalCount}개
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#10b981', marginBottom: '0.2rem' }}>
                      고유: {stat.uniqueCount}개 ({stat.uniqueRatio}%)
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                      겹침: {stat.overlapCount}개
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 출판사 쌍별 겹침 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                출판사 쌍별 겹치는 항목 수 및 유사도
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '0.8rem'
              }}>
                {Object.entries(analysis.pairOverlaps)
                  .sort(([, a], [, b]) => b.ratio - a.ratio)
                  .map(([pair, data], idx) => (
                    <div key={idx} style={{
                      backgroundColor: '#f9fafb',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem', fontWeight: '600' }}>
                        {pair}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>겹치는 항목:</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>
                          {data.count}개
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>유사도:</span>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#6366f1' }}>
                          {data.ratio.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 단원별 겹침 분석 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                단원별 겹침 분석
              </h4>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                        단원
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                        전체 항목 수
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                        겹치는 항목 수
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                        겹침 비율
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.unitOverlapStats.map((stat, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.8rem', fontWeight: '500' }}>{stat.unit}단원</td>
                        <td style={{ padding: '0.8rem', textAlign: 'center' }}>{stat.total}개</td>
                        <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: stat.overlaps > 0 ? '#10b981' : '#9ca3af',
                            color: 'white',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}>
                            {stat.overlaps}개
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                          <span style={{
                            color: stat.overlapRatio >= 50 ? '#10b981' : stat.overlapRatio >= 30 ? '#f59e0b' : '#6366f1',
                            fontWeight: '600'
                          }}>
                            {stat.overlapRatio.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 상위 겹치는 항목 */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                상위 겹치는 항목 (Top 20)
              </h4>
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                        항목
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                        겹치는 출판사 수
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                        출판사
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.overlaps.slice(0, 20).map((overlap, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.8rem', fontWeight: '500' }}>{overlap.item}</td>
                        <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: overlap.count >= 5 ? '#10b981' : overlap.count >= 3 ? '#f59e0b' : '#6366f1',
                            color: 'white',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}>
                            {overlap.count}개
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem', fontSize: '0.85rem', color: '#6b7280' }}>
                          {overlap.publishers.map(p => publishers[p]).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋</span>
              <span>어휘 목록 정보</span>
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
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔍</span>
              <span>어휘 검색</span>
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

