'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { TeacherAudioPlayer } from '@/components/TeacherAudioPlayer';
import LogoutButton from '@/components/LogoutButton';

interface TestResultRow {
  id: number;
  user_id: string;
  test_type: string;
  question: string | null;
  correct_answer: string | null;
  student_answer: string | null;
  is_correct: boolean | null;
  created_at: string;
  audio_url?: string | null;
  transcription_results?: {
    openai?: { text?: string; confidence?: string; timeline?: unknown[] };
    gemini?: { text?: string; confidence?: string; timeline?: unknown[] };
    aws?: { text?: string; confidence?: string; timeline?: unknown[] };
    azure?: { text?: string; confidence?: string; timeline?: unknown[] };
  } | null;
}

interface StudentInfo {
  id: string;
  full_name: string | null;
  class_name: string | null;
  student_number: string | null;
}

interface Review {
  test_result_id: number;
  review_type: number | null;
  notes?: string | null;
}

interface Statistics {
  total: number;
  by_type: Record<string, number>;
  percentages: Record<string, number>;
  transcription_accuracy: number;
  scoring_accuracy: number;
}

// 테이블 행 컴포넌트
function ResultRow({
  result,
  student,
  review,
  onSave,
  saving
}: {
  result: TestResultRow;
  student?: StudentInfo;
  review?: Review;
  onSave: (testResultId: number, reviewType: number | null, notes?: string) => void;
  saving: boolean;
}) {
  const [selectedType, setSelectedType] = useState<number>(review?.review_type || 0);
  const [notes, setNotes] = useState<string>(review?.notes || '');
  const [showNotes, setShowNotes] = useState<boolean>(!!review?.notes);

  const transcriptionText = result.transcription_results?.openai?.text 
    || result.transcription_results?.gemini?.text
    || result.transcription_results?.aws?.text
    || result.transcription_results?.azure?.text
    || result.student_answer
    || '-';

  const reviewTypeOptions = [
    { value: 1, label: '유형 1: 정답 발화→정확한 전사→정답' },
    { value: 2, label: '유형 2: 정답 발화→정확한 전사→오답' },
    { value: 3, label: '유형 3: 정답 발화→부정확한 전사→정답' },
    { value: 4, label: '유형 4: 정답 발화→부정확한 전사→오답' },
    { value: 5, label: '유형 5: 오답 발화→정확한 전사→정답' },
    { value: 6, label: '유형 6: 오답 발화→정확한 전사→오답' },
    { value: 7, label: '유형 7: 오답 발화→부정확한 전사→정답' },
    { value: 8, label: '유형 8: 오답 발화→부정확한 전사→오답' },
    { value: 9, label: '유형 9: 발화 없음→부정확한 전사→정답' },
    { value: 10, label: '유형 10: 발화 없음→부정확한 전사→오답' },
    { value: 11, label: '유형 11: 발화 수정→정확한 전사→정답' },
    { value: 12, label: '유형 12: 발화 수정→정확한 전사→오답' },
    { value: 13, label: '유형 13: 발화 수정→부정확한 전사→정답' },
    { value: 14, label: '유형 14: 발화 수정→부정확한 전사→오답' },
  ];

  // 리뷰가 업데이트되면 로컬 상태도 업데이트
  useEffect(() => {
    if (review) {
      setSelectedType(review.review_type || 0);
      setNotes(review.notes || '');
      setShowNotes(!!review.notes);
    }
  }, [review]);

  return (
    <>
      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
        <td style={{ padding: '1rem' }}>
          {student?.full_name || '이름 없음'}
          {student?.class_name && ` (${student.class_name}반)`}
        </td>
        <td style={{ padding: '1rem' }}>
          {result.test_type === 'p1_alphabet' ? '1교시' : '4교시'}
        </td>
        <td style={{ padding: '1rem', fontWeight: '600' }}>
          {result.correct_answer || result.question || '-'}
        </td>
        <td style={{ padding: '1rem' }}>
          {result.audio_url ? (
            <TeacherAudioPlayer
              audioPath={result.audio_url}
              userId={result.user_id}
              testType={result.test_type}
              createdAt={result.created_at}
            />
          ) : (
            <span style={{ color: '#9ca3af' }}>-</span>
          )}
        </td>
        <td style={{ padding: '1rem', maxWidth: '200px', wordBreak: 'break-word' }}>
          {transcriptionText}
        </td>
        <td style={{ padding: '1rem' }}>
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            backgroundColor: result.is_correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: result.is_correct ? '#10b981' : '#ef4444',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>
            {result.is_correct ? '정답' : '오답'}
          </span>
        </td>
        <td style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(Number(e.target.value))}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
                minWidth: '250px'
              }}
            >
              <option value="0">선택 안 함</option>
              {reviewTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {review?.review_type === null && (
              <span style={{
                fontSize: '0.75rem',
                color: '#ef4444',
                fontWeight: '600'
              }}>
                ⚠️ 재검토 필요
              </span>
            )}
            {(review?.notes || notes) && (
              <button
                onClick={() => setShowNotes(!showNotes)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: '#f9fafb',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                📝 메모 {showNotes ? '숨기기' : '보기'}
              </button>
            )}
          </div>
        </td>
        <td style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => {
                // "선택 안 함" (0)일 때도 저장 가능 (리뷰 삭제)
                onSave(result.id, selectedType, notes.trim() || undefined);
              }}
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: saving ? '#9ca3af' : selectedType > 0 ? '#6366f1' : '#ef4444',
                color: 'white',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                fontSize: '0.875rem'
              }}
            >
              {saving ? '저장 중...' : selectedType === 0 ? '리뷰 삭제' : '저장'}
            </button>
            {selectedType > 0 && (
              <button
                onClick={() => setShowNotes(!showNotes)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: showNotes ? '#e5e7eb' : '#f9fafb',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                {showNotes ? '메모 숨기기' : '메모 작성'}
              </button>
            )}
          </div>
        </td>
      </tr>
      {showNotes && (
        <tr style={{ backgroundColor: '#f9fafb' }}>
          <td colSpan={8} style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                특이사항 / 메모
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="이 유형을 선택한 이유를 작성해주세요. 예: 학생이 'cat'을 발화했지만 전사 결과가 'kat'로 나왔고, 채점 시스템이 이를 오답으로 처리함"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '80px',
                  maxHeight: '200px'
                }}
                rows={3}
              />
              {review?.notes && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  whiteSpace: 'pre-wrap'
                }}>
                  <strong>기존 메모:</strong><br />
                  {review.notes}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function TranscriptionAccuracyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResultRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentInfo>>({});
  const [reviews, setReviews] = useState<Record<number, Review>>({});
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [savingReview, setSavingReview] = useState<Record<number, boolean>>({});

  // 필터링은 서버에서 이미 적용되므로 그대로 사용
  const filteredResults = testResults;

  // 통계 로드
  const loadStatistics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTestType !== 'all') {
        params.append('test_type', selectedTestType);
      }

      const response = await fetch(`/api/teacher/transcription-accuracy/statistics?${params.toString()}`);
      if (!response.ok) throw new Error('통계를 불러올 수 없습니다.');

      const data = await response.json();
      setStatistics(data);
    } catch (err: unknown) {
      console.error('통계 로드 오류:', err);
    }
  }, [selectedTestType]);

  // 초기 데이터 로드 (학생 목록만)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
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
          setError('교사 권한이 필요합니다.');
          return;
        }

        // 담당 학생 목록 가져오기
        const { data: assignments } = await supabase
          .from('teacher_student_assignments')
          .select('student_id')
          .eq('teacher_id', user.id);

        if (!assignments || assignments.length === 0) {
          setLoading(false);
          return;
        }

        const studentIds = assignments.map(a => a.student_id);

        // 학생 정보 가져오기
        const { data: studentProfiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, class_name, student_number')
          .in('id', studentIds);

        const studentsMap: Record<string, StudentInfo> = {};
        if (studentProfiles) {
          studentProfiles.forEach(s => {
            studentsMap[s.id] = s;
          });
        }
        setStudents(studentsMap);

        setLoading(false);
      } catch (err: unknown) {
        console.error('초기 데이터 로드 오류:', err);
        const errorMessage = err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.';
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadInitialData();
  }, [router]);

  // 필터에 따라 테스트 결과 로드
  const loadTestResults = useCallback(async () => {
    if (selectedTestType === 'all' && selectedStudent === 'all') {
      // 필터가 모두 'all'이면 데이터를 로드하지 않음
      setTestResults([]);
      setReviews({});
      setStatistics(null);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // 담당 학생 목록 가져오기
      const { data: assignments } = await supabase
        .from('teacher_student_assignments')
        .select('student_id')
        .eq('teacher_id', user.id);

      if (!assignments || assignments.length === 0) {
        setTestResults([]);
        setLoading(false);
        return;
      }

      const allStudentIds = assignments.map(a => a.student_id);
      
      // 필터링할 학생 ID 목록
      const studentIds = selectedStudent === 'all' 
        ? allStudentIds 
        : [selectedStudent];

      // 테스트 결과 가져오기 (필터 적용)
      let query = supabase
        .from('test_results')
        .select('id, user_id, test_type, question, correct_answer, student_answer, is_correct, created_at, audio_url, transcription_results')
        .in('user_id', studentIds)
        .in('test_type', ['p1_alphabet', 'p4_phonics'])
        .order('created_at', { ascending: false });

      // 교시 필터 적용
      if (selectedTestType !== 'all') {
        query = query.eq('test_type', selectedTestType);
      }

      const { data: results } = await query;

      if (results) {
        setTestResults(results as TestResultRow[]);
      } else {
        setTestResults([]);
      }

      // 기존 리뷰 가져오기 (로드한 결과에 대한 리뷰만)
      if (results && results.length > 0) {
        const resultIds = results.map(r => r.id);
        const { data: existingReviews } = await supabase
          .from('transcription_accuracy_reviews')
          .select('test_result_id, review_type, notes')
          .eq('teacher_id', user.id)
          .in('test_result_id', resultIds);

        if (existingReviews) {
          const reviewsMap: Record<number, Review> = {};
          existingReviews.forEach(r => {
            reviewsMap[r.test_result_id] = {
              test_result_id: r.test_result_id,
              review_type: r.review_type,
              notes: r.notes,
            };
          });
          setReviews(reviewsMap);
        } else {
          setReviews({});
        }
      } else {
        setReviews({});
      }

      // 통계 로드
      await loadStatistics();

      setLoading(false);
    } catch (err: unknown) {
      console.error('테스트 결과 로드 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoading(false);
    }
  }, [selectedTestType, selectedStudent, router, loadStatistics]);

  // 필터 변경 시 테스트 결과 다시 로드
  useEffect(() => {
    if (!loading && Object.keys(students).length > 0) {
      loadTestResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestType, selectedStudent]);


  // 리뷰 저장
  const saveReview = async (testResultId: number, reviewType: number | null, notes?: string) => {
    setSavingReview(prev => ({ ...prev, [testResultId]: true }));

    try {
      const response = await fetch('/api/teacher/transcription-accuracy/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_result_id: testResultId,
          review_type: reviewType === 0 ? null : reviewType,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '리뷰 저장 실패');
      }

      const { review } = await response.json();

      // 리뷰가 삭제된 경우 (null 반환)
      if (!review) {
        // 리뷰 상태에서 제거
        setReviews(prev => {
          const next = { ...prev };
          delete next[testResultId];
          return next;
        });
      } else {
        // 리뷰 상태 업데이트
        setReviews(prev => ({
          ...prev,
          [testResultId]: {
            test_result_id: testResultId,
            review_type: review.review_type,
            notes: review.notes,
          },
        }));
      }

      // 통계 다시 로드
      await loadStatistics();
    } catch (err: unknown) {
      console.error('리뷰 저장 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '리뷰를 저장하는 중 오류가 발생했습니다.';
      alert(errorMessage);
    } finally {
      setSavingReview(prev => {
        const next = { ...prev };
        delete next[testResultId];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        minHeight: '100vh',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        minHeight: '100vh',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', color: '#dc3545', marginBottom: '1rem' }}>오류</div>
          <div style={{ marginBottom: '1rem' }}>{error}</div>
          <Link href="/teacher/dashboard" style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6366f1',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none'
          }}>
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const studentList = Object.values(students);

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6', 
      minHeight: '100vh',
      padding: '2rem',
      color: '#171717'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                margin: 0,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 'bold'
              }}>
                🎤 음성 인식 정확도 점검
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                학생 발화와 음성 인식 결과의 일치 여부를 점검하고 통계를 분석합니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <Link
                href="/teacher/dashboard"
                style={{
                  padding: '0.6rem 1.2rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                ← 대시보드
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* 통계 패널 */}
        {statistics && (
          <div style={{
            backgroundColor: '#ffffff',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: '600' }}>통계 분석</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>전체 리뷰 수</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>{statistics.total}</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>음성 인식 정확도</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{statistics.transcription_accuracy}%</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>채점 정확도</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{statistics.scoring_accuracy}%</div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                유형별 분포
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(type => {
                  const typeKey = String(type);
                  const count = statistics.by_type[typeKey] || 0;
                  const percentage = statistics.percentages[typeKey] || 0;
                  
                  const typeLabels: Record<number, string> = {
                    1: '정답 발화→정확한 전사→정답',
                    2: '정답 발화→정확한 전사→오답',
                    3: '정답 발화→부정확한 전사→정답',
                    4: '정답 발화→부정확한 전사→오답',
                    5: '오답 발화→정확한 전사→정답',
                    6: '오답 발화→정확한 전사→오답',
                    7: '오답 발화→부정확한 전사→정답',
                    8: '오답 발화→부정확한 전사→오답',
                    9: '발화 없음→부정확한 전사→정답',
                    10: '발화 없음→부정확한 전사→오답',
                    11: '발화 수정→정확한 전사→정답',
                    12: '발화 수정→정확한 전사→오답',
                    13: '발화 수정→부정확한 전사→정답',
                    14: '발화 수정→부정확한 전사→오답',
                  };
                  
                  return (
                    <div key={type} style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600' }}>
                        유형 {type}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                        {typeLabels[type]}
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                        {count}개
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        ({percentage}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                평가 교시
              </label>
              <select
                value={selectedTestType}
                onChange={(e) => setSelectedTestType(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
              >
                <option value="all">전체</option>
                <option value="p1_alphabet">1교시 (알파벳)</option>
                <option value="p4_phonics">4교시 (파닉스)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                학생
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem'
                }}
              >
                <option value="all">전체</option>
                {studentList.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.full_name || '이름 없음'} ({student.class_name || '-'}반)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '15px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          overflowX: 'auto'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: '600' }}>테스트 결과 목록</h2>
          {selectedTestType === 'all' && selectedStudent === 'all' ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📋 필터를 선택해주세요</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                평가 교시와 학생을 선택하면 해당하는 테스트 결과가 표시됩니다.
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              선택한 조건에 해당하는 결과가 없습니다.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>학생</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>교시</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>목표 정답</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>음성 파일</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>전사 결과</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>채점 결과</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>유형</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <ResultRow
                    key={result.id}
                    result={result}
                    student={students[result.user_id]}
                    review={reviews[result.id]}
                    onSave={saveReview}
                    saving={savingReview[result.id] || false}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
