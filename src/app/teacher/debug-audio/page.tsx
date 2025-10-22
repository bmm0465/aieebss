'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AudioDiagnostic {
  id: string;
  testType: string;
  audioUrl: string;
  createdAt: string;
  userId: string;
  studentAnswer: string;
  isCorrect: boolean;
  storageStatus: 'exists' | 'missing' | 'error';
  storagePath?: string;
  errorMessage?: string;
}

export default function AudioDiagnosticPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [diagnostics, setDiagnostics] = useState<AudioDiagnostic[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    exists: number;
    missing: number;
    errors: number;
  } | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }
      setUser(user);
    };
    checkUser();
  }, [supabase.auth]);

  const runDiagnostics = async () => {
    setLoading(true);
    setDiagnostics([]);
    
    try {
      // 최근 100개의 테스트 결과 조회
      const { data: results, error } = await supabase
        .from('test_results')
        .select('*')
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const diagnosticResults: AudioDiagnostic[] = [];

      for (const result of results || []) {
        const diagnostic: AudioDiagnostic = {
          id: result.id,
          testType: result.test_type,
          audioUrl: result.audio_url,
          createdAt: result.created_at,
          userId: result.user_id,
          studentAnswer: result.student_answer || '',
          isCorrect: result.is_correct || false,
          storageStatus: 'error'
        };

        try {
          // 먼저 Signed URL로 확인
          const { data: signedData, error: signedError } = await supabase.storage
            .from('student-recordings')
            .createSignedUrl(result.audio_url, 3600);

          if (!signedError && signedData?.signedUrl) {
            diagnostic.storageStatus = 'exists';
            diagnostic.storagePath = result.audio_url;
          } else {
            // Signed URL 실패 시 Public URL 확인
            const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/student-recordings/${result.audio_url}`;
            
            try {
              const response = await fetch(publicUrl, { method: 'HEAD' });
              if (response.ok) {
                diagnostic.storageStatus = 'exists';
                diagnostic.storagePath = result.audio_url;
              } else {
                diagnostic.storageStatus = 'missing';
                diagnostic.errorMessage = `Signed URL: ${signedError?.message || 'Unknown'}, Public URL: ${response.status}`;
              }
            } catch (fetchError) {
              diagnostic.storageStatus = 'missing';
              diagnostic.errorMessage = `Signed URL: ${signedError?.message || 'Unknown'}, Public URL: ${fetchError}`;
            }
          }
        } catch (err) {
          diagnostic.storageStatus = 'error';
          diagnostic.errorMessage = String(err);
        }

        diagnosticResults.push(diagnostic);
      }

      setDiagnostics(diagnosticResults);

      // 요약 통계 계산
      const stats = {
        total: diagnosticResults.length,
        exists: diagnosticResults.filter(d => d.storageStatus === 'exists').length,
        missing: diagnosticResults.filter(d => d.storageStatus === 'missing').length,
        errors: diagnosticResults.filter(d => d.storageStatus === 'error').length
      };
      setSummary(stats);

    } catch (error) {
      console.error('진단 실행 중 오류:', error);
      alert('진단 실행 중 오류가 발생했습니다: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exists': return '#28a745';
      case 'missing': return '#dc3545';
      case 'error': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'exists': return '✅ 존재';
      case 'missing': return '❌ 없음';
      case 'error': return '⚠️ 오류';
      default: return '❓ 알 수 없음';
    }
  };

  if (!user) {
    return <div>사용자 정보를 불러오는 중...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', color: '#333' }}>🎵 음성 파일 진단 도구</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={runDiagnostics}
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}
        >
          {loading ? '진단 중...' : '🔍 음성 파일 진단 실행'}
        </button>
      </div>

      {summary && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #dee2e6'
        }}>
          <h2 style={{ marginTop: 0, color: '#333' }}>📊 진단 결과 요약</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>{summary.total}</div>
              <div style={{ color: '#666' }}>전체 파일</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{summary.exists}</div>
              <div style={{ color: '#666' }}>정상 파일</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>{summary.missing}</div>
              <div style={{ color: '#666' }}>누락 파일</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>{summary.errors}</div>
              <div style={{ color: '#666' }}>오류 파일</div>
            </div>
          </div>
        </div>
      )}

      {diagnostics.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <h3 style={{ margin: 0, color: '#333' }}>📋 상세 진단 결과</h3>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>테스트</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>날짜</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>상태</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>경로</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>학생 답변</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.map((diagnostic) => (
                  <tr key={diagnostic.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        backgroundColor: '#e9ecef',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontWeight: 'bold'
                      }}>
                        {diagnostic.testType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666' }}>
                      {new Date(diagnostic.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        color: getStatusColor(diagnostic.storageStatus),
                        fontWeight: 'bold'
                      }}>
                        {getStatusText(diagnostic.storageStatus)}
                      </span>
                      {diagnostic.errorMessage && (
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                          {diagnostic.errorMessage}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem', color: '#666' }}>
                      {diagnostic.storagePath || 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', maxWidth: '200px', wordBreak: 'break-word' }}>
                      {diagnostic.studentAnswer || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
        <h3 style={{ marginTop: 0, color: '#0066cc' }}>💡 해결 방법</h3>
        <ul style={{ marginBottom: 0, color: '#333' }}>
          <li><strong>정상 파일:</strong> 음성 파일이 정상적으로 저장되어 재생 가능합니다.</li>
          <li><strong>누락 파일:</strong> 이전 버그로 인해 파일이 저장되지 않았습니다. 해당 평가를 다시 진행해주세요.</li>
          <li><strong>오류 파일:</strong> 파일 경로나 권한에 문제가 있을 수 있습니다. 관리자에게 문의하세요.</li>
        </ul>
      </div>
    </div>
  );
}
