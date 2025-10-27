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

    dayResults.forEach(result => {
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
    const expectedTests = ['LNF', 'PSF', 'NWF', 'WRF', 'ORF', 'MAZE'];
    const completedTests = expectedTests.filter(testType => 
      testTypes.includes(testType)
    );
    const completionRate = Math.round((completedTests.length / expectedTests.length) * 100);

    return {
      id: sessionId,
      date: date.toLocaleDateString('ko-KR'),
      time: `${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ ${new Date(lastResult.created_at || 0).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`,
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
      <div style={{ backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
        <div style={{textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2rem', borderRadius: '15px'}}>
          <h1>데이터베이스 연결 오류</h1>
          <p>결과를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <a href="/lobby" style={{color: '#FFD700', textDecoration: 'none'}}>로비로 돌아가기</a>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        color: 'white' 
      }}>
        <div style={{textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2rem', borderRadius: '15px'}}>
          <h1>아직 치른 시험이 없습니다</h1>
          <p>시험을 먼저 완료하고 다시 확인해주세요.</p>
          <Link href="/lobby" style={{color: '#FFD700', textDecoration: 'none'}}>로비로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const sessions = groupResultsBySession(results);

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh', 
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            📊 평가 세션 목록
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
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
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '1.5rem',
                borderRadius: '15px',
                border: '2px solid rgba(255,215,0,0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              className="session-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, color: '#FFD700' }}>{sessionInfo.date}</h2>
                  <div style={{ 
                    backgroundColor: sessionInfo.completionRate >= 80 ? '#4CAF50' : sessionInfo.completionRate >= 60 ? '#FF9800' : '#F44336',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>
                    {sessionInfo.completionRate}% 완료
                  </div>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: '0.5rem 0', opacity: 0.9 }}>
                    <strong>시간:</strong> {sessionInfo.time}
                  </p>
                  <p style={{ margin: '0.5rem 0', opacity: 0.9 }}>
                    <strong>총 문제 수:</strong> {sessionInfo.totalTests}개
                  </p>
                </div>
                
                <div>
                  <p style={{ margin: '0.5rem 0', opacity: 0.9 }}>
                    <strong>완료된 테스트:</strong>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {sessionInfo.testTypes.map(testType => (
                      <span 
                        key={testType}
                        style={{
                          backgroundColor: 'rgba(255,215,0,0.2)',
                          color: '#FFD700',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '15px',
                          fontSize: '0.9rem',
                          border: '1px solid rgba(255,215,0,0.5)'
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
            className="lobby-button"
          >
            🏠 로비로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
