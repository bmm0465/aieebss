import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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
  wcpm?: number;
  accuracy?: number;
  question_passage?: string;
  audio_url?: string;
  created_at?: string;
};

// 세션 정보 타입
interface SessionInfo {
  id: string;
  date: string;
  time: string;
  testTypes: string[];
  totalTests: number;
  completionRate: number;
}

// 세션별 결과 계산 함수
function groupResultsBySession(results: TestResult[]): SessionInfo[] {
  // 시간순으로 정렬
  const sortedResults = results.sort((a, b) => 
    new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  const sessions: { [key: string]: TestResult[] } = {};
  
  // 30분 간격으로 세션 구분 (같은 날짜에서 30분 이내의 테스트들을 하나의 세션으로 간주)
  sortedResults.forEach(result => {
    const resultTime = new Date(result.created_at || 0);
    const sessionKey = resultTime.toISOString().split('T')[0]; // 날짜별로 먼저 구분
    
    if (!sessions[sessionKey]) {
      sessions[sessionKey] = [];
    }
    sessions[sessionKey].push(result);
  });

  // 각 세션을 더 세밀하게 구분 (30분 간격)
  const refinedSessions: { [key: string]: TestResult[] } = {};
  
  Object.keys(sessions).forEach(dateKey => {
    const dayResults = sessions[dateKey];
    const sessionGroups: TestResult[][] = [];
    let currentGroup: TestResult[] = [];
    let lastTime = 0;
    let lastTestType = '';

    dayResults.forEach(result => {
      const resultTime = new Date(result.created_at || 0).getTime();
      const currentTestType = result.test_type || '';
      
      // 10분(600000ms) 이상 차이나면 새로운 세션
      // 같은 test_type 내에서 중단 후 재시작을 더 잘 감지하기 위해 간격을 줄임
      const timeGap = resultTime - lastTime;
      const isSameTestType = currentTestType === lastTestType;
      
      // 같은 test_type 내에서는 10분, 다른 test_type로 변경되거나 30분 이상 차이면 새로운 세션
      const shouldStartNewSession = (isSameTestType && timeGap > 600000 && currentGroup.length > 0) ||
                                    (!isSameTestType && timeGap > 1800000 && currentGroup.length > 0);
      
      if (shouldStartNewSession) {
        sessionGroups.push(currentGroup);
        currentGroup = [];
        lastTime = 0; // 새로운 그룹 시작 시 초기화
      }
      
      currentGroup.push(result);
      lastTime = resultTime;
      lastTestType = currentTestType;
    });
    
    if (currentGroup.length > 0) {
      sessionGroups.push(currentGroup);
    }

    // 각 세션 그룹을 고유한 키로 저장
    sessionGroups.forEach((group, index) => {
      const sessionId = `${dateKey}_${index}`;
      refinedSessions[sessionId] = group;
    });
  });

  // SessionInfo 배열로 변환
  return Object.entries(refinedSessions).map(([sessionId, sessionResults]) => {
    const firstResult = sessionResults[0];
    const lastResult = sessionResults[sessionResults.length - 1];
    const date = new Date(firstResult.created_at || 0);
    
    const testTypes = [...new Set(sessionResults.map(r => r.test_type))];
    const totalTests = sessionResults.length;
    
    // 완료율 계산 (6개 테스트 중 몇 개를 완료했는지)
    const expectedTests = ['p1_alphabet', 'p2_segmental_phoneme', 'p3_suprasegmental_phoneme', 'p4_phonics', 'p5_vocabulary', 'p6_comprehension'];
    const completedTests = expectedTests.filter(testType => 
      testTypes.includes(testType)
    );
    const completionRate = Math.round((completedTests.length / expectedTests.length) * 100);

    return {
      id: sessionId,
      date: date.toLocaleDateString('ko-KR'),
      time: `${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })} ~ ${new Date(lastResult.created_at || 0).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}`,
      testTypes,
      totalTests,
      completionRate
    };
  }).sort((a, b) => {
    // 세션의 첫 번째 결과의 시간을 기준으로 정렬
    const aTime = new Date(a.id.split('_')[0]).getTime();
    const bTime = new Date(b.id.split('_')[0]).getTime();
    
    // 같은 날짜라면 세션 번호로 정렬
    if (aTime === bTime) {
      const aSessionNum = parseInt(a.id.split('_')[1] || '0');
      const bSessionNum = parseInt(b.id.split('_')[1] || '0');
      return aSessionNum - bSessionNum;
    }
    
    return aTime - bTime;
  }); // 시간순 정렬
}

export default async function SessionsPage() {
  console.log("SessionsPage - 시작");
  
  const supabase = await createClient();

  // 세션 체크를 더 관대하게 처리
  let user = null;
  let userError = null;
  
  try {
    const userResult = await supabase.auth.getUser();
    user = userResult.data.user;
    userError = userResult.error;
  } catch (error) {
    console.error("사용자 정보 가져오기 실패:", error);
    userError = error;
  }
  
  console.log("SessionsPage - user:", user ? "존재함" : "없음");
  console.log("SessionsPage - userError:", userError);
  
  // 사용자가 인증되지 않았으면 로그인 페이지로 리다이렉트
  if (!user) {
    console.log("사용자가 인증되지 않았습니다. 로그인 페이지로 리다이렉트합니다.");
    redirect('/');
  }

  const { data: results, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("결과 조회 에러:", error);
    return (
      <div style={{ backgroundColor: '#f3f4f6', backgroundSize: 'cover', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#1f2937' }}>
        <div style={{textAlign: 'center', backgroundColor: '#ffffff', padding: '2.5rem 3rem', borderRadius: '20px', border: '2px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}>
          <h1 style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>데이터베이스 연결 오류</h1>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>결과를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <Link href="/lobby" style={{display: 'inline-block', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)', transition: 'all 0.3s ease'}}>로비로 돌아가기</Link>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        backgroundSize: 'cover', 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        color: '#1f2937' 
      }}>
        <div style={{textAlign: 'center', backgroundColor: '#ffffff', padding: '2.5rem 3rem', borderRadius: '20px', border: '2px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}>
          <h1 style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>아직 치른 평가가 없습니다</h1>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>평가를 먼저 완료하고 다시 확인해주세요.</p>
          <Link href="/lobby" style={{display: 'inline-block', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)', transition: 'all 0.3s ease'}}>로비로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const sessions = groupResultsBySession(results);

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6', 
      backgroundSize: 'cover', 
      minHeight: '100vh', 
      padding: '2rem',
      color: '#1f2937'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '2.8rem', 
            marginBottom: '1rem', 
            fontFamily: 'var(--font-nanum-pen)',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold'
          }}>
            📊 평가 세션 목록
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#4b5563', fontWeight: '500' }}>
            각 평가 세션을 클릭하여 상세 결과를 확인하세요
          </p>
        </div>

        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {sessions.map((sessionInfo) => (
            <Link 
              key={sessionInfo.id} 
              href={`/results/sessions/${sessionInfo.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                backgroundColor: '#ffffff',
                padding: '1.75rem',
                borderRadius: '16px',
                border: '2px solid #e5e7eb',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              className="session-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ 
                    margin: 0, 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: '1.5rem',
                    fontWeight: '600'
                  }}>{sessionInfo.date}</h2>
                  <div style={{ 
                    background: sessionInfo.completionRate >= 80 ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' : sessionInfo.completionRate >= 60 ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    {sessionInfo.completionRate}% 완료
                  </div>
                </div>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ margin: '0.5rem 0', color: '#4b5563', fontSize: '0.95rem' }}>
                    <strong style={{ color: '#1f2937' }}>시간:</strong> {sessionInfo.time}
                  </p>
                  <p style={{ margin: '0.5rem 0', color: '#4b5563', fontSize: '0.95rem' }}>
                    <strong style={{ color: '#1f2937' }}>총 문제 수:</strong> {sessionInfo.totalTests}개
                  </p>
                </div>
                
                <div>
                  <p style={{ margin: '0.5rem 0 0.75rem 0', color: '#1f2937', fontWeight: '500', fontSize: '0.95rem' }}>
                    <strong>완료된 테스트:</strong>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {sessionInfo.testTypes.map(testType => (
                      <span 
                        key={testType}
                        style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          color: '#6366f1',
                          padding: '0.375rem 0.875rem',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          border: '1.5px solid rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        {testType}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
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
            className="lobby-button"
          >
            🏠 로비로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
