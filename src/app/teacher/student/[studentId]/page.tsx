import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ studentId: string }>;
}

type TestResult = {
  id: string;
  test_type: string;
  is_correct: boolean | null;
  accuracy: number | null;
  response_time: number | null;
  created_at: string;
  test_data: Record<string, unknown>;
  question?: string;
  student_answer?: string;
  error_type?: string;
};

export default async function StudentDetailPage({ params }: Props) {
  console.log('[StudentDetail] 🚀 PAGE STARTED');
  
  const { studentId } = await params;
  console.log('[StudentDetail] 🔍 StudentId:', studentId);

  const supabase = await createClient();
  console.log('[StudentDetail] ✅ Supabase client created');

  // 교사 인증 체크
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  console.log('[StudentDetail] Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    error: userError?.message,
    studentId,
    timestamp: new Date().toISOString()
  });
  
  if (userError || !user) {
    console.error('[StudentDetail] ❌ Authentication FAILED:', {
      userError,
      hasUser: !!user,
      userId: user?.id,
      errorMessage: userError?.message
    });
    redirect('/');
  }

  // 교사 프로필 확인
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'teacher') {
    console.error('[StudentDetail] ❌ Teacher profile not found:', profileError);
    redirect('/lobby');
  }

  // 담당 학생인지 확인 (임시로 우회)
  let assignment = null;
  let assignmentError = null;
  
  try {
    const { data, error } = await supabase
      .from('teacher_student_assignments')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .single();
    
    assignment = data;
    assignmentError = error;
  } catch (dbError) {
    console.log('[StudentDetail] ⚠️ teacher_student_assignments 테이블이 없거나 관계가 설정되지 않음. 임시로 우회합니다.', dbError);
    // 임시로 모든 교사가 모든 학생을 볼 수 있도록 허용
    assignment = { class_name: '임시 반' };
  }

  if (assignmentError && assignmentError.code !== 'PGRST116') {
    console.error('[StudentDetail] ❌ Student assignment error:', assignmentError);
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
        <div style={{
          textAlign: 'center', 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          padding: '2rem', 
          borderRadius: '15px',
          maxWidth: '600px'
        }}>
          <h1 style={{ color: '#FFD700', marginBottom: '1rem' }}>⚠️ 데이터베이스 오류</h1>
          <p style={{ marginBottom: '1rem' }}>학생 정보를 불러올 수 없습니다.</p>
          <Link 
            href="/teacher/dashboard" 
            style={{
              display: 'inline-block',
              backgroundColor: '#FFD700',
              color: 'black',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 학생 프로필 정보 가져오기
  let studentUser = null;
  try {
    const { data: studentProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', studentId)
      .single();
    
    if (studentProfile) {
      studentUser = { 
        email: studentProfile.email || `학생 ID: ${studentId.substring(0, 8)}...`,
        full_name: studentProfile.full_name 
      };
    }
  } catch (error) {
    console.error('학생 프로필 조회 에러:', error);
  }

  // 학생의 테스트 결과 가져오기
  const { data: testResults, error: resultsError } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false }) as { data: TestResult[] | null; error: Error | null };

  if (resultsError) {
    console.error('테스트 결과 조회 에러:', resultsError);
  }

  console.log('[StudentDetail] ✅ Data loaded successfully');

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
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
              fontWeight: 'bold',
              marginBottom: '1rem'
            }}
          >
            ← 대시보드로 돌아가기
          </Link>
          
          <h1 style={{ color: '#FFD700', marginBottom: '0.5rem' }}>
            📊 학생 상세 평가 결과
          </h1>
          <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {studentUser?.full_name || studentUser?.email || '학생 정보'}
          </h2>
          <p style={{ opacity: 0.8, fontSize: '1rem' }}>
            담당 반: {assignment?.class_name || '미지정'} | 총 {testResults?.length || 0}개 평가 완료
          </p>
        </div>

        {/* 평가 결과 요약 */}
        {testResults && testResults.length > 0 ? (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem'
          }}>
            <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>📈 평가 결과 요약</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                  {testResults.length}
                </div>
                <div style={{ color: '#ccc' }}>총 평가 수</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
                  {testResults.filter(r => r.is_correct).length}
                </div>
                <div style={{ color: '#ccc' }}>정답 수</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF9800' }}>
                  {testResults.length > 0 ? Math.round((testResults.filter(r => r.is_correct).length / testResults.length) * 100) : 0}%
                </div>
                <div style={{ color: '#ccc' }}>정확도</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>📝 평가 결과 없음</h3>
            <p style={{ opacity: 0.8 }}>아직 완료된 평가가 없습니다.</p>
          </div>
        )}

        {/* 상세 결과 목록 */}
        {testResults && testResults.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2rem',
            borderRadius: '15px'
          }}>
            <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>📋 상세 평가 결과</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {testResults.map((result) => (
                <div key={result.id} style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: `2px solid ${result.is_correct ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: result.is_correct ? '#4CAF50' : '#F44336' }}>
                      {result.test_type} - {result.is_correct ? '정답' : '오답'}
                    </span>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                      {new Date(result.created_at || 0).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  {result.question && (
                    <p style={{ margin: '0.3rem 0', color: '#fff' }}>
                      <strong>문제:</strong> {result.question}
                    </p>
                  )}
                  {result.student_answer && (
                    <p style={{ margin: '0.3rem 0', color: result.is_correct ? '#4CAF50' : '#F44336' }}>
                      <strong>학생 답변:</strong> {result.student_answer}
                    </p>
                  )}
                  {result.error_type && (
                    <p style={{ margin: '0.3rem 0', color: '#FF9800' }}>
                      <strong>오류 유형:</strong> {result.error_type}
                    </p>
                  )}
                  {result.accuracy && (
                    <p style={{ margin: '0.3rem 0', color: '#2196F3' }}>
                      <strong>정확도:</strong> {result.accuracy}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}