import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// .env.local 파일을 명시적으로 로드
config({ path: resolve(process.cwd(), '.env.local') });
// .env 파일도 로드 (fallback)
config({ path: resolve(process.cwd(), '.env') });

// 삭제할 계정 이메일 목록 (create-accounts.ts에서 생성한 계정들)
const teacherEmails = [
  'teacher_hk@abs.com',
  'teacher_sm@abs.com',
  'teacher_sj@abs.com',
];

const studentEmails = [
  // 나루초등학교 3학년 다솜반
  'naru1@abs.com',
  'naru2@abs.com',
  'naru3@abs.com',
  'naru4@abs.com',
  'naru5@abs.com',
  'naru6@abs.com',
  'naru7@abs.com',
  'naru8@abs.com',
  'naru9@abs.com',
  'naru10@abs.com',
  'naru11@abs.com',
  'naru12@abs.com',
  'naru13@abs.com',
  'naru14@abs.com',
  'naru15@abs.com',
  'naru16@abs.com',
  'naru17@abs.com',
  'naru18@abs.com',
  'naru19@abs.com',
  'naru20@abs.com',
  'naru21@abs.com',
  'naru22@abs.com',
  'naru23@abs.com',
  'naru24@abs.com',
  // 우암초등학교 3학년 1반
  'uam1@abs.com',
  'uam2@abs.com',
  'uam3@abs.com',
  'uam4@abs.com',
  'uam5@abs.com',
  'uam6@abs.com',
  'uam7@abs.com',
  'uam8@abs.com',
  'uam9@abs.com',
  'uam10@abs.com',
  'uam11@abs.com',
  'uam12@abs.com',
  'uam13@abs.com',
  'uam14@abs.com',
  'uam15@abs.com',
  'uam16@abs.com',
  'uam17@abs.com',
  'uam18@abs.com',
  // 단재초등학교 4학년 1반
  '1danjae1@abs.com',
  '1danjae2@abs.com',
  '1danjae3@abs.com',
  '1danjae4@abs.com',
  '1danjae5@abs.com',
  '1danjae6@abs.com',
  '1danjae7@abs.com',
  '1danjae8@abs.com',
  '1danjae9@abs.com',
  '1danjae10@abs.com',
  '1danjae11@abs.com',
  '1danjae12@abs.com',
  '1danjae13@abs.com',
  '1danjae14@abs.com',
  '1danjae15@abs.com',
  '1danjae16@abs.com',
  '1danjae17@abs.com',
  '1danjae18@abs.com',
  '1danjae19@abs.com',
  '1danjae20@abs.com',
  '1danjae21@abs.com',
  '1danjae22@abs.com',
  '1danjae23@abs.com',
  '1danjae24@abs.com',
  // 단재초등학교 4학년 2반
  '2danjae1@abs.com',
  '2danjae2@abs.com',
  '2danjae3@abs.com',
  '2danjae4@abs.com',
  '2danjae5@abs.com',
  '2danjae6@abs.com',
  '2danjae7@abs.com',
  '2danjae8@abs.com',
  '2danjae9@abs.com',
  '2danjae10@abs.com',
  '2danjae11@abs.com',
  '2danjae12@abs.com',
  '2danjae13@abs.com',
  '2danjae14@abs.com',
  '2danjae15@abs.com',
  '2danjae16@abs.com',
  '2danjae17@abs.com',
  '2danjae18@abs.com',
  '2danjae19@abs.com',
  '2danjae20@abs.com',
  '2danjae21@abs.com',
  '2danjae22@abs.com',
  '2danjae23@abs.com',
  // 단재초등학교 4학년 3반
  '3danjae1@abs.com',
  '3danjae2@abs.com',
  '3danjae3@abs.com',
  '3danjae4@abs.com',
  '3danjae5@abs.com',
  '3danjae6@abs.com',
  '3danjae7@abs.com',
  '3danjae8@abs.com',
  '3danjae9@abs.com',
  '3danjae10@abs.com',
  '3danjae11@abs.com',
  '3danjae12@abs.com',
  '3danjae13@abs.com',
  '3danjae14@abs.com',
  '3danjae15@abs.com',
  '3danjae16@abs.com',
  '3danjae17@abs.com',
  '3danjae18@abs.com',
  '3danjae19@abs.com',
  '3danjae20@abs.com',
  '3danjae21@abs.com',
  '3danjae22@abs.com',
];

