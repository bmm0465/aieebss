import { createClient } from '@/lib/supabase/server';

export default async function DebugAssignmentsPage() {
  const supabase = createClient();

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div style={{ padding: '2rem' }}>로그인이 필요합니다.</div>;
  }

  // 교사 정보
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 할당된 학생 목록
  const { data: assignments, error: assignmentsError } = await supabase
    .from('teacher_student_assignments')
    .select('*')
    .eq('teacher_id', user.id);

  // 모든 학생 목록
  const { data: allStudents, error: studentsError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('role', 'student');

  // 할당된 학생들의 상세 정보
  const studentIds = assignments?.map(a => a.student_id) || [];
  const { data: assignedStudents } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', studentIds);

  return (
    <div style={{ 
      padding: '2rem',
      fontFamily: 'monospace',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#4ec9b0' }}>🔍 학생 할당 디버그</h1>
      
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: '#569cd6' }}>교사 정보:</h2>
        <pre style={{ 
          backgroundColor: '#252526', 
          padding: '1rem', 
          borderRadius: '5px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            userId: user.id,
            email: user.email,
            fullName: profile?.full_name,
            role: profile?.role
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: '#569cd6' }}>할당 테이블 조회 결과:</h2>
        <pre style={{ 
          backgroundColor: '#252526', 
          padding: '1rem', 
          borderRadius: '5px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            totalAssignments: assignments?.length || 0,
            error: assignmentsError?.message,
            assignments: assignments
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: '#569cd6' }}>할당된 학생 상세:</h2>
        <pre style={{ 
          backgroundColor: '#252526', 
          padding: '1rem', 
          borderRadius: '5px',
          overflow: 'auto',
          maxHeight: '400px'
        }}>
          {JSON.stringify(assignedStudents || [], null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: '#569cd6' }}>전체 학생 목록:</h2>
        <pre style={{ 
          backgroundColor: '#252526', 
          padding: '1rem', 
          borderRadius: '5px',
          overflow: 'auto',
          maxHeight: '400px'
        }}>
          {JSON.stringify({
            totalStudents: allStudents?.length || 0,
            error: studentsError?.message,
            students: allStudents?.map(s => ({
              id: s.id,
              email: s.id, // user_profiles에는 email이 없으므로 id만
              fullName: s.full_name,
              className: s.class_name,
              studentNumber: s.student_number
            }))
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#264f78', borderRadius: '5px' }}>
        <h3 style={{ marginTop: 0 }}>💡 진단:</h3>
        {assignments && assignments.length === 0 ? (
          <div>
            <p style={{ color: '#f48771' }}>
              ⚠️ <strong>문제 발견!</strong> 이 교사에게 할당된 학생이 없습니다.
            </p>
            <p>
              해결 방법: Supabase에서 <code>teacher_student_assignments</code> 테이블에 학생을 할당해야 합니다.
            </p>
            <p>
              SQL 예시:
            </p>
            <pre style={{ 
              backgroundColor: '#1e1e1e', 
              padding: '1rem', 
              borderRadius: '5px',
              overflow: 'auto'
            }}>
{`INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES ('${user.id}', '학생_ID', '반_이름');`}
            </pre>
          </div>
        ) : (
          <p style={{ color: '#4ec9b0' }}>
            ✅ 학생 할당이 정상적으로 되어있습니다 ({assignments?.length}명).
          </p>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <a 
          href="/teacher/dashboard" 
          style={{ 
            color: '#4ec9b0', 
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            backgroundColor: '#252526',
            borderRadius: '5px',
            display: 'inline-block'
          }}
        >
          ← 대시보드로 돌아가기
        </a>
      </div>
    </div>
  );
}


