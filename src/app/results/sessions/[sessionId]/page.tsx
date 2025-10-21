import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ResultReport, { type ProcessedResults } from '@/components/ResultReport';
import FeedbackSection from '@/components/FeedbackSection';
import AudioResultTable from '@/components/AudioResultTable';

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
    LNF: { correct: 0, total: 0, accuracy: 0 },
    PSF: { correct_segments: 0, target_segments: 0, accuracy: 0, total: 0 },
    NWF: { phonemes_correct: 0, whole_word_correct: 0, total: 0, phoneme_accuracy: 0, whole_word_accuracy: 0 },
    WRF: { correct: 0, total: 0, accuracy: 0 },
    ORF: { total_wcpm: 0, total_accuracy: 0, count: 0, avg_wcpm: 0, avg_accuracy: 0 },
    MAZE: { correct: 0, total: 0, accuracy: 0, score: 0 },
  };

  results.forEach(res => {
    if (res.test_type === 'LNF') {
      summary.LNF.total++;
      if (res.is_correct) summary.LNF.correct++;
    } else if (res.test_type === 'PSF') {
      summary.PSF.total++;
      summary.PSF.correct_segments += res.correct_segments || 0;
      summary.PSF.target_segments += res.target_segments || 0;
    } else if (res.test_type === 'NWF') {
      summary.NWF.total++;
      // 이미지 규칙에 따라: CLS는 correct_letter_sounds 필드 사용, WRC는 is_whole_word_correct 사용
      summary.NWF.phonemes_correct += res.correct_letter_sounds || 0;
      if (res.is_whole_word_correct) summary.NWF.whole_word_correct++;
    } else if (res.test_type === 'WRF') {
      summary.WRF.total++;
      if (res.is_correct) summary.WRF.correct++;
    } else if (res.test_type === 'ORF') {
      summary.ORF.count++;
      summary.ORF.total_wcpm += res.wcpm || 0;
      summary.ORF.total_accuracy += res.accuracy || 0;
    } else if (res.test_type === 'MAZE') {
      summary.MAZE.total++;
      if (res.is_correct) summary.MAZE.correct++;
    }
  });

  // 정확도 및 점수 계산
  if (summary.LNF.total > 0) summary.LNF.accuracy = (summary.LNF.correct / summary.LNF.total) * 100;
  if (summary.PSF.target_segments > 0) summary.PSF.accuracy = (summary.PSF.correct_segments / summary.PSF.target_segments) * 100;
  if (summary.NWF.total > 0) {
    // 이미지 규칙에 따라: CLS는 총 음소 점수, WRC는 단어 정답률
    // CLS 정확도는 총 CLS 점수 대비 방식으로 계산 (실제로는 raw 점수를 사용)
    summary.NWF.phoneme_accuracy = summary.NWF.phonemes_correct; // CLS 총 점수
    summary.NWF.whole_word_accuracy = (summary.NWF.whole_word_correct / summary.NWF.total) * 100; // WRC 정답률
  }
  if (summary.WRF.total > 0) summary.WRF.accuracy = (summary.WRF.correct / summary.WRF.total) * 100;
  if (summary.ORF.count > 0) {
    summary.ORF.avg_wcpm = summary.ORF.total_wcpm / summary.ORF.count;
    summary.ORF.avg_accuracy = (summary.ORF.total_accuracy / summary.ORF.count) * 100;
  }
  if (summary.MAZE.total > 0) {
    const incorrect = summary.MAZE.total - summary.MAZE.correct;
    summary.MAZE.score = summary.MAZE.correct - (incorrect / 2);
    summary.MAZE.accuracy = (summary.MAZE.correct / summary.MAZE.total) * 100;
  }

  return summary;
};

// 세션 ID로부터 해당 세션의 결과들을 필터링하는 함수
function filterResultsBySession(results: TestResult[], sessionId: string): TestResult[] {
  const [dateStr] = sessionId.split('_');
  const sessionDate = new Date(dateStr);
  
  // 해당 날짜의 결과들을 가져옴
  const dayResults = results.filter(result => {
    const resultDate = new Date(result.created_at || 0);
    return resultDate.toISOString().split('T')[0] === sessionDate.toISOString().split('T')[0];
  });

  // 시간순으로 정렬
  const sortedResults = dayResults.sort((a, b) => 
    new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  // 세션 번호 추출
  const sessionNumber = parseInt(sessionId.split('_')[1] || '0');
  
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

  // 요청된 세션 번호의 결과 반환
  return sessionGroups[sessionNumber] || [];
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

  // 세션 체크
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  console.log("SessionDetailPage - session:", session ? "존재함" : "없음");
  console.log("SessionDetailPage - sessionError:", sessionError);
  
  if (!session) {
    console.log("세션이 없습니다. 로그인 페이지로 리다이렉트합니다.");
    redirect('/');
  }

  const { data: allResults, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("결과 조회 에러:", error);
    return (
      <div style={{ backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
        <div style={{textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2rem', borderRadius: '15px'}}>
          <h1>데이터베이스 연결 오류</h1>
          <p>결과를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <a href="/lobby" style={{color: '#FFD700', textDecoration: 'none'}}>로비로 돌아가기</a>
        </div>
      </div>
    );
  }

  if (!allResults || allResults.length === 0) {
    notFound();
  }

  // 세션별로 필터링
  const sessionResults = filterResultsBySession(allResults, sessionId);

  if (sessionResults.length === 0) {
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
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh', 
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 세션 헤더 */}
        <div style={{ 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          padding: '2rem', 
          borderRadius: '15px', 
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            📊 평가 세션 결과
          </h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <h3 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>📅 평가 날짜</h3>
              <p style={{ fontSize: '1.1rem' }}>{sessionDate.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}</p>
            </div>
            <div>
              <h3 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>⏰ 평가 시간</h3>
              <p style={{ fontSize: '1.1rem' }}>
                {sessionDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ {new Date(lastResult.created_at || 0).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <h3 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>📝 완료된 테스트</h3>
              <p style={{ fontSize: '1.1rem' }}>{testTypes.join(', ')}</p>
            </div>
            <div>
              <h3 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>📊 총 문제 수</h3>
              <p style={{ fontSize: '1.1rem' }}>{sessionResults.length}개</p>
            </div>
          </div>
        </div>

        {/* 결과 리포트 */}
        <ResultReport results={processedResults} />

        {/* 음성 결과 테이블 */}
        {testTypes.filter(testType => ['LNF', 'PSF', 'NWF', 'WRF', 'ORF'].includes(testType)).map(testType => (
          <AudioResultTable
            key={`audio-${testType}`}
            testType={testType}
            sessionId={sessionId}
          />
        ))}

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
              backgroundColor: 'rgba(255,215,0,0.2)',
              color: '#FFD700',
              padding: '1rem 2rem',
              borderRadius: '25px',
              textDecoration: 'none',
              border: '2px solid rgba(255,215,0,0.5)',
              transition: 'all 0.3s ease',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            📋 세션 목록으로
          </Link>
          <Link 
            href="/lobby" 
            style={{
              display: 'inline-block',
              backgroundColor: 'rgba(0,123,255,0.2)',
              color: '#007BFF',
              padding: '1rem 2rem',
              borderRadius: '25px',
              textDecoration: 'none',
              border: '2px solid rgba(0,123,255,0.5)',
              transition: 'all 0.3s ease',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            🏠 로비로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
