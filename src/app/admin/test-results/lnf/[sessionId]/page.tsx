'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isAdmin } from '@/lib/utils/auth';

interface LNFResult {
  id: number;
  question: string;
  student_answer: string;
  is_correct: boolean;
  audio_url: string;
  created_at: string;
  error_type: string | null;
}

export default function LNFResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [results, setResults] = useState<LNFResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const checkAdminAndLoadResults = async () => {
      // LNF 테스트 결과 로드
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      // Admin 권한 확인 (이메일로 직접 확인)
      if (user.email !== 'admin@abs.com') {
        router.push('/lobby');
        return;
      }
      setIsAdminUser(true);

      try {
        // API를 통해 LNF 결과 가져오기
        const response = await fetch('/api/admin/lnf-results');
        
        if (!response.ok) {
          console.error('Failed to fetch results:', response.status);
          return;
        }
        
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoadResults();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          textAlign: 'center',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h1 style={{ color: '#FFD700' }}>⏳ 결과 로딩 중...</h1>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          textAlign: 'center',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h1 style={{ color: '#F44336' }}>❌ 접근 권한 없음</h1>
          <p>관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  const correctCount = results.filter(r => r.is_correct).length;
  const totalCount = results.length;
  const accuracy = totalCount > 0 ? ((correctCount / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                margin: 0,
                fontFamily: 'var(--font-nanum-pen)',
                color: '#FFD700',
                textShadow: '0 0 10px #FFD700'
              }}>
                🎓 LNF 테스트 결과 (관리자)
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                정확도: {accuracy}% ({correctCount}/{totalCount})
              </p>
            </div>
            <button 
              onClick={() => router.push('/lobby')}
              style={{
                backgroundColor: 'rgba(255,215,0,0.2)',
                color: '#FFD700',
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                border: '2px solid rgba(255,215,0,0.5)',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🏠 로비로
            </button>
          </div>
        </div>

        {/* 결과 테이블 */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📊 상세 결과</h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 215, 0, 0.2)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>번호</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>실제 정답</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>전사 결과</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>정답 여부</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>음성 파일</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>오류 유형</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={result.id} style={{ 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: result.is_correct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                  }}>
                    <td style={{ padding: '1rem' }}>{index + 1}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#FFD700' }}>{result.question}</td>
                    <td style={{ padding: '1rem' }}>{result.student_answer || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '15px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        backgroundColor: result.is_correct ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: result.is_correct ? '#22c55e' : '#ef4444',
                        border: `1px solid ${result.is_correct ? '#22c55e' : '#ef4444'}`
                      }}>
                        {result.is_correct ? '✅ 정답' : '❌ 오답'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {result.audio_url ? (
                        <audio controls style={{ width: '100px' }}>
                          <source src={result.audio_url} type="audio/wav" />
                          <source src={result.audio_url} type="audio/mpeg" />
                          브라우저가 오디오를 지원하지 않습니다.
                        </audio>
                      ) : (
                        <span style={{ color: '#666' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {result.error_type ? (
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          backgroundColor: 'rgba(255, 193, 7, 0.2)',
                          color: '#ffc107'
                        }}>
                          {result.error_type}
                        </span>
                      ) : (
                        <span style={{ color: '#666' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
