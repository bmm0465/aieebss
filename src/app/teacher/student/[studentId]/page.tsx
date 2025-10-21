import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import StudentResultChart from '@/components/StudentResultChart';
import AudioResultTable from '@/components/AudioResultTable';

// 타입 정의
type TestResult = {
  id: string;
  user_id: string;
  test_type: string;
  question?: string;
  question_word?: string;
  question_passage?: string;
  student_answer?: string;
  is_correct?: boolean;
  correct_segments?: number;
  target_segments?: number;
  is_phonemes_correct?: boolean;
  is_whole_word_correct?: boolean;
  wcpm?: number;
  accuracy?: number;
  audio_url?: string;
  created_at?: string;
};

type ProcessedTestStats = {
  LNF: { correct: number; total: number; accuracy: number };
  PSF: { correct: number; total: number; accuracy: number };
  NWF: { correct: number; total: number; accuracy: number };
  WRF: { correct: number; total: number; accuracy: number };
  ORF: { avg_wcpm: number; avg_accuracy: number; count: number };
  MAZE: { correct: number; total: number; accuracy: number };
};

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  console.log('[StudentDetail] 🚀 PAGE STARTED - Simple approach!');
  
  const { studentId } = await params;
  console.log('[StudentDetail] 🚀 StudentId:', studentId);

  try {
    console.log('[StudentDetail] 🚀 Creating Supabase client...');
    const supabase = await createClient();
    console.log('[StudentDetail] 🚀 Supabase client created');

    console.log('[StudentDetail] 🚀 Getting user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[StudentDetail] 🚀 User result:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      error: userError?.message 
    });

    if (userError || !user) {
      console.error('[StudentDetail] 🚨 Auth failed:', userError);
      redirect('/');
    }

    console.log('[StudentDetail] 🚀 Auth success, checking teacher profile...');
    
    // 교사 권한 확인
    const { data: teacherProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[StudentDetail] 🚨 Profile fetch error:', profileError);
      redirect('/');
    }

    console.log('[StudentDetail] 🚀 Teacher profile:', { 
      hasProfile: !!teacherProfile, 
      role: teacherProfile?.role 
    });

    if (!teacherProfile || teacherProfile.role !== 'teacher') {
      console.error('[StudentDetail] 🚨 Not a teacher');
      redirect('/lobby?error=not_teacher');
    }

    console.log('[StudentDetail] 🚀 Checking assignment...');
    
    // 해당 학생이 교사의 담당 학생인지 확인
    const { data: assignment, error: assignmentError } = await supabase
      .from('teacher_student_assignments')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .single();

    console.log('[StudentDetail] 🚀 Assignment:', { 
      hasAssignment: !!assignment,
      error: assignmentError?.message 
    });

    if (assignmentError) {
      console.error('[StudentDetail] 🚨 Assignment fetch error:', assignmentError);
      notFound();
    }

    if (!assignment) {
      console.error('[StudentDetail] 🚨 Student not assigned');
      notFound();
    }

    console.log('[StudentDetail] 🚀 Getting student profile...');
    
    // 학생 정보 가져오기
    const { data: studentProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    // 학생 이메일 가져오기 (에러 처리 추가)
    let studentUser = null;
    try {
      const { data } = await supabase.auth.admin.getUserById(studentId);
      studentUser = data.user;
    } catch (error) {
      console.error('학생 이메일 조회 에러:', error);
    }

    console.log('[StudentDetail] 🚀 Getting test results...');
    
    // 학생의 모든 테스트 결과 가져오기
    const { data: testResults, error: resultsError } = await supabase
      .from('test_results')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });

    if (resultsError) {
      console.error('테스트 결과 조회 에러:', resultsError);
    }

    const results = (testResults as TestResult[]) || [];

    // 테스트별 통계 계산
    const stats: ProcessedTestStats = {
      LNF: { correct: 0, total: 0, accuracy: 0 },
      PSF: { correct: 0, total: 0, accuracy: 0 },
      NWF: { correct: 0, total: 0, accuracy: 0 },
      WRF: { correct: 0, total: 0, accuracy: 0 },
      ORF: { avg_wcpm: 0, avg_accuracy: 0, count: 0 },
      MAZE: { correct: 0, total: 0, accuracy: 0 }
    };

    // LNF 통계
    const lnfResults = results.filter(r => r.test_type === 'LNF');
    stats.LNF.total = lnfResults.length;
    stats.LNF.correct = lnfResults.filter(r => r.is_correct).length;
    stats.LNF.accuracy = stats.LNF.total > 0 ? (stats.LNF.correct / stats.LNF.total) * 100 : 0;

    // PSF 통계
    const psfResults = results.filter(r => r.test_type === 'PSF');
    stats.PSF.total = psfResults.length;
    stats.PSF.correct = psfResults.reduce((sum, r) => sum + (r.correct_segments || 0), 0);
    const psfTargetTotal = psfResults.reduce((sum, r) => sum + (r.target_segments || 0), 0);
    stats.PSF.accuracy = psfTargetTotal > 0 ? (stats.PSF.correct / psfTargetTotal) * 100 : 0;

    // NWF 통계
    const nwfResults = results.filter(r => r.test_type === 'NWF');
    stats.NWF.total = nwfResults.length;
    stats.NWF.correct = nwfResults.filter(r => r.is_whole_word_correct).length;
    stats.NWF.accuracy = stats.NWF.total > 0 ? (stats.NWF.correct / stats.NWF.total) * 100 : 0;

    // WRF 통계
    const wrfResults = results.filter(r => r.test_type === 'WRF');
    stats.WRF.total = wrfResults.length;
    stats.WRF.correct = wrfResults.filter(r => r.is_correct).length;
    stats.WRF.accuracy = stats.WRF.total > 0 ? (stats.WRF.correct / stats.WRF.total) * 100 : 0;

    // ORF 통계
    const orfResults = results.filter(r => r.test_type === 'ORF');
    stats.ORF.count = orfResults.length;
    if (orfResults.length > 0) {
      stats.ORF.avg_wcpm = orfResults.reduce((sum, r) => sum + (r.wcpm || 0), 0) / orfResults.length;
      stats.ORF.avg_accuracy = orfResults.reduce((sum, r) => sum + (r.accuracy || 0), 0) / orfResults.length;
    }

    // MAZE 통계
    const mazeResults = results.filter(r => r.test_type === 'MAZE');
    stats.MAZE.total = mazeResults.length;
    stats.MAZE.correct = mazeResults.filter(r => r.is_correct).length;
    stats.MAZE.accuracy = stats.MAZE.total > 0 ? (stats.MAZE.correct / stats.MAZE.total) * 100 : 0;

    // 세션별 그룹화
    const sessionGroups: { [key: string]: TestResult[] } = {};
    const sortedResults = [...results].sort((a, b) => 
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    sortedResults.forEach(result => {
      const resultTime = new Date(result.created_at || 0);
      const dateKey = resultTime.toISOString().split('T')[0];
      
      if (!sessionGroups[dateKey]) {
        sessionGroups[dateKey] = [];
      }
      sessionGroups[dateKey].push(result);
    });

    const sessions = Object.entries(sessionGroups).map(([date, sessionResults]) => {
      const testTypes = [...new Set(sessionResults.map(r => r.test_type))];
      const firstTest = sessionResults[0];
      const lastTest = sessionResults[sessionResults.length - 1];
      
      return {
        date,
        displayDate: new Date(firstTest.created_at || 0).toLocaleDateString('ko-KR'),
        timeRange: `${new Date(firstTest.created_at || 0).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ ${new Date(lastTest.created_at || 0).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`,
        testTypes,
        totalTests: sessionResults.length,
        completionRate: Math.round((testTypes.length / 6) * 100)
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('[StudentDetail] 🚀 Rendering page...');

    return (
      <div style={{ 
        backgroundImage: `url('/background.jpg')`, 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* 뒤로가기 버튼 */}
          <div style={{ marginBottom: '1rem' }}>
            <Link 
              href="/teacher/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255,215,0,0.2)',
                color: '#FFD700',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                textDecoration: 'none',
                border: '2px solid rgba(255,215,0,0.5)',
                fontWeight: 'bold'
              }}
            >
              ← 대시보드로 돌아가기
            </Link>
          </div>

          {/* 학생 정보 헤더 */}
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/owl.png" alt="학생" width={80} height={80} />
              <div style={{ marginLeft: '1.5rem', flex: 1 }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  {studentProfile?.full_name || studentUser?.email || '학생'}
                </h1>
                <div style={{ marginTop: '0.5rem', opacity: 0.9, display: 'flex', gap: '2rem' }}>
                  {studentProfile?.class_name && (
                    <span>📚 {studentProfile.class_name}</span>
                  )}
                  {studentProfile?.student_number && (
                    <span>🔢 {studentProfile.student_number}번</span>
                  )}
                  {studentProfile?.grade_level && (
                    <span>📖 {studentProfile.grade_level}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 전체 통계 요약 */}
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
              📊 종합 통계
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {/* LNF */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>LNF (룬 문자)</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.LNF.accuracy >= 80 ? '#4CAF50' : stats.LNF.accuracy >= 60 ? '#FF9800' : '#F44336' }}>
                  {stats.LNF.accuracy.toFixed(1)}%
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  {stats.LNF.correct} / {stats.LNF.total} 정답
                </div>
              </div>

              {/* PSF */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>PSF (소리 분리)</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.PSF.accuracy >= 80 ? '#4CAF50' : stats.PSF.accuracy >= 60 ? '#FF9800' : '#F44336' }}>
                  {stats.PSF.accuracy.toFixed(1)}%
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  {stats.PSF.total}개 단어
                </div>
              </div>

              {/* NWF */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>NWF (주문 시전)</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.NWF.accuracy >= 80 ? '#4CAF50' : stats.NWF.accuracy >= 60 ? '#FF9800' : '#F44336' }}>
                  {stats.NWF.accuracy.toFixed(1)}%
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  {stats.NWF.correct} / {stats.NWF.total} 정답
                </div>
              </div>

              {/* WRF */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>WRF (단어 활성화)</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.WRF.accuracy >= 80 ? '#4CAF50' : stats.WRF.accuracy >= 60 ? '#FF9800' : '#F44336' }}>
                  {stats.WRF.accuracy.toFixed(1)}%
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  {stats.WRF.correct} / {stats.WRF.total} 정답
                </div>
              </div>

              {/* ORF */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>ORF (이야기 소생술)</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
                  {stats.ORF.avg_wcpm.toFixed(0)} WCPM
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  정확도: {stats.ORF.avg_accuracy.toFixed(1)}%
                </div>
              </div>

              {/* MAZE */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>MAZE (지혜의 미로)</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.MAZE.accuracy >= 80 ? '#4CAF50' : stats.MAZE.accuracy >= 60 ? '#FF9800' : '#F44336' }}>
                  {stats.MAZE.accuracy.toFixed(1)}%
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  {stats.MAZE.correct} / {stats.MAZE.total} 정답
                </div>
              </div>
            </div>
          </div>

          {/* 시각화 차트 */}
          <StudentResultChart stats={stats} />

          {/* 세션별 결과 */}
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '2rem',
            borderRadius: '15px',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
              📅 평가 세션 기록
            </h2>
            
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                아직 평가 기록이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {sessions.map((session) => (
                  <div 
                    key={session.date}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '1.5rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#FFD700' }}>{session.displayDate}</h3>
                      <div style={{ 
                        backgroundColor: session.completionRate >= 80 ? '#4CAF50' : session.completionRate >= 60 ? '#FF9800' : '#F44336',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}>
                        {session.completionRate}% 완료
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: '0.5rem 0', opacity: 0.9 }}>
                        <strong>시간:</strong> {session.timeRange}
                      </p>
                      <p style={{ margin: '0.5rem 0', opacity: 0.9 }}>
                        <strong>총 문제 수:</strong> {session.totalTests}개
                      </p>
                    </div>
                    
                    <div>
                      <p style={{ margin: '0.5rem 0', opacity: 0.9 }}>
                        <strong>완료된 테스트:</strong>
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {session.testTypes.map(testType => (
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
                ))}
              </div>
            )}
          </div>

          {/* 음성 결과 테이블 */}
          {(['LNF', 'PSF', 'NWF', 'WRF', 'ORF'] as const).map(testType => {
            const hasResults = results.some(r => r.test_type === testType && r.audio_url);
            return hasResults ? (
              <AudioResultTable
                key={`teacher-audio-${testType}`}
                testType={testType}
                studentId={studentId}
              />
            ) : null;
          })}
        </div>
      </div>
    );

  } catch (error) {
    console.error('[StudentDetail] 🚨 FATAL ERROR:', error);
    redirect('/');
  }
}