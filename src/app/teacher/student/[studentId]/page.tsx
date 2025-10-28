import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  console.log('[StudentDetail] 🚀 PAGE STARTED');
  
  const { studentId } = await params;
  console.log('[StudentDetail] 🔍 StudentId:', studentId);

  const supabase = await createClient();

  // 간단한 인증 체크
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('[StudentDetail] ❌ Authentication FAILED');
    redirect('/');
  }

  console.log('[StudentDetail] ✅ User authenticated:', user.email);

  // 교사 권한 체크 (간단하게)
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, full_name, class_name')
    .eq('id', user.id)
    .single();

  console.log('[StudentDetail] 🔍 Profile check:', {
    userId: user.id,
    userEmail: user.email,
    profile: profile,
    profileError: profileError?.message,
    hasProfile: !!profile,
    role: profile?.role
  });

  if (profileError) {
    console.error('[StudentDetail] ❌ Profile query error:', profileError.message);
    redirect('/lobby');
  }

  if (!profile) {
    console.error('[StudentDetail] ❌ No profile found for user');
    redirect('/lobby');
  }

  if (profile.role !== 'teacher') {
    console.error('[StudentDetail] ❌ Not a teacher, role:', profile.role);
    redirect('/lobby');
  }

  console.log('[StudentDetail] ✅ Teacher verified');

  // 교사가 해당 학생을 담당하는지 확인
  const { data: assignment, error: assignmentError } = await supabase
    .from('teacher_student_assignments')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .single();

  console.log('[StudentDetail] 🔍 Assignment check:', {
    teacherId: user.id,
    studentId: studentId,
    assignment: assignment,
    assignmentError: assignmentError?.message,
    hasAssignment: !!assignment
  });

  if (assignmentError && assignmentError.code !== 'PGRST116') { // PGRST116은 "no rows returned" 에러
    console.error('[StudentDetail] ❌ Assignment query error:', assignmentError.message);
    redirect('/teacher/dashboard');
  }

  if (!assignment) {
    console.error('[StudentDetail] ❌ No assignment found - teacher not assigned to this student');
    redirect('/teacher/dashboard');
  }

  console.log('[StudentDetail] ✅ Assignment verified');

  // 학생 정보 가져오기 (간단하게)
  const studentInfo = {
    id: studentId,
    name: `학생 ${studentId.substring(0, 8)}`,
    email: '이메일 정보 없음',
    class: '미지정 반'
  };

  try {
    const { data: studentProfile } = await supabase
      .from('user_profiles')
      .select('full_name, class_name')
      .eq('id', studentId)
      .single();

    if (studentProfile) {
      studentInfo.name = studentProfile.full_name || studentInfo.name;
      studentInfo.class = studentProfile.class_name || studentInfo.class;
    }
  } catch {
    console.log('[StudentDetail] ⚠️ Student profile not found, using default info');
  }

  // 테스트 결과 가져오기 (간단하게)
  let testResults: Array<{
    id: string;
    test_type: string;
    is_correct: boolean | null;
    accuracy: number | null;
    created_at: string;
  }> = [];

  try {
    const { data } = await supabase
      .from('test_results')
      .select('id, test_type, is_correct, accuracy, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20);

    testResults = data || [];
  } catch {
    console.log('[StudentDetail] ⚠️ Test results not found');
  }

  console.log('[StudentDetail] ✅ Data loaded, test results:', testResults.length);

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 헤더 */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ 
                fontSize: '2rem', 
                margin: 0,
                color: '#FFD700',
                textShadow: '0 0 10px #FFD700'
              }}>
                📊 학생 상세 평가 결과
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                {studentInfo.name} ({studentInfo.class})
              </p>
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
              ← 대시보드로 돌아가기
            </Link>
          </div>
        </div>

        {/* 학생 기본 정보 */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>👤 학생 정보</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>이름:</strong> {studentInfo.name}
            </div>
            <div>
              <strong>반:</strong> {studentInfo.class}
            </div>
            <div>
              <strong>학생 ID:</strong> {studentId.substring(0, 8)}...
            </div>
            <div>
              <strong>총 테스트 수:</strong> {testResults.length}회
            </div>
          </div>
        </div>

        {/* 테스트 결과 요약 */}
        {testResults.length > 0 ? (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2rem',
            borderRadius: '15px',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>📈 평가 결과 요약</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
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
            textAlign: 'center',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>📝 평가 결과 없음</h2>
            <p style={{ opacity: 0.8 }}>아직 완료된 평가가 없습니다.</p>
          </div>
        )}

        {/* 상세 테스트 결과 */}
        {testResults.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2rem',
            borderRadius: '15px',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>📋 상세 평가 결과</h2>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {testResults.map((result) => (
                  <div 
                    key={result.id}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: `2px solid ${result.is_correct ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: result.is_correct ? '#4CAF50' : '#F44336',
                        fontSize: '1.1rem'
                      }}>
                        {result.test_type} - {result.is_correct ? '정답' : '오답'}
                      </span>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                        {new Date(result.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    {result.accuracy && (
                      <div style={{ color: '#2196F3', fontWeight: 'bold' }}>
                        정확도: {result.accuracy}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 디버그 정보 */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '1rem',
          borderRadius: '8px',
          marginTop: '2rem',
          fontSize: '0.8rem',
          opacity: 0.7
        }}>
          <strong>디버그 정보:</strong> StudentId: {studentId} | Test Results: {testResults.length}개
        </div>

      </div>
    </div>
  );
}
