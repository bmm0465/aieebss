// ============================================
// 학생 계정 자동 생성 스크립트 (Node.js)
// ============================================
// 사용법:
// 1. npm install @supabase/supabase-js csv-parser
// 2. .env 파일에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
// 3. node create_student_accounts.js
// ============================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config(); // .env 파일 로드

// 환경 변수에서 Supabase 설정 가져오기
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 환경 변수 확인
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 오류: 환경 변수가 설정되지 않았습니다.');
  console.error('');
  console.error('.env.local 파일을 확인하거나 다음 내용으로 생성하세요:');
  console.error('');
  console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('');
  process.exit(1);
}

// Admin 권한으로 Supabase 클라이언트 생성
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 교사 UUID 매핑
const teacherMapping = {
  '나루초 3학년 다솜반': '14ea1f09-1c7f-43eb-95cf-1b491dd876a4', // 권해경
  '우암초 3학년 1반': 'fe2e88ce-bc53-4c37-825b-4bff261ef1a9', // 이수민
  '단재초 4학년 1반': '3c9db811-8b08-48bc-8f0e-d515fa045d51', // 이수지
  '단재초 4학년 2반': '3c9db811-8b08-48bc-8f0e-d515fa045d51', // 이수지
  '단재초 4학년 3반': '3c9db811-8b08-48bc-8f0e-d515fa045d51', // 이수지
};

async function createStudentAccounts() {
  const students = [];
  
  // CSV 파일 읽기
  fs.createReadStream('학생_이메일_비밀번호_목록.csv')
    .pipe(csv())
    .on('data', (row) => {
      students.push(row);
    })
    .on('end', async () => {
      console.log(`📚 총 ${students.length}명의 학생 계정 생성 시작...\n`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const student of students) {
        try {
          // 1. Auth 계정 생성
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: student.email,
            password: student.password,
            email_confirm: true, // 이메일 확인 건너뛰기
            user_metadata: {
              full_name: student.full_name,
              class_name: student.class_name,
            }
          });

          if (authError) throw authError;

          const userId = authData.user.id;
          
          // 2. user_profiles 테이블에 프로필 생성
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              full_name: student.full_name,
              role: 'student',
              class_name: student.class_name,
              student_number: student.student_number,
              grade_level: student.grade_level,
            });

          if (profileError) throw profileError;

          // 3. 교사에게 배정
          const teacherId = teacherMapping[student.class_name];
          if (teacherId) {
            const { error: assignError } = await supabase
              .from('teacher_student_assignments')
              .insert({
                teacher_id: teacherId,
                student_id: userId,
                class_name: student.class_name,
              });

            if (assignError && assignError.code !== '23505') { // 중복 무시
              throw assignError;
            }
          }

          successCount++;
          console.log(`✅ ${student.full_name} (${student.email}) - 성공`);
          
          // API 호출 제한 방지를 위한 딜레이
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          errorCount++;
          console.error(`❌ ${student.full_name} (${student.email}) - 실패:`, error.message);
        }
      }
      
      console.log(`\n📊 완료! 성공: ${successCount}명, 실패: ${errorCount}명`);
    });
}

// 실행
createStudentAccounts().catch(console.error);

