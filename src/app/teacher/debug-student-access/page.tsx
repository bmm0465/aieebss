import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DebugStudentAccessPage() {
  const supabase = await createClient();

  // 인증 확인
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('❌ Authentication FAILED:', userError);
    redirect('/');
  }

  // 교사 프로필 확인
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'teacher') {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#f0f0f0' }}>
        <h1>❌ 교사 권한 없음</h1>
        <p>Error: {profileError?.message}</p>
        <p>Profile: {JSON.stringify(profile, null, 2)}</p>
      </div>
    );
  }

  // 데이터베이스 상태 체크
  const checks = {
    userProfiles: { exists: false, count: 0, error: null as any },
    teacherAssignments: { exists: false, count: 0, error: null as any },
    testResults: { exists: false, count: 0, error: null as any },
    assignedStudents: { count: 0, students: [] as any[], error: null as any }
  };

  // 1. user_profiles 테이블 체크
  try {
    const { data, error, count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact' });
    
    checks.userProfiles = {
      exists: !error,
      count: count || 0,
      error
    };
  } catch (e) {
    checks.userProfiles.error = e;
  }

  // 2. teacher_student_assignments 테이블 체크
  try {
    const { data, error, count } = await supabase
      .from('teacher_student_assignments')
      .select('*', { count: 'exact' });
    
    checks.teacherAssignments = {
      exists: !error,
      count: count || 0,
      error
    };
  } catch (e) {
    checks.teacherAssignments.error = e;
  }

  // 3. test_results 테이블 체크
  try {
    const { data, error, count } = await supabase
      .from('test_results')
      .select('*', { count: 'exact' });
    
    checks.testResults = {
      exists: !error,
      count: count || 0,
      error
    };
  } catch (e) {
    checks.testResults.error = e;
  }

  // 4. 담당 학생 목록 체크
  try {
    const { data: assignments } = await supabase
      .from('teacher_student_assignments')
      .select('student_id')
      .eq('teacher_id', user.id);

    const studentIds = assignments?.map(a => a.student_id) || [];
    
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', studentIds);
      
      checks.assignedStudents = {
        count: students?.length || 0,
        students: students || [],
        error: null
      };
    }
  } catch (e) {
    checks.assignedStudents.error = e;
  }

  return (
    <div style={{ 
      padding: '2rem', 
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      fontFamily: 'monospace'
    }}>
      <h1>🔍 학생 접근 디버그 페이지</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>👤 현재 사용자 정보</h2>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Name:</strong> {profile.full_name}</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🗄️ 데이터베이스 상태</h2>
        
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3>user_profiles 테이블</h3>
          <p><strong>상태:</strong> {checks.userProfiles.exists ? '✅ 존재' : '❌ 없음'}</p>
          <p><strong>레코드 수:</strong> {checks.userProfiles.count}</p>
          {checks.userProfiles.error && (
            <p><strong>에러:</strong> {JSON.stringify(checks.userProfiles.error, null, 2)}</p>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3>teacher_student_assignments 테이블</h3>
          <p><strong>상태:</strong> {checks.teacherAssignments.exists ? '✅ 존재' : '❌ 없음'}</p>
          <p><strong>레코드 수:</strong> {checks.teacherAssignments.count}</p>
          {checks.teacherAssignments.error && (
            <p><strong>에러:</strong> {JSON.stringify(checks.teacherAssignments.error, null, 2)}</p>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3>test_results 테이블</h3>
          <p><strong>상태:</strong> {checks.testResults.exists ? '✅ 존재' : '❌ 없음'}</p>
          <p><strong>레코드 수:</strong> {checks.testResults.count}</p>
          {checks.testResults.error && (
            <p><strong>에러:</strong> {JSON.stringify(checks.testResults.error, null, 2)}</p>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
          <h3>담당 학생 목록</h3>
          <p><strong>담당 학생 수:</strong> {checks.assignedStudents.count}</p>
          {checks.assignedStudents.error && (
            <p><strong>에러:</strong> {JSON.stringify(checks.assignedStudents.error, null, 2)}</p>
          )}
          {checks.assignedStudents.students.length > 0 && (
            <div>
              <h4>학생 목록:</h4>
              <ul>
                {checks.assignedStudents.students.map((student: any) => (
                  <li key={student.id}>
                    {student.full_name || student.id} ({student.class_name || '반 미지정'})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🔧 해결 방법</h2>
        <div style={{ backgroundColor: '#fff3cd', padding: '1rem', borderRadius: '8px' }}>
          <h3>1. 데이터베이스 테이블 생성</h3>
          <p>Supabase SQL Editor에서 다음 SQL을 실행하세요:</p>
          <pre style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
{`-- user_profiles 테이블 생성
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  class_name TEXT,
  student_number TEXT,
  grade_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- teacher_student_assignments 테이블 생성
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  class_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);`}
          </pre>
        </div>

        <div style={{ backgroundColor: '#d1ecf1', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
          <h3>2. 교사-학생 연결</h3>
          <p>교사와 학생을 연결하려면:</p>
          <pre style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
{`-- 학생을 교사에게 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES ('${user.id}', '학생-UUID', '1학년 1반');`}
          </pre>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>🧪 테스트 링크</h2>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px' }}>
          {checks.assignedStudents.students.length > 0 ? (
            <div>
              <p>담당 학생이 있습니다. 다음 링크로 테스트해보세요:</p>
              <ul>
                {checks.assignedStudents.students.slice(0, 3).map((student: any) => (
                  <li key={student.id}>
                    <a href={`/teacher/student/${student.id}`} target="_blank">
                      {student.full_name || student.id} 상세 페이지
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>❌ 담당 학생이 없습니다. 위의 해결 방법을 따라 학생을 배정하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
