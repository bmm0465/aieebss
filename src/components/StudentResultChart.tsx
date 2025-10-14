'use client'

import React from 'react';

type ProcessedTestStats = {
  LNF: { correct: number; total: number; accuracy: number };
  PSF: { correct: number; total: number; accuracy: number };
  NWF: { correct: number; total: number; accuracy: number };
  WRF: { correct: number; total: number; accuracy: number };
  ORF: { avg_wcpm: number; avg_accuracy: number; count: number };
  MAZE: { correct: number; total: number; accuracy: number };
};

interface Props {
  stats: ProcessedTestStats;
}

export default function StudentResultChart({ stats }: Props) {
  // 차트 데이터 준비
  const chartData = [
    { label: 'LNF', value: stats.LNF.accuracy, color: '#FF6384' },
    { label: 'PSF', value: stats.PSF.accuracy, color: '#36A2EB' },
    { label: 'NWF', value: stats.NWF.accuracy, color: '#FFCE56' },
    { label: 'WRF', value: stats.WRF.accuracy, color: '#4BC0C0' },
    { label: 'ORF', value: stats.ORF.avg_accuracy, color: '#9966FF' },
    { label: 'MAZE', value: stats.MAZE.accuracy, color: '#FF9F40' }
  ];

  const maxValue = 100; // 정확도는 100%가 최대

  return (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '2rem',
      borderRadius: '15px',
      marginBottom: '2rem',
      border: '1px solid rgba(255, 215, 0, 0.3)'
    }}>
      <h2 style={{ color: '#FFD700', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
        📈 테스트별 정확도 비교
      </h2>

      {/* 막대 차트 */}
      <div style={{ marginBottom: '2rem' }}>
        {chartData.map((item, index) => (
          <div key={index} style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <span style={{ fontWeight: 'bold' }}>{item.label}</span>
              <span style={{ color: item.value >= 80 ? '#4CAF50' : item.value >= 60 ? '#FF9800' : '#F44336' }}>
                {item.value.toFixed(1)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '30px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '15px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${(item.value / maxValue) * 100}%`,
                height: '100%',
                backgroundColor: item.color,
                borderRadius: '15px',
                transition: 'width 0.5s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '0.5rem'
              }}>
                {item.value > 10 && (
                  <span style={{ 
                    color: 'white', 
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>
                    {item.value.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 레이더 차트 (간단한 육각형 시각화) */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.3rem' }}>
          🎯 종합 역량 분석
        </h3>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '2rem'
        }}>
          <RadarChart data={chartData} />
        </div>
      </div>

      {/* 평가 코멘트 */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 215, 0, 0.3)'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.2rem' }}>
          💡 종합 평가
        </h3>
        <div style={{ lineHeight: '1.8' }}>
          {generateComment(stats)}
        </div>
      </div>
    </div>
  );
}

// 레이더 차트 컴포넌트 (SVG 기반)
function RadarChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const size = 300;
  const center = size / 2;
  const maxRadius = size / 2 - 40;
  const angleStep = (Math.PI * 2) / data.length;

  // 포인트 계산
  const points = data.map((item, index) => {
    const angle = angleStep * index - Math.PI / 2; // 시작점을 위로
    const radius = (item.value / 100) * maxRadius;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return { x, y, angle, label: item.label, value: item.value };
  });

  // 폴리곤 포인트 문자열
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // 배경 그리드 (동심원)
  const gridCircles = [0.2, 0.4, 0.6, 0.8, 1.0].map(ratio => ({
    radius: maxRadius * ratio,
    opacity: 0.1 + (ratio * 0.1)
  }));

  return (
    <svg width={size} height={size} style={{ filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))' }}>
      {/* 배경 동심원 */}
      {gridCircles.map((circle, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={circle.radius}
          fill="none"
          stroke="rgba(255, 215, 0, 0.2)"
          strokeWidth="1"
        />
      ))}

      {/* 축 선 */}
      {points.map((point, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={center + Math.cos(point.angle) * maxRadius}
          y2={center + Math.sin(point.angle) * maxRadius}
          stroke="rgba(255, 215, 0, 0.3)"
          strokeWidth="1"
        />
      ))}

      {/* 데이터 폴리곤 */}
      <polygon
        points={polygonPoints}
        fill="rgba(255, 215, 0, 0.2)"
        stroke="#FFD700"
        strokeWidth="2"
      />

      {/* 데이터 포인트 */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="5"
          fill={data[i].color}
          stroke="white"
          strokeWidth="2"
        />
      ))}

      {/* 라벨 */}
      {points.map((point, i) => {
        const labelAngle = angleStep * i - Math.PI / 2;
        const labelRadius = maxRadius + 25;
        const labelX = center + Math.cos(labelAngle) * labelRadius;
        const labelY = center + Math.sin(labelAngle) * labelRadius;
        
        return (
          <text
            key={i}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FFD700"
            fontSize="14"
            fontWeight="bold"
          >
            {point.label}
          </text>
        );
      })}
    </svg>
  );
}

// 종합 평가 코멘트 생성
function generateComment(stats: ProcessedTestStats): React.ReactNode {
  const accuracies = [
    stats.LNF.accuracy,
    stats.PSF.accuracy,
    stats.NWF.accuracy,
    stats.WRF.accuracy,
    stats.ORF.avg_accuracy,
    stats.MAZE.accuracy
  ];

  const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  const strongAreas: string[] = [];
  const weakAreas: string[] = [];

  const testNames = {
    LNF: '알파벳 인식',
    PSF: '음소 분리',
    NWF: '파닉스 적용',
    WRF: '단어 인지',
    ORF: '유창성',
    MAZE: '독해력'
  };

  if (stats.LNF.accuracy >= 80) strongAreas.push(testNames.LNF);
  else if (stats.LNF.accuracy < 60) weakAreas.push(testNames.LNF);

  if (stats.PSF.accuracy >= 80) strongAreas.push(testNames.PSF);
  else if (stats.PSF.accuracy < 60) weakAreas.push(testNames.PSF);

  if (stats.NWF.accuracy >= 80) strongAreas.push(testNames.NWF);
  else if (stats.NWF.accuracy < 60) weakAreas.push(testNames.NWF);

  if (stats.WRF.accuracy >= 80) strongAreas.push(testNames.WRF);
  else if (stats.WRF.accuracy < 60) weakAreas.push(testNames.WRF);

  if (stats.ORF.avg_accuracy >= 80) strongAreas.push(testNames.ORF);
  else if (stats.ORF.avg_accuracy < 60) weakAreas.push(testNames.ORF);

  if (stats.MAZE.accuracy >= 80) strongAreas.push(testNames.MAZE);
  else if (stats.MAZE.accuracy < 60) weakAreas.push(testNames.MAZE);

  return (
    <div>
      <p style={{ marginBottom: '1rem' }}>
        <strong>전체 평균 정확도:</strong> {' '}
        <span style={{ 
          fontSize: '1.2rem',
          color: avgAccuracy >= 80 ? '#4CAF50' : avgAccuracy >= 60 ? '#FF9800' : '#F44336'
        }}>
          {avgAccuracy.toFixed(1)}%
        </span>
      </p>

      {strongAreas.length > 0 && (
        <p style={{ marginBottom: '1rem' }}>
          <strong style={{ color: '#4CAF50' }}>✓ 강점 영역:</strong> {strongAreas.join(', ')}
        </p>
      )}

      {weakAreas.length > 0 && (
        <p style={{ marginBottom: '1rem' }}>
          <strong style={{ color: '#FF9800' }}>⚠ 개선 필요 영역:</strong> {weakAreas.join(', ')}
        </p>
      )}

      {stats.ORF.count > 0 && (
        <p style={{ marginBottom: '1rem' }}>
          <strong>ORF 상세:</strong> 평균 {stats.ORF.avg_wcpm.toFixed(0)} WCPM (분당 정확 단어 수)
        </p>
      )}

      <p style={{ opacity: 0.8, fontSize: '0.9rem', fontStyle: 'italic', marginTop: '1rem' }}>
        {avgAccuracy >= 80 
          ? '전반적으로 우수한 읽기 능력을 보이고 있습니다. 지속적인 연습을 통해 더욱 발전할 수 있습니다.'
          : avgAccuracy >= 60
          ? '기본적인 읽기 능력을 갖추고 있으나, 일부 영역에서 추가 연습이 필요합니다.'
          : '읽기 기초 능력 향상을 위한 집중적인 지도가 필요합니다. 약점 영역을 중심으로 개별 지도를 권장합니다.'}
      </p>
    </div>
  );
}