interface DeletionStats {
  teachers: { total: number; deleted: number; notFound: number; errors: number };
  students: { total: number; deleted: number; notFound: number; errors: number };
  profiles: { deleted: number; errors: number };
  assignments: { deleted: number; errors: number };
  testResults: { deleted: number; errors: number };
}

/**
 * 이메일로 사용자 ID 찾기
 */
async function findUserByEmail(
  client: ReturnType<typeof createSupabaseClient>,
  email: string
): Promise<string | null> {
  try {
    const { data: { users }, error } = await client.auth.admin.listUsers();
    if (error) {
      console.error(`   ⚠️  사용자 목록 조회 실패:`, error.message);
      return null;
    }
    const user = users?.find((u) => u.email === email);
    return user?.id || null;
  } catch (error) {
    console.error(`   ⚠️  사용자 조회 중 오류:`, error);
    return null;
  }
}

/**
 * 사용자 삭제
 */
async function deleteUser(
  client: ReturnType<typeof createSupabaseClient>,
  userId: string,
  email: string,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) {
    console.log(`   👀 [Dry-run] 사용자 삭제 예정: ${email} (${userId})`);
    return true;
  }

  try {
    // 1. teacher_student_assignments에서 삭제
    const { error: assignmentError } = await client
      .from('teacher_student_assignments')
      .delete()
      .or(`teacher_id.eq.${userId},student_id.eq.${userId}`);

    if (assignmentError && !assignmentError.message.includes('schema cache')) {
      console.error(`   ⚠️  배정 삭제 실패 (${email}):`, assignmentError.message);
    }

    // 2. test_results에서 삭제
    const { error: testResultsError } = await client
      .from('test_results')
      .delete()
      .eq('user_id', userId);

    if (testResultsError && !testResultsError.message.includes('schema cache')) {
      console.error(`   ⚠️  테스트 결과 삭제 실패 (${email}):`, testResultsError.message);
    }

    // 3. user_profiles에서 삭제
    const { error: profileError } = await client.from('user_profiles').delete().eq('id', userId);

    if (profileError && !profileError.message.includes('schema cache')) {
      console.error(`   ⚠️  프로필 삭제 실패 (${email}):`, profileError.message);
    }

    // 4. Auth 사용자 삭제
    const { error: authError } = await client.auth.admin.deleteUser(userId);
    if (authError) {
      console.error(`   ❌ Auth 사용자 삭제 실패 (${email}):`, authError.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`   💥 사용자 삭제 중 오류 (${email}):`, error);
    return false;
  }
}

/**
 * 교사 계정 삭제
 */
