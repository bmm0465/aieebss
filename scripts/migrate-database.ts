import 'dotenv/config';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface MigrationConfig {
  sourceUrl: string;
  sourceServiceKey: string;
  targetUrl: string;
  targetServiceKey: string;
  dryRun: boolean;
  batchSize: number;
}

/**
 * 데이터베이스 마이그레이션 스크립트 (Supabase API 기반)
 * 
 * 기존 프로젝트(AIDTPEL)에서 새 프로젝트(AIEEBSS)로 데이터를 마이그레이션합니다.
 * 
 * 사용법:
 *   npx tsx scripts/migrate-database.ts                    # Dry-run
 *   npx tsx scripts/migrate-database.ts --execute          # 실제 마이그레이션
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
async function migrateDatabase(config: MigrationConfig) {
  console.log('🔄 데이터베이스 마이그레이션 시작...\n');
  console.log(`모드: ${config.dryRun ? '👀 Dry-run (실제 마이그레이션 없음)' : '✅ 실행 모드'}\n`);

  const sourceClient = createSupabaseClient(config.sourceUrl, config.sourceServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const targetClient = createSupabaseClient(config.targetUrl, config.targetServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 마이그레이션 순서 (외래키 의존성 고려)
  const tables = [
    'user_profiles',
    'teacher_student_assignments',
    'curriculum_pdfs',
    'curriculum_pdf_chunks',
    'generated_test_items',
    'item_approval_workflow',
    'test_results',
  ];

  const migrationStats: Record<string, { total: number; migrated: number; errors: number }> = {};

  for (const table of tables) {
    console.log(`\n📊 ${table} 테이블 마이그레이션 중...`);
    
    migrationStats[table] = { total: 0, migrated: 0, errors: 0 };

    try {
      // 소스에서 데이터 가져오기
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: rows, error: fetchError } = await sourceClient
          .from(table)
          .select('*')
          .range(offset, offset + config.batchSize - 1);

        if (fetchError) {
          console.error(`   ❌ 데이터 조회 실패:`, fetchError.message);
          migrationStats[table].errors++;
          break;
        }

        if (!rows || rows.length === 0) {
          hasMore = false;
          break;
        }

        migrationStats[table].total += rows.length;
        console.log(`   📦 배치 ${Math.floor(offset / config.batchSize) + 1}: ${rows.length}개 레코드`);

        if (!config.dryRun) {
          // 타겟에 삽입
          const { error: insertError } = await targetClient
            .from(table)
            .upsert(rows, { onConflict: 'id' });

          if (insertError) {
            console.error(`   ❌ 삽입 실패:`, insertError.message);
            migrationStats[table].errors += rows.length;
          } else {
            migrationStats[table].migrated += rows.length;
            console.log(`   ✅ 마이그레이션 완료: ${rows.length}개`);
          }
        } else {
          console.log(`   👀 Dry-run: ${rows.length}개 레코드가 마이그레이션될 예정입니다.`);
          migrationStats[table].migrated += rows.length;
        }

        if (rows.length < config.batchSize) {
          hasMore = false;
        } else {
          offset += config.batchSize;
        }
      }

      console.log(`   ✅ ${table} 완료: 총 ${migrationStats[table].total}개, 마이그레이션 ${migrationStats[table].migrated}개`);

    } catch (error) {
      console.error(`   💥 ${table} 마이그레이션 중 오류:`, error);
      migrationStats[table].errors = migrationStats[table].total;
    }
  }

  // Auth 사용자 마이그레이션
  console.log(`\n👥 Auth 사용자 마이그레이션 중...`);
  
  try {
    // 소스에서 사용자 목록 가져오기
    const { data: { users }, error: listError } = await sourceClient.auth.admin.listUsers();

    if (listError) {
      console.error(`   ❌ 사용자 목록 조회 실패:`, listError.message);
    } else if (users) {
      console.log(`   📦 발견된 사용자: ${users.length}개`);

      if (!config.dryRun) {
        // 각 사용자를 타겟에 생성
        let migrated = 0;
        let errors = 0;

        for (const user of users) {
          try {
            // 사용자 생성 (이메일, 비밀번호는 마이그레이션할 수 없으므로 임시 비밀번호 설정 필요)
            const { data: newUser, error: createError } = await targetClient.auth.admin.createUser({
              email: user.email,
              email_confirm: true,
              user_metadata: user.user_metadata,
              app_metadata: user.app_metadata,
            });

            if (createError) {
              // 이미 존재하는 경우 무시
              if (createError.message.includes('already registered')) {
                console.log(`   ⏭️  사용자 이미 존재: ${user.email}`);
              } else {
                console.error(`   ❌ 사용자 생성 실패 (${user.email}):`, createError.message);
                errors++;
              }
            } else {
              migrated++;
              if (migrated % 10 === 0) {
                console.log(`   진행 중... ${migrated}/${users.length}`);
              }
            }
          } catch (error) {
            console.error(`   ❌ 사용자 마이그레이션 오류 (${user.email}):`, error);
            errors++;
          }
        }

        console.log(`   ✅ Auth 사용자 마이그레이션 완료: ${migrated}개 성공, ${errors}개 실패`);
      } else {
        console.log(`   👀 Dry-run: ${users.length}개 사용자가 마이그레이션될 예정입니다.`);
      }
    }
  } catch (error) {
    console.error(`   💥 Auth 사용자 마이그레이션 중 오류:`, error);
  }

  // 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 마이그레이션 결과 요약');
  console.log('='.repeat(60) + '\n');

  for (const [table, stats] of Object.entries(migrationStats)) {
    console.log(`${table}:`);
    console.log(`   총 레코드: ${stats.total}개`);
    console.log(`   마이그레이션: ${stats.migrated}개`);
    if (stats.errors > 0) {
      console.log(`   오류: ${stats.errors}개`);
    }
    console.log();
  }

  if (config.dryRun) {
    console.log('👀 Dry-run 모드: 실제로는 마이그레이션되지 않았습니다.');
    console.log('   --execute 플래그를 사용하여 실제 마이그레이션을 실행하세요.\n');
  } else {
    console.log('✅ 데이터베이스 마이그레이션 완료!\n');
  }
}

async function main() {
  // 환경변수 체크
  const sourceUrl = process.env.OLD_SUPABASE_URL;
  const sourceServiceKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
  const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targetServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sourceUrl || !sourceServiceKey) {
    console.error('❌ 기존 프로젝트 환경변수가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 다음을 추가하세요:');
    console.error('   OLD_SUPABASE_URL=기존_프로젝트_URL');
    console.error('   OLD_SUPABASE_SERVICE_ROLE_KEY=기존_프로젝트_서비스_키');
    process.exit(1);
  }

  if (!targetUrl || !targetServiceKey) {
    console.error('❌ 새 프로젝트 환경변수가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 다음을 추가하세요:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=새_프로젝트_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=새_프로젝트_서비스_키');
    process.exit(1);
  }

  // 명령줄 인자 파싱
  const args = process.argv.slice(2);
  const execute = args.includes('--execute') || args.includes('-e');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100');

  const config: MigrationConfig = {
    sourceUrl,
    sourceServiceKey,
    targetUrl,
    targetServiceKey,
    dryRun: !execute,
    batchSize,
  };

  console.log(`소스 프로젝트: ${sourceUrl.substring(0, 30)}...`);
  console.log(`타겟 프로젝트: ${targetUrl.substring(0, 30)}...`);
  console.log(`배치 크기: ${batchSize}\n`);

  await migrateDatabase(config);
}

main().catch((error) => {
  console.error('💥 마이그레이션 중 오류 발생:', error);
  process.exit(1);
});

