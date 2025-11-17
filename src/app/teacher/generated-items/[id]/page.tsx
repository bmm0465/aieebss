'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface GeneratedItemDetail {
  id: string;
  test_type: string;
  grade_level: string;
  items: Record<string, unknown>;
  status: string;
  quality_score: number | null;
  review_notes: string | null;
  created_at: string;
  workflow: Array<{
    id: string;
    action: string;
    notes: string | null;
    created_at: string;
  }>;
}

export default function GeneratedItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<GeneratedItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAuthAndLoadItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, params.id]);

  const checkAuthAndLoadItem = async () => {
    try {
      // 먼저 인증 확인
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('인증 오류:', userError);
        setRedirecting(true);
        router.push('/');
        return;
      }

      // 교사 권한 확인
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'teacher') {
        setRedirecting(true);
        router.push('/lobby');
        return;
      }

      setAuthChecked(true);
      
      // 인증 확인 후 문항 로드
      await loadItem();
    } catch (err) {
      console.error('인증 확인 오류:', err);
      setRedirecting(true);
      router.push('/');
    }
  };

  const loadItem = async () => {
    try {
      const response = await fetch(`/api/generated-items/${params.id}`);
      
      if (response.status === 401) {
        // 인증 실패 시 로그인 페이지로 리다이렉트
        router.push('/');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setItem(data.item);
      } else {
        console.error('문항 로드 실패:', data.error);
      }
    } catch (err) {
      console.error('문항 상세 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('이 문항을 승인하시겠습니까?')) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/generated-items/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewNotes })
      });

      const data = await response.json();
      if (data.success) {
        alert('문항이 승인되었습니다.');
        router.push('/teacher/generated-items');
      } else {
        alert('승인 실패: ' + data.error);
      }
    } catch (err) {
      console.error('승인 오류:', err);
      alert('승인 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      alert('거부 사유를 입력해주세요.');
      return;
    }

    if (!confirm('이 문항을 거부하시겠습니까?')) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/generated-items/${params.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectNotes })
      });

      const data = await response.json();
      if (data.success) {
        alert('문항이 거부되었습니다.');
        router.push('/teacher/generated-items');
      } else {
        alert('거부 실패: ' + data.error);
      }
    } catch (err) {
      console.error('거부 오류:', err);
      alert('거부 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/generated-items/${params.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewNotes })
      });

      const data = await response.json();
      if (data.success) {
        alert('문항 검토가 완료되었습니다.');
        loadItem();
      } else {
        alert('검토 실패: ' + data.error);
      }
    } catch (err) {
      console.error('검토 오류:', err);
      alert('검토 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 클라이언트 마운트 전이나 리다이렉트 중에는 로딩 화면만 표시
  if (!mounted || redirecting || !authChecked || loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        로딩 중...
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        문항을 찾을 수 없습니다.
      </div>
    );
  }

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
              <Image src="/owl.png" alt="문항 상세" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{
                  fontSize: '2.5rem',
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  📋 문항 상세
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  {item.test_type} - {item.grade_level} {getStatusBadge(item.status)}
                </p>
              </div>
            </div>
            <Link
              href="/teacher/generated-items"
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
              ← 목록으로
            </Link>
          </div>
        </div>

        {/* 승인/거부 액션 */}
        {item.status === 'pending' || item.status === 'reviewed' ? (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>검토 및 승인</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                검토 의견
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 215, 0, 0.3)'
                }}
                placeholder="검토 의견을 입력하세요..."
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                거부 사유 (거부하는 경우)
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 215, 0, 0.3)'
                }}
                placeholder="거부 사유를 입력하세요..."
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleReview}
                disabled={actionLoading}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                검토 완료
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                승인
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectNotes.trim()}
                style={{
                  padding: '0.8rem 1.5rem',
                  backgroundColor: '#F44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: actionLoading || !rejectNotes.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: actionLoading || !rejectNotes.trim() ? 0.5 : 1
                }}
              >
                거부
              </button>
            </div>
          </div>
        ) : null}

        {/* 문항 내용 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>문항 내용</h2>
          <pre style={{
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            overflow: 'auto',
            maxHeight: '600px'
          }}>
            {JSON.stringify(item.items, null, 2)}
          </pre>
        </div>

        {/* 워크플로우 이력 */}
        {item.workflow && item.workflow.length > 0 && (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '2rem',
            borderRadius: '15px',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>승인 이력</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {item.workflow.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <strong>{entry.action}</strong>
                      <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>
                        {new Date(entry.created_at).toLocaleString('ko-KR')}
                      </p>
                      {entry.notes && (
                        <p style={{ marginTop: '0.5rem' }}>{entry.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

