import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ResultReport, { type ProcessedResults } from '@/components/ResultReport';
import FeedbackSection from '@/components/FeedbackSection';

// Supabase 테이블 타입 정의
type TestResult = {
  id: string;
  user_id: string;
  test_type: string;
  question_word?: string;
  student_answer?: string;
  is_correct?: boolean;
  correct_segments?: number;
  target_segments?: number;
  is_phonemes_correct?: boolean;
  is_whole_word_correct?: boolean;
  correct_letter_sounds?: number; // CLS 점수
  wcpm?: number;
  accuracy?: number;
  question_passage?: string;
  audio_url?: string;
  created_at?: string;
};

const calculateResults = (results: TestResult[]): ProcessedResults => {
  const summary: ProcessedResults = {
    p1_alphabet: { correct: 0, total: 0, accuracy: 0 },
    p2_segmental_phoneme: { correct: 0, total: 0, accuracy: 0 },
    p3_suprasegmental_phoneme: { correct: 0, total: 0, accuracy: 0 },
    p4_phonics: { correct: 0, total: 0, accuracy: 0, total_wcpm: 0, total_accuracy: 0, avg_wcpm: 0, avg_accuracy: 0 },
    p5_vocabulary: { correct: 0, total: 0, accuracy: 0 },
    p6_comprehension: { correct: 0, total: 0, accuracy: 0 },
  };

  results.forEach(res => {
    if (res.test_type === 'p1_alphabet') {
      summary.p1_alphabet.total++;
      if (res.is_correct) summary.p1_alphabet.correct++;
    } else if (res.test_type === 'p2_segmental_phoneme') {
      summary.p2_segmental_phoneme.total++;
      if (res.is_correct) summary.p2_segmental_phoneme.correct++;
    } else if (res.test_type === 'p3_suprasegmental_phoneme') {
      summary.p3_suprasegmental_phoneme.total++;
      if (res.is_correct) summary.p3_suprasegmental_phoneme.correct++;
    } else if (res.test_type === 'p4_phonics') {
      summary.p4_phonics.total++;
      // p4_phonics는 읽기 테스트이므로 wcpm과 accuracy 사용
      summary.p4_phonics.total_wcpm += res.wcpm || 0;
      summary.p4_phonics.total_accuracy += res.accuracy || 0;
      if (res.is_correct) summary.p4_phonics.correct++;
    } else if (res.test_type === 'p5_vocabulary') {
      summary.p5_vocabulary.total++;
      if (res.is_correct) summary.p5_vocabulary.correct++;
    } else if (res.test_type === 'p6_comprehension') {
      summary.p6_comprehension.total++;
      if (res.is_correct) summary.p6_comprehension.correct++;
    }
  });

  // 정확도 및 점수 계산
  if (summary.p1_alphabet.total > 0) summary.p1_alphabet.accuracy = (summary.p1_alphabet.correct / summary.p1_alphabet.total) * 100;
  if (summary.p2_segmental_phoneme.total > 0) summary.p2_segmental_phoneme.accuracy = (summary.p2_segmental_phoneme.correct / summary.p2_segmental_phoneme.total) * 100;
  if (summary.p3_suprasegmental_phoneme.total > 0) summary.p3_suprasegmental_phoneme.accuracy = (summary.p3_suprasegmental_phoneme.correct / summary.p3_suprasegmental_phoneme.total) * 100;
  if (summary.p4_phonics.total > 0) {
    summary.p4_phonics.accuracy = (summary.p4_phonics.correct / summary.p4_phonics.total) * 100;
    if (summary.p4_phonics.total_wcpm > 0) {
      summary.p4_phonics.avg_wcpm = summary.p4_phonics.total_wcpm / summary.p4_phonics.total;
      summary.p4_phonics.avg_accuracy = (summary.p4_phonics.total_accuracy / summary.p4_phonics.total) * 100;
    }
  }
  if (summary.p5_vocabulary.total > 0) summary.p5_vocabulary.accuracy = (summary.p5_vocabulary.correct / summary.p5_vocabulary.total) * 100;
  if (summary.p6_comprehension.total > 0) summary.p6_comprehension.accuracy = (summary.p6_comprehension.correct / summary.p6_comprehension.total) * 100;

  return summary;
};

