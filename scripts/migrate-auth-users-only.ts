import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// .env.local 파일을 명시적으로 로드
config({ path: resolve(process.cwd(), '.env.local') });
// .env 파일도 로드 (fallback)
config({ path: resolve(process.cwd(), '.env') });

interface AuthMigrationConfig {
  sourceUrl: string;
  sourceServiceKey: string;
  targetUrl: string;
  targetServiceKey: string;
  dryRun: boolean;
  sendPasswordReset: boolean; // 비밀번호 재설정 링크 발송 여부
}

/**
 * Auth 사용자만 마이그레이션하는 스크립트
 * 
 * AIDTPEL 프로젝트의 Auth 사용자(이메일, 메타데이터)를 AIEEBSS 프로젝트로 마이그레이션합니다.
 * 
 * 사용법:
 *   npx tsx scripts/migrate-auth-users-only.ts                    # Dry-run
 *   npx tsx scripts/migrate-auth-users-only.ts --execute          # 실제 마이그레이션
 *   npx tsx scripts/migrate-auth-users-only.ts --execute --send-reset  # 비밀번호 재설정 링크 발송
 * 
 * 환경 변수 (.env.local 파일 필요):
 *   # 기존 프로젝트 (AIDTPEL)
 *   OLD_SUPABASE_URL
 *   OLD_SUPABASE_SERVICE_ROLE_KEY
 *   
 *   # 새 프로젝트 (AIEEBSS)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
async function migrateAuthUsers(config: AuthMigrationConfig) {
  console.log('🔄 Auth 사용자 마이그레이션 시작...\n');
  console.log(`모드: ${config.dryRun ? '👀 Dry-run (실제 마이그레이션 없음)' : '✅ 실행 모드'}`);
  console.log(`비밀번호 재설정 링크 발송: ${config.sendPasswordReset ? '✅ 예' : '❌ 아니오'}\n`);

  const sourceClient = createSupabaseClient(config.sourceUrl, config.sourceServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const targetClient = createSupabaseClient(config.targetUrl, config.targetServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 소스에서 사용자 목록 가져오기
    console.log('📦 소스 프로젝트에서 사용자 목록 조회 중...');
    const { data: { users }, error: listError } = await sourceClient.auth.admin.listUsers();

    if (listError) {
      console.error(`   ❌ 사용자 목록 조회 실패:`, listError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('   ℹ️  마이그레이션할 사용자가 없습니다.');
      return;
    }

    console.log(`   ✅ 발견된 사용자: ${users.length}개\n`);

    if (config.dryRun) {
      console.log('👀 Dry-run 모드: 다음 사용자들이 마이그레이션될 예정입니다:\n');
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - 이메일 확인: ${user.email_confirmed_at ? '✅' : '❌'}`);
        console.log(`      - 생성일: ${user.created_at}`);
        if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
          console.log(`      - 메타데이터: ${JSON.stringify(user.user_metadata)}`);
        }
        console.log();
      });
      console.log('👀 Dry-run 모드: 실제로는 마이그레이션되지 않았습니다.');
      console.log('   --execute 플래그를 사용하여 실제 마이그레이션을 실행하세요.\n');
      return;
    }

    // 실제 마이그레이션
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const passwordResetUsers: string[] = [];

    console.log('🚀 사용자 마이그레이션 시작...\n');

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      try {
        // 사용자 생성
        const { data: newUser, error: createError } = await targetClient.auth.admin.createUser({
          email: user.email,
          email_confirm: user.email_confirmed_at ? true : false,
          user_metadata: user.user_metadata || {},
          app_metadata: user.app_metadata || {},
          // 비밀번호는 마이그레이션할 수 없으므로 사용자가 재설정해야 함
        });

        if (createError) {
          // 이미 존재하는 경우
          if (createError.message.includes('already registered') || 
              createError.message.includes('already exists') ||
              createError.message.includes('User already registered')) {
            console.log(`   ⏭️  [${i + 1}/${users.length}] 사용자 이미 존재: ${user.email}`);
            skipped++;
          } else {
            console.error(`   ❌ [${i + 1}/${users.length}] 사용자 생성 실패 (${user.email}):`, createError.message);
            errors++;
          }
        } else {
          migrated++;
          console.log(`   ✅ [${i + 1}/${users.length}] 사용자 생성 완료: ${user.email}`);

          // 비밀번호 재설정 링크 발송
          if (config.sendPasswordReset && user.email) {
            try {
              const { error: resetError } = await targetClient.auth.admin.generateLink({
                type: 'recovery',
                email: user.email,
              });

              if (resetError) {
                console.log(`      ⚠️  비밀번호 재설정 링크 생성 실패: ${resetError.message}`);
              } else {
                passwordResetUsers.push(user.email);
                console.log(`      📧 비밀번호 재설정 링크 생성됨 (이메일 발송 필요)`);
              }
            } catch (resetErr) {
              console.log(`      ⚠️  비밀번호 재설정 링크 생성 중 오류: ${resetErr}`);
            }
          }

          // 진행 상황 표시
          if (migrated % 10 === 0) {
            console.log(`\n   📊 진행 상황: ${migrated}개 생성, ${skipped}개 건너뜀, ${errors}개 오류\n`);
          }
        }
      } catch (error) {
        console.error(`   ❌ 사용자 마이그레이션 오류 (${user.email}):`, error);
        errors++;
      }
    }

    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 Auth 사용자 마이그레이션 결과 요약');
    console.log('='.repeat(60) + '\n');
    console.log(`총 사용자: ${users.length}개`);
    console.log(`✅ 성공: ${migrated}개`);
    console.log(`⏭️  건너뜀 (이미 존재): ${skipped}개`);
    console.log(`❌ 실패: ${errors}개`);
    
    if (config.sendPasswordReset && passwordResetUsers.length > 0) {
      console.log(`\n📧 비밀번호 재설정 링크 생성: ${passwordResetUsers.length}개`);
      console.log('\n⚠️  중요: 비밀번호 재설정 링크를 사용자에게 이메일로 발송해야 합니다.');
      console.log('   Supabase Dashboard > Authentication > Users에서 각 사용자에게 링크를 발송하세요.');
    }

    console.log('\n⚠️  중요: 다음 작업이 필요합니다:');
    console.log('   1. 각 사용자는 비밀번호 재설정이 필요합니다');
    if (config.sendPasswordReset) {
      console.log('      - 비밀번호 재설정 링크가 생성되었습니다 (이메일 발송 필요)');
    } else {
      console.log('      - --send-reset 플래그를 사용하여 비밀번호 재설정 링크를 생성하세요');
      console.log('      - 또는 Supabase Dashboard에서 각 사용자에게 수동으로 링크를 발송하세요');
    }
    console.log('   2. 새 프로젝트에서 사용자가 로그인할 수 있도록 안내하세요');
    console.log('   3. 필요시 user_profiles 테이블에 사용자 프로필을 생성하세요\n');

  } catch (error) {
    console.error(`   💥 Auth 사용자 마이그레이션 중 오류:`, error);
  }
}

async function main() {
  // 환경변수 체크
  const sourceUrl = process.env.OLD_SUPABASE_URL;
  const sourceServiceKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
  const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targetServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 디버깅 정보 출력
  const envLocalPath = resolve(process.cwd(), '.env.local');
  const envPath = resolve(process.cwd(), '.env');
  
  console.log('🔍 환경변수 로딩 확인...');
  console.log(`   .env.local 파일 존재: ${existsSync(envLocalPath) ? '✅' : '❌'}`);
  console.log(`   .env 파일 존재: ${existsSync(envPath) ? '✅' : '❌'}`);
  console.log(`   OLD_SUPABASE_URL: ${sourceUrl ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   OLD_SUPABASE_SERVICE_ROLE_KEY: ${sourceServiceKey ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${targetUrl ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${targetServiceKey ? '✅ 설정됨' : '❌ 없음'}`);
  console.log();

  if (!sourceUrl || !sourceServiceKey) {
    console.error('❌ 기존 프로젝트 환경변수가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 다음을 추가하세요:');
    console.error('   OLD_SUPABASE_URL=기존_프로젝트_URL');
    console.error('   OLD_SUPABASE_SERVICE_ROLE_KEY=기존_프로젝트_서비스_키');
    console.error(`\n   현재 작업 디렉토리: ${process.cwd()}`);
    console.error(`   .env.local 경로: ${envLocalPath}`);
    process.exit(1);
  }

  if (!targetUrl || !targetServiceKey) {
    console.error('❌ 새 프로젝트 환경변수가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 다음을 추가하세요:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=새_프로젝트_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=새_프로젝트_서비스_키');
    console.error(`\n   현재 작업 디렉토리: ${process.cwd()}`);
    console.error(`   .env.local 경로: ${envLocalPath}`);
    process.exit(1);
  }

  // 명령줄 인자 파싱
  const args = process.argv.slice(2);
  const execute = args.includes('--execute') || args.includes('-e');
  const sendReset = args.includes('--send-reset') || args.includes('-r');

  const migrationConfig: AuthMigrationConfig = {
    sourceUrl,
    sourceServiceKey,
    targetUrl,
    targetServiceKey,
    dryRun: !execute,
    sendPasswordReset: sendReset,
  };

  console.log(`소스 프로젝트: ${sourceUrl.substring(0, 30)}...`);
  console.log(`타겟 프로젝트: ${targetUrl.substring(0, 30)}...\n`);

  await migrateAuthUsers(migrationConfig);
}

main().catch((error) => {
  console.error('💥 마이그레이션 중 오류 발생:', error);
  process.exit(1);
});

