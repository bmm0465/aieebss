'use client';

import { useState } from 'react';

const TEST_TYPES = [
  { value: '', label: '전체 교시' },
  { value: 'p1_alphabet', label: '1교시: 알파벳 인식' },
  { value: 'p2_segmental_phoneme', label: '2교시: 단어를 듣고 올바른 단어 또는 알파벳 고르기' },
  { value: 'p3_suprasegmental_phoneme', label: '3교시: 초절분절음소 인식' },
  { value: 'p4_fluency', label: '4교시: 유창성' },
  { value: 'p5_vocabulary', label: '5교시: 어휘' },
  { value: 'p6_comprehension', label: '6교시: 이해력' },
];

export default function ExcelExportButton() {
  const [selectedTestType, setSelectedTestType] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = selectedTestType
        ? `/api/teacher/export-results?test_type=${encodeURIComponent(selectedTestType)}`
        : '/api/teacher/export-results';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '엑셀 내보내기 실패');
      }
      
      // 파일 다운로드
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // 파일명 추출 (Content-Disposition 헤더에서)
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '학생평가결과.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      // 성공 알림 (선택사항)
      alert('엑셀 파일이 다운로드되었습니다.');
    } catch (error) {
      console.error('엑셀 내보내기 오류:', error);
      alert(`엑셀 내보내기 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={selectedTestType}
        onChange={(e) => setSelectedTestType(e.target.value)}
        style={{
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          backgroundColor: '#ffffff',
          color: '#1f2937',
          fontSize: '0.9rem',
          fontWeight: '500',
          cursor: 'pointer',
          minWidth: '200px',
        }}
        disabled={isExporting}
      >
        {TEST_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          background: isExporting
            ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '0.6rem 1.2rem',
          borderRadius: '8px',
          border: 'none',
          fontWeight: '600',
          fontSize: '0.9rem',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isExporting
            ? 'none'
            : '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
          opacity: isExporting ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {isExporting ? (
          <>
            <span>⏳</span>
            <span>내보내는 중...</span>
          </>
        ) : (
          <>
            <span>📊</span>
            <span>엑셀 내보내기</span>
          </>
        )}
      </button>
    </div>
  );
}
