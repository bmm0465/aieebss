'use client'

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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

interface Props {
  params: Promise<{ id: string }>;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

export default function GeneratedItemDetailPage({ params }: Props) {
  // 서버 사이드에서도 안전하게 실행되도록 체크
  const isClient = typeof window !== 'undefined';
  
  // 컴포넌트가 렌더링되는지 확인하기 위한 즉시 실행 로그
  if (isClient) {
    console.log('[GeneratedItemDetail] ===== COMPONENT RENDERED (CLIENT) =====');
    console.log('[GeneratedItemDetail] Current URL:', window.location.href);
    console.log('[GeneratedItemDetail] Component function executed');
  } else {
    console.log('[GeneratedItemDetail] ===== COMPONENT RENDERED (SERVER) =====');
  }
  
  const router = useRouter();
  const [item, setItem] = useState<GeneratedItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 데이터 페칭 로직을 별도 함수로 분리
  const fetchItem = useCallback(async (id: string, isRefresh = false) => {
    try {
      console.log('[GeneratedItemDetail] Fetching item:', id, 'isRefresh:', isRefresh);
      
      // 초기 로딩이 아닌 경우에만 refreshing 상태 설정
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // API가 인증을 확인하므로 클라이언트에서 중복 확인 불필요
      // API 응답에 따라 처리
      const apiUrl = `/api/generated-items/${id}`;
      console.log('[GeneratedItemDetail] Making API request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 포함
      });

      console.log('[GeneratedItemDetail] API response status:', response.status);
      console.log('[GeneratedItemDetail] API response ok:', response.ok);

      // 인증 체크 제거 - 일단 페이지는 렌더링되도록 함
      if (response.status === 401) {
        console.log('[GeneratedItemDetail] API returned 401 - showing error instead of redirecting');
        const errorData = await response.json().catch(() => ({}));
        console.log('[GeneratedItemDetail] Error details:', errorData);
        setError(errorData.error || '인증이 필요합니다. 로그인 후 다시 시도해주세요.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.details || errorData.error || '접근 권한이 없습니다.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.details || errorData.error || '문항을 찾을 수 없습니다.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const data = await response.json();
      console.log('[GeneratedItemDetail] API response data:', data);
      
      if (data.success) {
        console.log('[GeneratedItemDetail] Item loaded successfully:', data.item?.id);
        setItem(data.item);
        setError(null);
      } else {
        console.log('[GeneratedItemDetail] API returned success: false');
        setError('문항을 찾을 수 없습니다.');
      }
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('[GeneratedItemDetail] Error loading item data:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    console.log('[GeneratedItemDetail] ===== useEffect EXECUTED =====');
    console.log('[GeneratedItemDetail] useEffect dependencies:', { params, fetchItem });
    
    const initialize = async () => {
      console.log('[GeneratedItemDetail] initialize function started');
      
      try {
        // Next.js 15에서는 params가 항상 Promise입니다
        console.log('[GeneratedItemDetail] Resolving params...');
        const resolvedParams = await params;
        const id = resolvedParams.id;
        console.log('[GeneratedItemDetail] Resolved params - id:', id);
        
        if (!id) {
          console.log('[GeneratedItemDetail] No ID found');
          setError('문항 ID가 없습니다.');
          setLoading(false);
          return;
        }

        console.log('[GeneratedItemDetail] Calling fetchItem with id:', id);
        await fetchItem(id);
        console.log('[GeneratedItemDetail] fetchItem completed');
      } catch (err) {
        console.error('[GeneratedItemDetail] Error in initialize:', err);
        setError('초기화 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    console.log('[GeneratedItemDetail] Starting initialize...');
    initialize();
  }, [params, fetchItem]);

  // 토스트 메시지 자동 제거
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleApprove = async () => {
    if (!confirm('이 문항을 승인하시겠습니까?')) return;
    if (!item?.id) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/generated-items/${item.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewNotes })
      });

      const data = await response.json();
      if (data.success) {
        setToast({ message: '문항이 승인되었습니다.', type: 'success' });
        // 데이터 재검증
        await fetchItem(item.id, true);
        // 잠시 후 목록으로 이동
        setTimeout(() => {
          router.push('/teacher/generated-items');
        }, 1500);
      } else {
        setToast({ message: '승인 실패: ' + data.error, type: 'error' });
      }
    } catch (err) {
      console.error('승인 오류:', err);
      setToast({ message: '승인 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      setToast({ message: '거부 사유를 입력해주세요.', type: 'error' });
      return;
    }

    if (!confirm('이 문항을 거부하시겠습니까?')) return;
    if (!item?.id) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/generated-items/${item.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectNotes })
      });

      const data = await response.json();
      if (data.success) {
        setToast({ message: '문항이 거부되었습니다.', type: 'success' });
        // 데이터 재검증
        await fetchItem(item.id, true);
        // 잠시 후 목록으로 이동
        setTimeout(() => {
          router.push('/teacher/generated-items');
        }, 1500);
      } else {
        setToast({ message: '거부 실패: ' + data.error, type: 'error' });
      }
    } catch (err) {
      console.error('거부 오류:', err);
      setToast({ message: '거부 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    if (!item?.id) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/generated-items/${item.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewNotes })
      });

      const data = await response.json();
      if (data.success) {
        setToast({ message: '문항 검토가 완료되었습니다.', type: 'success' });
        // 데이터 재검증 (부분 로딩)
        await fetchItem(item.id, true);
      } else {
        setToast({ message: '검토 실패: ' + data.error, type: 'error' });
      }
    } catch (err) {
      console.error('검토 오류:', err);
      setToast({ message: '검토 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  console.log('[GeneratedItemDetail] Render - loading:', loading, 'error:', error, 'item:', !!item);

  if (loading) {
    console.log('[GeneratedItemDetail] Rendering loading state');
    return (
      <div style={{ 
        backgroundColor: '#ffffff', 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: '#171717',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2rem',
            fontWeight: 'bold'
          }}>📋 문항 정보를 불러오는 중...</h1>
        </div>
      </div>
    );
  }

  if (error || !item) {
    console.log('[GeneratedItemDetail] Rendering error state - error:', error, 'item:', !!item);
    return (
      <div style={{ 
        backgroundColor: '#ffffff', 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: '#171717',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '1rem'
          }}>❌ 오류 발생</h1>
          <p style={{ marginBottom: '2rem', color: '#4b5563' }}>{error || '문항 정보를 불러올 수 없습니다.'}</p>
          <Link 
            href="/teacher/generated-items"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              padding: '0.8rem 1.5rem',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            ← 목록으로 돌아가기
          </Link>
        </div>
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

  console.log('[GeneratedItemDetail] Rendering main content - item:', item?.id, 'status:', item?.status);
  
  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        backgroundColor: '#ffffff',
        backgroundSize: 'cover',
        minHeight: '100vh',
        padding: '2rem',
        color: '#171717',
        position: 'relative'
      }}>
        {/* 토스트 메시지 */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            backgroundColor: toast.type === 'success' ? '#4CAF50' : '#F44336',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease-out',
            maxWidth: '400px'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* 부분 로딩 오버레이 */}
      {refreshing && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #6366f1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }}
              />
              <p style={{ margin: 0, color: '#171717' }}>데이터를 새로고침하는 중...</p>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}

