'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface PDF {
  id: string;
  filename: string;
  file_size: number;
  grade_level: string | null;
  subject: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
}

export default function CurriculumPDFsPage() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    try {
      const response = await fetch('/api/curriculum/pdfs');
      const data = await response.json();
      if (data.success) {
        setPdfs(data.pdfs || []);
      }
    } catch (err) {
      console.error('PDF 목록 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('파일 크기는 100MB를 초과할 수 없습니다.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('gradeLevel', '');
    formData.append('subject', '');

    try {
      const response = await fetch('/api/curriculum/pdfs/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        await loadPDFs();
        alert('PDF가 업로드되었습니다. 처리 중입니다...');
      } else {
        setError(data.error || '업로드 실패');
      }
    } catch (err) {
      console.error('업로드 오류:', err);
      setError('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      processing: { color: '#FFA500', text: '처리 중' },
      completed: { color: '#4CAF50', text: '완료' },
      failed: { color: '#F44336', text: '실패' }
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
              <Image src="/owl.png" alt="교육과정 PDF" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{
                  fontSize: '2.5rem',
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  📚 교육과정 PDF 관리
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  교육과정 문서나 교재 PDF를 업로드하여 문항 생성에 활용하세요
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

        {/* 업로드 섹션 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>📤 PDF 업로드</h2>
          <div style={{
            border: '2px dashed rgba(255, 215, 0, 0.5)',
            borderRadius: '10px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                backgroundColor: uploading ? '#ccc' : '#FFD700',
                color: uploading ? '#666' : '#000',
                borderRadius: '8px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              {uploading ? '⏳ 업로드 중...' : '📄 PDF 파일 선택'}
            </label>
            <p style={{ marginTop: '1rem', opacity: 0.7 }}>
              최대 100MB까지 업로드 가능합니다
            </p>
            {error && (
              <p style={{ marginTop: '1rem', color: '#F44336' }}>
                ⚠️ {error}
              </p>
            )}
          </div>
        </div>

        {/* PDF 목록 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem' }}>📋 업로드된 PDF 목록</h2>
          {loading ? (
            <p>로딩 중...</p>
          ) : pdfs.length === 0 ? (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }}>
              업로드된 PDF가 없습니다.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#FFD700' }}>
                        {pdf.filename}
                      </h3>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <span style={{ opacity: 0.7 }}>📦 {formatFileSize(pdf.file_size)}</span>
                        {pdf.grade_level && <span style={{ opacity: 0.7 }}>🎓 {pdf.grade_level}</span>}
                        {pdf.subject && <span style={{ opacity: 0.7 }}>📖 {pdf.subject}</span>}
                        {getStatusBadge(pdf.status)}
                      </div>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.6 }}>
                        업로드: {new Date(pdf.created_at).toLocaleString('ko-KR')}
                        {pdf.processed_at && (
                          <> | 처리: {new Date(pdf.processed_at).toLocaleString('ko-KR')}</>
                        )}
                      </p>
                    </div>
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