async function deleteTeachers(
  client: ReturnType<typeof createSupabaseClient>,
  dryRun: boolean
): Promise<DeletionStats['teachers']> {
  console.log('\n👨‍🏫 교사 계정 삭제 중...\n');
  const stats: DeletionStats['teachers'] = {
    total: teacherEmails.length,
    deleted: 0,
    notFound: 0,
    errors: 0,
  };

  for (const email of teacherEmails) {
    try {
      const userId = await findUserByEmail(client, email);
      if (!userId) {
        console.log(`   ⏭️  교사 계정을 찾을 수 없음: ${email}`);
        stats.notFound++;
        continue;
      }

      const success = await deleteUser(client, userId, email, dryRun);
      if (success) {
        stats.deleted++;
        if (!dryRun) {
          console.log(`   ✅ 교사 계정 삭제 완료: ${email}`);
        }
      } else {
        stats.errors++;
      }
    } catch (error) {
      console.error(`   💥 교사 계정 삭제 중 오류 (${email}):`, error);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * 학생 계정 삭제
 */
async function deleteStudents(
  client: ReturnType<typeof createSupabaseClient>,
  dryRun: boolean
): Promise<DeletionStats['students']> {
  console.log('\n👨‍🎓 학생 계정 삭제 중...\n');
  const stats: DeletionStats['students'] = {
    total: studentEmails.length,
    deleted: 0,
    notFound: 0,
    errors: 0,
  };

  for (let i = 0; i < studentEmails.length; i++) {
    const email = studentEmails[i];
    try {
      const userId = await findUserByEmail(client, email);
      if (!userId) {
        if ((i + 1) % 20 === 0 || i < 5) {
          // 처음 5개와 20개마다만 로깅
          console.log(`   ⏭️  학생 계정을 찾을 수 없음: ${email}`);
        }
        stats.notFound++;
        continue;
      }

      const success = await deleteUser(client, userId, email, dryRun);
      if (success) {
        stats.deleted++;
        if ((i + 1) % 10 === 0) {
          console.log(`   진행 중... ${i + 1}/${studentEmails.length}`);
        }
      } else {
        stats.errors++;
      }
    } catch (error) {
      console.error(`   💥 학생 계정 삭제 중 오류 (${email}):`, error);
      stats.errors++;
    }
  }

  console.log(`   ✅ 학생 계정 삭제 완료: ${stats.deleted}명`);
  return stats;
}

/**
 * 메인 함수
 */
async function main() {
  // 환경변수 체크
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const envLocalPath = resolve(process.cwd(), '.env.local');
  const envPath = resolve(process.cwd(), '.env');

  console.log('🔍 환경변수 로딩 확인...');
  console.log(`   .env.local 파일 존재: ${existsSync(envLocalPath) ? '✅' : '❌'}`);
  console.log(`   .env 파일 존재: ${existsSync(envPath) ? '✅' : '❌'}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ 설정됨' : '❌ 없음'}`);
  console.log();

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 다음을 추가하세요:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=프로젝트_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=서비스_역할_키');
    console.error(`\n   현재 작업 디렉토리: ${process.cwd()}`);
    console.error(`   .env.local 경로: ${envLocalPath}`);
    process.exit(1);
  }

  // 명령줄 인자 파싱
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');

  const client = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('='.repeat(60));
  console.log('🗑️  계정 삭제 스크립트');
  console.log('='.repeat(60));
  console.log(`모드: ${dryRun ? '👀 Dry-run (실제 삭제 없음)' : '⚠️  실행 모드 (실제 삭제)'}`);
  console.log(`Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
  console.log(`교사 수: ${teacherEmails.length}명`);
  console.log(`학생 수: ${studentEmails.length}명`);
  console.log();

  if (!dryRun) {
    console.log('⚠️  경고: 이 작업은 되돌릴 수 없습니다!');
    console.log('   삭제될 항목:');
    console.log('   - Auth 사용자 계정');
    console.log('   - user_profiles 레코드');
    console.log('   - teacher_student_assignments 레코드');
    console.log('   - test_results 레코드');
    console.log();
  }

  const stats: DeletionStats = {
    teachers: { total: 0, deleted: 0, notFound: 0, errors: 0 },
    students: { total: 0, deleted: 0, notFound: 0, errors: 0 },
    profiles: { deleted: 0, errors: 0 },
    assignments: { deleted: 0, errors: 0 },
    testResults: { deleted: 0, errors: 0 },
  };

  try {
    // 1. 교사 계정 삭제
    stats.teachers = await deleteTeachers(client, dryRun);

    // 2. 학생 계정 삭제
    stats.students = await deleteStudents(client, dryRun);

    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 계정 삭제 결과 요약');
    console.log('='.repeat(60) + '\n');

    console.log('교사:');
    console.log(`   총 ${stats.teachers.total}명`);
    console.log(`   삭제: ${stats.teachers.deleted}명`);
    console.log(`   찾을 수 없음: ${stats.teachers.notFound}명`);
    if (stats.teachers.errors > 0) {
      console.log(`   오류: ${stats.teachers.errors}명`);
    }
    console.log();

    console.log('학생:');
    console.log(`   총 ${stats.students.total}명`);
    console.log(`   삭제: ${stats.students.deleted}명`);
    console.log(`   찾을 수 없음: ${stats.students.notFound}명`);
    if (stats.students.errors > 0) {
      console.log(`   오류: ${stats.students.errors}명`);
    }
    console.log();

    if (dryRun) {
      console.log('👀 Dry-run 모드: 실제로는 계정이 삭제되지 않았습니다.');
      console.log('   --dry-run 플래그 없이 실행하여 실제 계정을 삭제하세요.\n');
    } else {
      console.log('✅ 계정 삭제 완료!\n');
    }
  } catch (error) {
    console.error('💥 계정 삭제 중 오류 발생:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

