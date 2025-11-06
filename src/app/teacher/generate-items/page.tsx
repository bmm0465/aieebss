'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type GeneratedItems = {
  LNF?: string[];
  PSF?: string[];
  NWF?: string[];
  WRF?: string[];
  ORF?: string;
  MAZE?: Array<{
    num: number;
    sentence: string;
    choices: string[];
    answer: string;
  }>;
};

export default function GenerateItemsPage() {
  const [testTypes, setTestTypes] = useState<string[]>([]);
  const [gradeLevel, setGradeLevel] = useState('초등 3학년');
  const [referenceDocument, setReferenceDocument] = useState('');
  const [selectedPDFs, setSelectedPDFs] = useState<string[]>([]);
  const [availablePDFs, setAvailablePDFs] = useState<Array<{ id: string; filename: string; grade_level: string | null }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItems | null>(null);
  const [qualityScore, setQualityScore] = useState<{
    overall: number;
    dibels_compliance: number;
    grade_level_appropriateness: number;
    curriculum_alignment: number;
    difficulty_appropriateness: number;
    grammar_accuracy: number;
    issues?: string[];
    suggestions?: string[];
  } | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const testTypeOptions = [
    { value: 'LNF', label: 'LNF - 알파벳 인식 (200개)' },
    { value: 'PSF', label: 'PSF - 음소 분리 (100개)' },
    { value: 'NWF', label: 'NWF - 파닉스 적용 (150개)' },
    { value: 'WRF', label: 'WRF - Sight Words (85개)' },
    { value: 'ORF', label: 'ORF - 읽기 유창성 지문 (150단어)' },
    { value: 'MAZE', label: 'MAZE - 독해력 평가 (20문항)' }
  ];

  // PDF 목록 로드
  useEffect(() => {
    const loadPDFs = async () => {
      try {
        const response = await fetch('/api/curriculum/pdfs');
        const data = await response.json();
        if (data.success) {
          setAvailablePDFs(
            (data.pdfs as Array<{ id: string; filename: string; grade_level: string | null; status: string }>)
              .filter((pdf) => pdf.status === 'completed')
          );
        }
      } catch (err) {
        console.error('PDF 목록 로드 오류:', err);
      }
    };
    loadPDFs();
  }, []);

  const handleTestTypeToggle = (type: string) => {
    setTestTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (testTypes.length === 0) {
      setError('최소 1개 이상의 평가 유형을 선택해주세요.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedItems(null);
    setQualityScore(null);
    setItemId(null);

    try {
      // Agent 기반 API 사용
      const response = await fetch('/api/agents/generate-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testTypes,
          gradeLevel,
          pdfIds: selectedPDFs.length > 0 ? selectedPDFs : undefined,
          referenceDocument: referenceDocument.trim() || undefined
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '문항 생성 실패');
      }

      setGeneratedItems(data.items);
      setQualityScore(data.qualityScore);
      setItemId(data.itemId);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '문항 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedItems) return;

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: generatedItems,
          title: `DIBELS 8th Edition - ${gradeLevel}`,
          gradeLevel
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'PDF 생성 실패');
      }

      // HTML을 새 창에서 열어 인쇄하도록 함
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        
        // 인쇄 대화상자 자동 열기
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'PDF 생성 중 오류가 발생했습니다.');
    }
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
              <Image src="/owl.png" alt="문항 생성" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  🤖 AI 문항 생성기
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  LLM을 활용하여 DIBELS 평가 문항을 자동 생성합니다
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

        {/* 설정 패널 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
            ⚙️ 문항 생성 설정
          </h2>

          {/* 학년 선택 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#FFD700'
            }}>
              📚 학년 수준
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '2px solid rgba(255, 215, 0, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
            >
              <option value="초등 1학년">초등 1학년</option>
              <option value="초등 2학년">초등 2학년</option>
              <option value="초등 3학년">초등 3학년</option>
              <option value="초등 4학년">초등 4학년</option>
              <option value="초등 5학년">초등 5학년</option>
              <option value="초등 6학년">초등 6학년</option>
            </select>
          </div>

          {/* 평가 유형 선택 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#FFD700'
            }}>
              📝 생성할 평가 유형 (다중 선택 가능)
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              {testTypeOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleTestTypeToggle(option.value)}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: testTypes.includes(option.value)
                      ? '3px solid #FFD700'
                      : '2px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: testTypes.includes(option.value)
                      ? 'rgba(255, 215, 0, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    fontWeight: testTypes.includes(option.value) ? 'bold' : 'normal'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {testTypes.includes(option.value) && '✓ '}
                  {option.label}
                </div>
              ))}
            </div>
          </div>

          {/* PDF 선택 */}
          {availablePDFs.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold',
                color: '#FFD700'
              }}>
                📚 참고할 교육과정 PDF (선택사항)
              </label>
              <p style={{ 
                fontSize: '0.9rem', 
                opacity: 0.7, 
                marginBottom: '0.5rem' 
              }}>
                업로드된 PDF를 선택하면 해당 내용을 참고하여 문항을 생성합니다
              </p>
              <div style={{
                display: 'grid',
                gap: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '1rem',
                border: '2px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }}>
                {availablePDFs.map((pdf) => (
                  <label
                    key={pdf.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPDFs.includes(pdf.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPDFs([...selectedPDFs, pdf.id]);
                        } else {
                          setSelectedPDFs(selectedPDFs.filter(id => id !== pdf.id));
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span>{pdf.filename}</span>
                    {pdf.grade_level && (
                      <span style={{ marginLeft: '0.5rem', opacity: 0.7, fontSize: '0.9rem' }}>
                        ({pdf.grade_level})
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <Link
                href="/teacher/curriculum/pdfs"
                style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  color: '#FFD700',
                  textDecoration: 'underline',
                  fontSize: '0.9rem'
                }}
              >
                PDF 관리 페이지로 이동 →
              </Link>
            </div>
          )}

          {/* 참고 문서 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#FFD700'
            }}>
              📄 참고 문서 (선택사항)
            </label>
            <p style={{ 
              fontSize: '0.9rem', 
              opacity: 0.7, 
              marginBottom: '0.5rem' 
            }}>
              LLM이 문항을 생성할 때 참고할 내용을 입력하세요 (예: 특정 주제, 어휘 목록, 교육과정 등)
            </p>
            <textarea
              value={referenceDocument}
              onChange={(e) => setReferenceDocument(e.target.value)}
              placeholder="예시: 동물 관련 단어를 중심으로 생성해주세요..."
              rows={6}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '2px solid rgba(255, 215, 0, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || testTypes.length === 0}
            style={{
              width: '100%',
              padding: '1.2rem',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: isGenerating || testTypes.length === 0
                ? 'rgba(150, 150, 150, 0.5)'
                : '#FFD700',
              color: isGenerating || testTypes.length === 0 ? '#666' : 'black',
              cursor: isGenerating || testTypes.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (!isGenerating && testTypes.length > 0) {
                e.currentTarget.style.backgroundColor = '#FFC700';
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating && testTypes.length > 0) {
                e.currentTarget.style.backgroundColor = '#FFD700';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {isGenerating ? '⏳ 문항 생성 중...' : '✨ 문항 생성하기'}
          </button>

          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'rgba(231, 76, 60, 0.2)',
              border: '2px solid rgba(231, 76, 60, 0.5)',
              borderRadius: '8px',
              color: '#ff6b6b'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* 생성 결과 */}
        {generatedItems && (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '2rem',
            borderRadius: '15px',
            border: '1px solid rgba(76, 175, 80, 0.5)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ color: '#4CAF50', margin: 0, fontSize: '1.8rem' }}>
                ✅ 문항 생성 완료!
              </h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {itemId && (
                  <Link
                    href={`/teacher/generated-items/${itemId}`}
                    style={{
                      padding: '0.8rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#3498db',
                      color: 'white',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    📋 상세 보기
                  </Link>
                )}
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    padding: '0.8rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#c0392b';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#e74c3c';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  📥 PDF로 다운로드
                </button>
              </div>
            </div>

            {/* 품질 점수 표시 */}
            {qualityScore && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: '#4CAF50', marginBottom: '0.5rem' }}>품질 점수: {qualityScore.overall}점</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>DIBELS 준수도: {qualityScore.dibels_compliance}점</div>
                  <div>학년 수준 적합성: {qualityScore.grade_level_appropriateness}점</div>
                  <div>교육과정 부합도: {qualityScore.curriculum_alignment}점</div>
                  <div>난이도 적절성: {qualityScore.difficulty_appropriateness}점</div>
                  <div>문법 정확성: {qualityScore.grammar_accuracy}점</div>
                </div>
                {qualityScore.issues && qualityScore.issues.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>⚠️ 이슈:</strong>
                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                      {qualityScore.issues.map((issue: string, idx: number) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {qualityScore.suggestions && qualityScore.suggestions.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>💡 제안:</strong>
                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                      {qualityScore.suggestions.map((suggestion: string, idx: number) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 생성된 문항 미리보기 */}
            <div style={{ 
              maxHeight: '600px', 
              overflowY: 'auto',
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px'
            }}>
              {generatedItems.LNF && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#FFD700' }}>LNF ({generatedItems.LNF.length}개)</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(20, 1fr)', 
                    gap: '0.5rem',
                    fontSize: '0.9rem'
                  }}>
                    {generatedItems.LNF.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '0.3rem',
                        textAlign: 'center',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        borderRadius: '3px'
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedItems.PSF && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#FFD700' }}>PSF ({generatedItems.PSF.length}개)</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(10, 1fr)', 
                    gap: '0.5rem'
                  }}>
                    {generatedItems.PSF.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '0.5rem',
                        textAlign: 'center',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        borderRadius: '3px'
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedItems.NWF && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#FFD700' }}>NWF ({generatedItems.NWF.length}개)</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(10, 1fr)', 
                    gap: '0.5rem'
                  }}>
                    {generatedItems.NWF.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '0.5rem',
                        textAlign: 'center',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        borderRadius: '3px'
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedItems.WRF && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#FFD700' }}>WRF ({generatedItems.WRF.length}개)</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(10, 1fr)', 
                    gap: '0.5rem'
                  }}>
                    {generatedItems.WRF.map((item, idx) => (
                      <div key={idx} style={{
                        padding: '0.5rem',
                        textAlign: 'center',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        borderRadius: '3px'
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedItems.ORF && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#FFD700' }}>ORF (읽기 유창성 지문)</h3>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.8'
                  }}>
                    {generatedItems.ORF}
                  </div>
                </div>
              )}

              {generatedItems.MAZE && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#FFD700' }}>MAZE ({generatedItems.MAZE.length}개)</h3>
                  {generatedItems.MAZE.map((q) => (
                    <div key={q.num} style={{
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #e74c3c'
                    }}>
                      <div><strong>문항 {q.num}:</strong> {q.sentence}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {q.choices.map((choice, idx) => (
                          <span 
                            key={idx}
                            style={{
                              padding: '0.3rem 0.8rem',
                              borderRadius: '5px',
                              backgroundColor: choice === q.answer 
                                ? 'rgba(76, 175, 80, 0.3)' 
                                : 'rgba(255, 255, 255, 0.1)',
                              border: choice === q.answer 
                                ? '2px solid #4CAF50' 
                                : '1px solid rgba(255, 255, 255, 0.2)',
                              color: choice === q.answer ? '#4CAF50' : 'white'
                            }}
                          >
                            {choice} {choice === q.answer && '✓'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

