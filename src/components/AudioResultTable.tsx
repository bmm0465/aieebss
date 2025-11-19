'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AudioResult {
  id: string;
  user_id?: string;
  test_type: string;
  question?: string;
  question_word?: string;
  student_answer?: string;
  correct_answer?: string;
  is_correct?: boolean;
  audio_url?: string;
  created_at?: string;
  error_type?: string;
  correct_segments?: number;
  target_segments?: number;
  wcpm?: number;
  accuracy?: number;
}

interface AudioResultTableProps {
  testType: string;
  sessionId?: string;
  studentId?: string; // 교사가 특정 학생의 결과를 볼 때 사용
}

// 선택형 테스트 목록
const choiceTests = ['PSF', 'STRESS', 'MEANING', 'COMPREHENSION'];

export default function AudioResultTable({ testType, sessionId, studentId }: AudioResultTableProps) {
  const [results, setResults] = useState<AudioResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 안전한 ID 비교 함수
  const isExpanded = (resultId: string): boolean => {
    return expandedRow === resultId;
  };

  const toggleExpanded = (resultId: string): void => {
    setExpandedRow(expandedRow === resultId ? null : resultId);
  };

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      // 선택형 테스트(PSF, STRESS, MEANING, COMPREHENSION)는 audio_url이 없으므로 필터 제거
      const isChoiceTest = choiceTests.includes(testType);
      
      let query = supabase
        .from('test_results')
        .select('*')
        .eq('test_type', testType)
        .order('created_at', { ascending: false });
      
      // 음성 파일이 있는 테스트만 audio_url 필터 적용
      if (!isChoiceTest) {
        query = query.not('audio_url', 'is', null);
      }

      if (sessionId) {
        // 세션별 결과 조회
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('인증이 필요합니다.');
        
        const [dateStr] = sessionId.split('_');
        const sessionDate = new Date(dateStr);
        
        // 먼저 해당 날짜의 모든 결과를 가져온 후 클라이언트에서 필터링
        query = query
          .eq('user_id', user.id)
          .gte('created_at', sessionDate.toISOString().split('T')[0])
          .lt('created_at', new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      } else if (studentId) {
        // 교사가 특정 학생의 결과 조회
        query = query.eq('user_id', studentId);
      } else {
        // 현재 로그인한 사용자의 결과 조회
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('인증이 필요합니다.');
        query = query.eq('user_id', user.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      let filteredData = data;
      
      // 세션 필터링이 필요한 경우 클라이언트에서 처리
      if (sessionId && filteredData) {
        const [, sessionNumStr] = sessionId.split('_');
        const sessionNumber = parseInt(sessionNumStr || '0');
        
        // 시간순으로 정렬
        const sortedData = [...filteredData].sort((a, b) => 
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );
        
        // 30분 간격으로 세션 구분
        const sessionGroups: typeof filteredData[] = [];
        let currentGroup: typeof filteredData = [];
        let lastTime = 0;
        
        sortedData.forEach(result => {
          const resultTime = new Date(result.created_at || 0).getTime();
          
          // 30분(1800000ms) 이상 차이나면 새로운 세션
          if (resultTime - lastTime > 1800000 && currentGroup.length > 0) {
            sessionGroups.push(currentGroup);
            currentGroup = [];
          }
          
          currentGroup.push(result);
          lastTime = resultTime;
        });
        
        if (currentGroup.length > 0) {
          sessionGroups.push(currentGroup);
        }
        
        // 요청된 세션 번호의 결과 사용
        filteredData = sessionGroups[sessionNumber] || [];
      }
      
      console.log('[AudioResultTable] 조회된 결과:', filteredData?.length || 0, '개');
      
      // audio_url 경로 분석을 위한 디버깅 정보
      if (filteredData && filteredData.length > 0) {
        const audioPaths = filteredData
          .filter(item => item.audio_url)
          .map(item => item.audio_url)
          .slice(0, 3); // 처음 3개만 로깅
        
        console.log('[AudioResultTable] 샘플 audio_url 경로들:', audioPaths);
      }
      
      setResults(filteredData || []);
    } catch (err) {
      console.error('결과 조회 에러:', err);
      setError(err instanceof Error ? err.message : '결과를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [testType, sessionId, studentId]);

  React.useEffect(() => {
    if (testType) {
      fetchResults();
    }
  }, [testType, sessionId, studentId, fetchResults]);

  const getCorrectAnswer = (result: AudioResult): string => {
    return result.question || result.question_word || 'N/A';
  };

  const getTestTypeName = (type: string): string => {
    const testNames: Record<string, string> = {
      'LNF': '1교시: 고대 룬 문자 해독 시험',
      'PSF': '2교시: 소리의 원소 분리 시험',
      'NWF': '3교시: 마법 주문 읽기 시험 (무의미 단어)',
      'WRF': '3교시: 마법 주문 읽기 시험 (실제 단어)',
      'ORF': '3교시: 마법 주문 읽기 시험 (문장)',
      'STRESS': '4교시: 마법 리듬 패턴 시험',
      'MEANING': '5교시: 마법서 그림 해석 시험',
      'COMPREHENSION': '6교시: 고대 전설 이해 시험'
    };
    return testNames[type] || type;
  };


  if (loading) {
    return (
      <div style={{ 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: '2rem', 
        borderRadius: '15px', 
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#ccc' }}>결과를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        backgroundColor: 'rgba(220, 53, 69, 0.2)', 
        border: '1px solid rgba(220, 53, 69, 0.5)', 
        borderRadius: '10px', 
        padding: '1rem', 
        marginTop: '2rem',
        color: '#ff6b6b'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>⚠️ 오류</p>
        <p style={{ margin: '0.5rem 0 0 0' }}>{error}</p>
        <button 
          onClick={fetchResults}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(220, 53, 69, 0.2)',
            color: '#ff6b6b',
            border: '1px solid rgba(220, 53, 69, 0.5)',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={{ 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: '2rem', 
        borderRadius: '15px', 
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>
          {choiceTests.includes(testType) ? '📋' : '🎵'} {getTestTypeName(testType)} {choiceTests.includes(testType) ? '상세 결과' : '음성 결과'}
        </h3>
        <p style={{ color: '#ccc' }}>
          {getTestTypeName(testType)} 테스트의 {choiceTests.includes(testType) ? '결과' : '음성 파일'}이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'rgba(0,0,0,0.7)', 
      padding: '2rem', 
      borderRadius: '15px', 
      marginTop: '2rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#FFD700', margin: 0 }}>
          {choiceTests.includes(testType) ? '📋' : '🎵'} {getTestTypeName(testType)} {choiceTests.includes(testType) ? '상세 결과' : '음성 결과'} ({results.length}개)
        </h3>
        <button 
          onClick={fetchResults}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(255,215,0,0.2)',
            color: '#FFD700',
            border: '1px solid rgba(255,215,0,0.5)',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 새로고침
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                {choiceTests.includes(testType) ? '문제' : '음성 파일'}
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                {choiceTests.includes(testType) ? '학생 답변' : '전사 결과'}
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                정답
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                결과
              </th>
              {choiceTests.includes(testType) && (
                <th style={{ padding: '1rem', textAlign: 'left', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                  오류 유형
                </th>
              )}
              <th style={{ padding: '1rem', textAlign: 'center', color: '#FFD700', borderBottom: '1px solid rgba(255, 215, 0, 0.3)' }}>
                시간
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const safeId = result.id ? String(result.id) : `result-${Math.random()}`;
              return (
                <React.Fragment key={safeId}>
                  <tr 
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      backgroundColor: isExpanded(safeId) ? 'rgba(255, 215, 0, 0.05)' : 'transparent'
                    }}
                    onClick={() => toggleExpanded(safeId)}
                  >
                  <td style={{ padding: '1rem' }}>
                    {choiceTests.includes(testType) ? (
                      <div style={{ maxWidth: '200px', wordBreak: 'break-word', color: '#e9ecef' }}>
                        {result.question || '문제 없음'}
                      </div>
                    ) : (
                      result.audio_url ? (
                        <AudioPlayer 
                          audioPath={result.audio_url} 
                          userId={result.user_id}
                          testType={result.test_type}
                          createdAt={result.created_at}
                        />
                      ) : (
                        <span style={{ color: '#ccc' }}>음성 파일 없음</span>
                      )
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: '#e9ecef' }}>
                    <div style={{ maxWidth: '200px', wordBreak: 'break-word' }}>
                      {result.student_answer || (choiceTests.includes(testType) ? '답변 없음' : '전사 결과 없음')}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#e9ecef', fontWeight: 'bold' }}>
                    {choiceTests.includes(testType) ? (result.correct_answer || 'N/A') : getCorrectAnswer(result)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <ResultBadge 
                      isCorrect={result.is_correct} 
                      correctSegments={result.correct_segments}
                      targetSegments={result.target_segments}
                    />
                  </td>
                  {choiceTests.includes(testType) && (
                    <td style={{ padding: '1rem', color: '#e9ecef' }}>
                      {result.error_type || '-'}
                    </td>
                  )}
                  <td style={{ padding: '1rem', textAlign: 'center', color: '#ccc', fontSize: '0.9rem' }}>
                    {result.created_at ? new Date(result.created_at).toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    }) : 'N/A'}
                  </td>
                  </tr>
                  {isExpanded(safeId) && (
                  <tr>
                    <td colSpan={choiceTests.includes(testType) ? 6 : 5} style={{ padding: '0 1rem 1rem 1rem' }}>
                      <div style={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                        padding: '1rem', 
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          <div>
                            <strong style={{ color: '#FFD700' }}>문제 ID:</strong> {result.id ? (typeof result.id === 'string' ? result.id.slice(0, 8) : String(result.id).slice(0, 8)) : 'N/A'}...
                          </div>
                          {result.correct_segments !== undefined && result.target_segments !== undefined && (
                            <div>
                              <strong style={{ color: '#FFD700' }}>세그먼트 정확도:</strong> {result.correct_segments}/{result.target_segments}
                            </div>
                          )}
                          {result.wcpm && (
                            <div>
                              <strong style={{ color: '#FFD700' }}>WCPM:</strong> {result.wcpm}
                            </div>
                          )}
                          {result.accuracy && (
                            <div>
                              <strong style={{ color: '#FFD700' }}>정확도:</strong> {result.accuracy.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 오디오 플레이어 컴포넌트
function AudioPlayer({ 
  audioPath, 
  userId, 
  testType, 
  createdAt 
}: { 
  audioPath: string;
  userId?: string;
  testType?: string;
  createdAt?: string;
}) {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadAudioUrl = async () => {
      console.log('[AudioPlayer] 시작:', audioPath.substring(0, 50) + '...');
      
      if (!audioPath || typeof audioPath !== 'string') {
        console.warn('[AudioPlayer] 유효하지 않은 경로:', audioPath);
        setError('유효하지 않은 오디오 경로');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // 경로 형식 확인 (기존: testType/userId/timestamp.webm vs 새로운: studentName/sessionDate/testType/timestamp.webm)
        const pathParts = audioPath.split('/');
        const isOldFormat = pathParts.length === 3;
        
        console.log('[AudioPlayer] 경로 형식:', isOldFormat ? '기존' : '새로운', `(${pathParts.length}개 부분)`);
        console.log('[AudioPlayer] 원본 경로:', audioPath);

        // 여러 경로를 시도할 리스트 생성
        const pathsToTry = [audioPath];
        
        // 기존 형식인 경우, 원본 경로를 먼저 시도
        if (isOldFormat) {
          console.log('[AudioPlayer] 기존 형식 파일 - 원본 경로 먼저 시도:', audioPath);
        }
        
        if (isOldFormat && userId && testType) {
          // 기존 형식인 경우, 파일이 실제로 존재하는지 먼저 확인
          console.log('[AudioPlayer] 기존 형식 파일 확인 중:', { oldFormat: audioPath, userId, testType, createdAt });
          
          const [oldTestType, oldUserId, fileName] = pathParts;
          
          // 파일명에서 확장자 확인 및 수정
          let correctedFileName = fileName;
          if (fileName && !fileName.endsWith('.webm')) {
            // .wet이나 다른 확장자를 .webm으로 수정
            correctedFileName = fileName.replace(/\.[^.]+$/, '.webm');
            console.log('[AudioPlayer] 파일명 수정:', fileName, '->', correctedFileName);
          }
          
          // testType 정규화 (대소문자 및 오타 수정)
          const normalizeTestType = (type: string) => {
            if (!type) return '';
            const normalized = type.toLowerCase();
            
            // 일반적인 오타 및 대소문자 문제 수정
            const corrections: Record<string, string> = {
              'inf': 'lnf',           // Inf -> LNF
              'wrf': 'wrf',           // 이미 올바름
              'orf': 'orf',           // 이미 올바름
              'psf': 'psf',           // 이미 올바름
              'nwf': 'nwf',           // 이미 올바름
              'maze': 'maze'          // 이미 올바름
            };
            
            return corrections[normalized] || normalized;
          };
          
          const normalizedTestType = normalizeTestType(testType || oldTestType);
          
          // createdAt 날짜를 사용하여 정확한 날짜 추정
          let sessionDate = '2024-12-01'; // 기본값
          if (createdAt) {
            const date = new Date(createdAt);
            sessionDate = date.toISOString().split('T')[0];
          }
          
          // 우선순위가 높은 경로들만 시도 (성능 개선)
          const priorityPaths = [
            `student_${userId.slice(0, 8)}/${sessionDate}/${normalizedTestType}/${correctedFileName}`,
            `student_${oldUserId.slice(0, 8)}/${sessionDate}/${normalizeTestType(oldTestType)}/${correctedFileName}`,
            // 원본 파일명도 시도
            `student_${userId.slice(0, 8)}/${sessionDate}/${normalizedTestType}/${fileName}`,
            `student_${oldUserId.slice(0, 8)}/${sessionDate}/${normalizeTestType(oldTestType)}/${fileName}`,
          ];
          
          console.log('[AudioPlayer] 생성된 경로들:', priorityPaths);
          pathsToTry.push(...priorityPaths);
          
          // 스토리지에서 실제 파일 존재 여부를 빠르게 확인
          try {
            console.log('[AudioPlayer] 스토리지 파일 존재 여부 확인 중...');
            const { data: fileList, error: listError } = await supabase.storage
              .from('student-recordings')
              .list('', { limit: 1000 });
            
            if (!listError && fileList) {
              console.log('[AudioPlayer] 스토리지 루트 폴더 목록:', fileList.map(f => f.name));
              
              // 기존 형식 폴더가 있는지 확인
              const hasOldFormatFolder = fileList.some(f => f.name === normalizedTestType);
              console.log('[AudioPlayer] 기존 형식 폴더 존재:', hasOldFormatFolder, normalizedTestType);
              
              // 스토리지가 비어있는 경우 경고
              if (fileList.length === 0) {
                console.warn('[AudioPlayer] ⚠️ 스토리지가 비어있습니다! 파일이 저장되지 않았을 수 있습니다.');
              }
            } else {
              console.error('[AudioPlayer] 스토리지 목록 조회 실패:', listError);
            }
          } catch (searchError) {
            console.log('[AudioPlayer] 스토리지 검색 실패:', searchError);
          }
        }
        
        // 각 경로를 시도해보기 (최대 5개까지로 제한)
        const maxAttempts = Math.min(pathsToTry.length, 5);
        let lastError: string = '';
        let foundValidPath = false;
        
        for (let i = 0; i < maxAttempts; i++) {
          const tryPath = pathsToTry[i];
          
          try {
            console.log(`[AudioPlayer] 경로 시도 ${i + 1}/${maxAttempts}:`, tryPath);
            
            // 먼저 Signed URL 시도
            const { data: signedData, error: signedError } = await supabase.storage
              .from('student-recordings')
              .createSignedUrl(tryPath, 3600);
            
            if (!signedError && signedData?.signedUrl) {
              console.log('[AudioPlayer] ✅ Signed URL 생성 성공:', { 
                tryPath, 
                urlLength: signedData.signedUrl.length,
                isOldFormat 
              });
              setAudioUrl(signedData.signedUrl);
              setError(null);
              setLoading(false);
              foundValidPath = true;
              return;
            } else {
              // Signed URL 실패 시 Public URL 시도
              console.log('[AudioPlayer] Signed URL 실패, Public URL 시도:', signedError?.message);
              
              const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/student-recordings/${tryPath}`;
              
              // Public URL이 실제로 작동하는지 확인
              try {
                const response = await fetch(publicUrl, { method: 'HEAD' });
                if (response.ok) {
                  console.log('[AudioPlayer] ✅ Public URL 성공:', publicUrl);
                  setAudioUrl(publicUrl);
                  setError(null);
                  setLoading(false);
                  foundValidPath = true;
                  return;
                } else {
                  console.log('[AudioPlayer] ❌ Public URL 실패:', response.status);
                  lastError = `Public URL failed: ${response.status}`;
                }
              } catch (fetchError) {
                console.log('[AudioPlayer] ❌ Public URL fetch 실패:', fetchError);
                lastError = `Public URL fetch failed: ${fetchError}`;
              }
              
              lastError = signedError?.message || lastError || 'Unknown error';
              console.log('[AudioPlayer] ❌ 경로 실패:', tryPath, lastError);
              
              // 기존 형식의 첫 번째 시도가 실패한 경우, 다른 경로들을 계속 시도
              if (i === 0 && isOldFormat) {
                console.log('[AudioPlayer] 기존 형식 첫 번째 시도 실패, 다른 경로들을 계속 시도');
                continue;
              }
              
              // 새로운 형식의 첫 번째 시도가 실패한 경우, 조기 종료
              if (i === 0 && !isOldFormat) {
                console.log('[AudioPlayer] 새로운 형식 첫 번째 시도 실패, 조기 종료');
                break;
              }
            }
          } catch (tryError) {
            lastError = String(tryError);
            console.log('[AudioPlayer] ⚠️ 경로 시도 중 오류:', tryPath, tryError);
          }
        }
        
        // 모든 경로가 실패한 경우
        if (!foundValidPath) {
          console.error('[AudioPlayer] 모든 경로 시도 실패:', { 
            audioPath, 
            pathsTried: pathsToTry.slice(0, maxAttempts),
            lastError,
            isOldFormat,
            userId,
            testType,
            createdAt
          });
          
          // 더 구체적인 에러 메시지 제공
          let errorMessage = '';
          if (isOldFormat) {
            // 스토리지가 비어있는 경우 특별한 메시지
            if (lastError.includes('Object not found') && pathsToTry.length > 0) {
              errorMessage = `⚠️ 음성 파일이 저장되지 않았습니다. 평가를 다시 시도해주세요.`;
            } else {
              errorMessage = `⚠️ 이전 형식 파일을 찾을 수 없습니다 (${maxAttempts}개 경로 시도)`;
            }
          } else {
            errorMessage = `파일을 찾을 수 없습니다: ${lastError}`;
          }
          
          setError(errorMessage);
        }
        
      } catch (err) {
        console.error('[AudioPlayer] 오디오 URL 생성 실패:', err, { audioPath });
        setError('오디오 로드 실패');
      } finally {
        setLoading(false);
      }
    };

    loadAudioUrl();
  }, [audioPath, userId, testType, createdAt]);

  if (loading) {
    return <span style={{ color: '#ccc' }}>로딩 중...</span>;
  }

  if (error || !audioUrl) {
    const errorMessage = error || '재생 불가';
    const isOldFormatError = errorMessage.includes('이전 형식');
    
    return (
      <span 
        style={{ 
          color: isOldFormatError ? '#ffc107' : '#dc3545',
          fontSize: '0.8rem',
          cursor: 'help'
        }}
        title={isOldFormatError ? '이 파일은 이전 형식으로 저장되어 접근할 수 없습니다. 관리자에게 문의하세요.' : errorMessage}
      >
        {isOldFormatError ? '⚠️ 이전 형식' : '❌ 재생 불가'}
      </span>
    );
  }

  return (
    <audio 
      controls 
      style={{ width: '200px', height: '40px' }}
      onError={(e) => {
        console.error('[AudioPlayer] 오디오 재생 오류:', e, { audioUrl: audioUrl.substring(0, 100) + '...' });
        setError('재생 오류');
      }}
      onLoadStart={() => console.log('[AudioPlayer] 오디오 로딩 시작')}
      onCanPlay={() => console.log('[AudioPlayer] 오디오 재생 준비 완료')}
    >
      <source src={audioUrl} type="audio/webm" />
      브라우저가 오디오 재생을 지원하지 않습니다.
    </audio>
  );
}

// 결과 배지 컴포넌트
function ResultBadge({ 
  isCorrect, 
  correctSegments, 
  targetSegments 
}: { 
  isCorrect?: boolean; 
  correctSegments?: number;
  targetSegments?: number;
}) {
  if (isCorrect === true) {
    return (
      <span style={{
        backgroundColor: 'rgba(40, 167, 69, 0.2)',
        color: '#28a745',
        padding: '0.3rem 0.8rem',
        borderRadius: '15px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
      }}>
        ✅ 정답
      </span>
    );
  } else if (isCorrect === false) {
    if (correctSegments !== undefined && targetSegments !== undefined && correctSegments > 0) {
      return (
        <span style={{
          backgroundColor: 'rgba(255, 193, 7, 0.2)',
          color: '#ffc107',
          padding: '0.3rem 0.8rem',
          borderRadius: '15px',
          fontSize: '0.8rem',
          fontWeight: 'bold'
        }}>
          ⚠️ 부분정답 ({correctSegments}/{targetSegments})
        </span>
      );
    }
    return (
      <span style={{
        backgroundColor: 'rgba(220, 53, 69, 0.2)',
        color: '#dc3545',
        padding: '0.3rem 0.8rem',
        borderRadius: '15px',
        fontSize: '0.8rem',
        fontWeight: 'bold'
      }}>
        ❌ 오답
      </span>
    );
  }
  
  return (
    <span style={{
      backgroundColor: 'rgba(108, 117, 125, 0.2)',
      color: '#6c757d',
      padding: '0.3rem 0.8rem',
      borderRadius: '15px',
      fontSize: '0.8rem'
    }}>
      -
    </span>
  );
}
