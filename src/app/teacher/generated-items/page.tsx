'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface GeneratedItem {
  id: string;
  test_type: string;
  grade_level: string;
  status: string;
  quality_score: number | null;
  created_at: string;
  reviewed_by: string | null;
  review_notes: string | null;
}

export default function GeneratedItemsPage() {
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('');

  useEffect(() => {
    loadItems();
  }, [statusFilter, gradeFilter]);

  const loadItems = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (gradeFilter) params.append('gradeLevel', gradeFilter);
      
      const response = await fetch(`/api/generated-items?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('문항 목록 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: '#FFA500', text: '검토 대기' },
      reviewed: { color: '#3498db', text: '검토 완료' },
      approved: { color: '#4CAF50', text: '승인됨' },
      rejected: { color: '#F44336', text: '거부됨' }
    };

    const statusInfo = statusMap[status] || { color: '#666', text: status };
    return (
      <span style={{
        padding: '0.3rem 0.8rem',
        borderRadius: '5px',
        backgroundColor: statusInfo.color + '20',
        color: statusInfo.color,
        fontSize: '0.9rem',
        fontWeight: 'bold'
      }}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      backgroundSize: 'cover',
      minHeight: '100vh',
      padding: '2rem',
      color: '#171717'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/owl.png" alt="생성된 문항" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{
                  fontSize: '2.5rem',
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  📋 생성된 문항 관리
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  생성된 문항을 검토하고 승인/거부할 수 있습니다
                </p>
              </div>
            </div>
            <Link
              href="/teacher/dashboard"
              style={{
                backgroundColor: 'rgba(255,215,0,0.2)',
                color: '#FFD700',
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                border: '2px solid rgba(255,215,0,0.5)',
                fontWeight: 'bold'
              }}
            >
              ← 대시보드로
            </Link>
          </div>
        </div>

        {/* 필터 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold', color: '#FFD700' }}>상태:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '5px',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}
            >
              <option value="">전체</option>
              <option value="pending">검토 대기</option>
              <option value="reviewed">검토 완료</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거부됨</option>
            </select>

            <label style={{ fontWeight: 'bold', color: '#FFD700', marginLeft: '1rem' }}>학년:</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '5px',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}
            >
              <option value="">전체</option>
              <option value="초등 1학년">초등 1학년</option>
              <option value="초등 2학년">초등 2학년</option>
              <option value="초등 3학년">초등 3학년</option>
              <option value="초등 4학년">초등 4학년</option>
              <option value="초등 5학년">초등 5학년</option>
              <option value="초등 6학년">초등 6학년</option>
            </select>
          </div>
        </div>

        {/* 문항 목록 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          {loading ? (
            <p>로딩 중...</p>
          ) : items.length === 0 ? (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }}>
              생성된 문항이 없습니다.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, color: '#FFD700' }}>
                          {item.test_type} - {item.grade_level}
                        </h3>
                        {getStatusBadge(item.status)}
                        {item.quality_score !== null && (
                          <span style={{ opacity: 0.7 }}>
                            품질: {item.quality_score}점
                          </span>
                        )}
                      </div>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.6 }}>
                        생성: {new Date(item.created_at).toLocaleString('ko-KR')}
                      </p>
                      {item.review_notes && (
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                          검토 의견: {item.review_notes}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/teacher/generated-items/${item.id}`}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#3498db',
                        color: 'white',
                        borderRadius: '5px',
                        textDecoration: 'none',
                        fontSize: '0.9rem'
                      }}
                    >
                      상세 보기 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