// 세션 ID로부터 해당 세션의 결과들을 필터링하는 함수
function filterResultsBySession(results: TestResult[], sessionId: string): TestResult[] {
  const [dateStr, sessionNumStr] = sessionId.split('_');
  const sessionDate = new Date(dateStr);
  const sessionNumber = parseInt(sessionNumStr || '0');
  
  // 해당 날짜의 결과들을 가져옴
  const dayResults = results.filter(result => {
    if (!result.created_at) return false;
    const resultDate = new Date(result.created_at);
    return resultDate.toISOString().split('T')[0] === sessionDate.toISOString().split('T')[0];
  });

  // 시간순으로 정렬
  const sortedResults = dayResults.sort((a, b) => 
    new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );
  
  // 30분 간격으로 세션 구분
  const sessionGroups: TestResult[][] = [];
  let currentGroup: TestResult[] = [];
  let lastTime = 0;

  sortedResults.forEach(result => {
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

  // 디버깅: 세션 그룹 정보
  console.log(`[filterResultsBySession] 날짜: ${dateStr}, 세션 번호: ${sessionNumber}`);
  console.log(`[filterResultsBySession] 세션 그룹 수: ${sessionGroups.length}`);
  sessionGroups.forEach((group, idx) => {
    const testTypes = [...new Set(group.map(r => r.test_type))];
    console.log(`[filterResultsBySession] 세션 ${idx}: ${group.length}개 결과, 타입: ${testTypes.join(', ')}`);
  });

  // 요청된 세션 번호의 결과 반환
  const selectedSession = sessionGroups[sessionNumber] || [];
  console.log(`[filterResultsBySession] 선택된 세션 ${sessionNumber}: ${selectedSession.length}개 결과`);
  return selectedSession;
}

interface PageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  console.log("SessionDetailPage - sessionId:", sessionId);
  
  const supabase = await createClient();

  // 세션 체크 - 보안을 위해 getUser() 사용
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  console.log("SessionDetailPage - user:", user ? "존재함" : "없음");
  console.log("SessionDetailPage - userError:", userError);
  
  if (!user) {
    console.log("사용자가 인증되지 않았습니다. 로그인 페이지로 리다이렉트합니다.");
    redirect('/');
  }

  const { data: allResults, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("결과 조회 에러:", error);
    return (
      <div style={{ backgroundColor: '#ffffff', backgroundSize: 'cover', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#1f2937' }}>
        <div style={{textAlign: 'center', backgroundColor: '#ffffff', padding: '2.5rem 3rem', borderRadius: '20px', border: '2px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}>
          <h1 style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>데이터베이스 연결 오류</h1>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>결과를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <Link href="/lobby" style={{display: 'inline-block', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)', transition: 'all 0.3s ease'}}>로비로 돌아가기</Link>
        </div>
      </div>
    );
  }

  if (!allResults || allResults.length === 0) {
    notFound();
  }

  // 세션별로 필터링
  const sessionResults = filterResultsBySession(allResults, sessionId);
  
  // 디버깅: 세션 필터링 결과 로그
  console.log(`[SessionDetailPage] 전체 결과: ${allResults.length}개`);
  console.log(`[SessionDetailPage] 세션 ID: ${sessionId}`);
  console.log(`[SessionDetailPage] 필터링된 결과: ${sessionResults.length}개`);
  console.log(`[SessionDetailPage] 테스트 타입별 개수:`, 
    sessionResults.reduce((acc, r) => {
      acc[r.test_type] = (acc[r.test_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  if (sessionResults.length === 0) {
    console.warn(`[SessionDetailPage] 세션 ${sessionId}에 대한 결과가 없습니다.`);
    notFound();
  }

  const processedResults = calculateResults(sessionResults);
  
  // 세션 정보 생성
  const firstResult = sessionResults[0];
  const lastResult = sessionResults[sessionResults.length - 1];
  const sessionDate = new Date(firstResult.created_at || 0);
  const testTypes = [...new Set(sessionResults.map(r => r.test_type))];

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      backgroundSize: 'cover', 
      minHeight: '100vh', 
      padding: '2rem',
      color: '#1f2937'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 세션 헤더 */}
        <div style={{ 
          backgroundColor: '#ffffff',
          border: '2px solid #e5e7eb', 
          padding: '2.5rem', 
          borderRadius: '20px', 
          marginBottom: '2rem',
          textAlign: 'center',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <h1 style={{ 
            fontSize: '2.8rem', 
            marginBottom: '1.5rem', 
            fontFamily: 'var(--font-nanum-pen)',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold'
          }}>
            📊 평가 세션 결과
          </h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div style={{ padding: '1.25rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
              <h3 style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.75rem',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>📅 평가 날짜</h3>
              <p style={{ fontSize: '1rem', color: '#4b5563', fontWeight: '500' }}>{sessionDate.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}</p>
            </div>
            <div style={{ padding: '1.25rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
              <h3 style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.75rem',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>⏰ 평가 시간</h3>
              <p style={{ fontSize: '1rem', color: '#4b5563', fontWeight: '500' }}>
                {sessionDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })} ~ {new Date(lastResult.created_at || 0).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
              </p>
            </div>
            <div style={{ padding: '1.25rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
              <h3 style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.75rem',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>📝 완료된 테스트</h3>
              <p style={{ fontSize: '1rem', color: '#4b5563', fontWeight: '500' }}>{testTypes.join(', ')}</p>
            </div>
            <div style={{ padding: '1.25rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
              <h3 style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.75rem',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>📊 총 문제 수</h3>
              <p style={{ fontSize: '1rem', color: '#4b5563', fontWeight: '500' }}>{sessionResults.length}개</p>
            </div>
          </div>
        </div>

        {/* 결과 리포트 */}
        <ResultReport results={processedResults} sessionId={sessionId} />

        {/* 음성 결과 테이블은 이제 ResultReport 컴포넌트에서 선택적으로 표시됩니다 */}

        {/* AI 피드백 섹션 */}
        {testTypes.map(testType => (
          <FeedbackSection
            key={testType}
            testType={testType}
            sessionId={sessionId}
            hasResults={sessionResults.some(r => r.test_type === testType)}
          />
        ))}

        {/* 네비게이션 버튼들 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1rem', 
          marginTop: '2rem',
          flexWrap: 'wrap'
        }}>
          <Link 
            href="/results/sessions" 
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '12px',
              textDecoration: 'none',
              border: 'none',
              transition: 'all 0.3s ease',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
            }}
          >
            📋 세션 목록으로
          </Link>
          <Link 
            href="/lobby" 
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '12px',
              textDecoration: 'none',
              border: 'none',
              transition: 'all 0.3s ease',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
            }}
          >
            🏠 로비로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
