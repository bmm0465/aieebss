import 'dotenv/config';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface MigrationConfig {
  sourceUrl: string;
  sourceServiceKey: string;
  targetUrl: string;
  targetServiceKey: string;
  tables: string[];
  dryRun: boolean;
  batchSize: number;
}

/**
 * 특정 테이블만 마이그레이션하는 스크립트
 * 
 * 기존 프로젝트(AIDTPEL)에서 새 프로젝트(AIEEBSS)로 지정된 테이블만 마이그레이션합니다.
 * 
 * 사용법:
 *   # user_profiles와 teacher_student_assignments만 마이그레이션
 *   npx tsx scripts/migrate-specific-tables.ts user_profiles teacher_student_assignments
 *   
 *   # Dry-run
 *   npx tsx scripts/migrate-specific-tables.ts user_profiles teacher_student_assignments --dry-run
 *   
 *   # 실제 마이그레이션
 *   npx tsx scripts/migrate-specific-tables.ts user_profiles teacher_student_assignments --execute
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
async function migrateSpecificTables(config: MigrationConfig) {
  console.log('🔄 특정 테이블 마이그레이션 시작...\n');
  console.log(`마이그레이션 대상 테이블: ${config.tables.join(', ')}\n`);
  console.log(`모드: ${config.dryRun ? '👀 Dry-run (실제 마이그레이션 없음)' : '✅ 실행 모드'}\n`);

  const sourceClient = createSupabaseClient(config.sourceUrl, config.sourceServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const targetClient = createSupabaseClient(config.targetUrl, config.targetServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const migrationStats: Record<string, { total: number; migrated: number; errors: number }> = {};

  for (const table of config.tables) {
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
          // 타겟에 삽입 (upsert 사용하여 중복 방지)
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
    console.log('✅ 테이블 마이그레이션 완료!\n');
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
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100');
  
  // 테이블 이름 추출 (--execute, --dry-run, --batch-size 제외)
  const tables = args.filter(arg => 
    !arg.startsWith('--') && 
    arg !== '--execute' && 
    arg !== '-e' && 
    arg !== '--dry-run' && 
    arg !== '-d' &&
    !arg.startsWith('--batch-size=')
  );

  if (tables.length === 0) {
    console.error('❌ 마이그레이션할 테이블을 지정해주세요.');
    console.error('\n사용법:');
    console.error('   npx tsx scripts/migrate-specific-tables.ts <table1> <table2> ... [--execute]');
    console.error('\n예시:');
    console.error('   npx tsx scripts/migrate-specific-tables.ts user_profiles teacher_student_assignments --execute');
    process.exit(1);
  }

  const config: MigrationConfig = {
    sourceUrl,
    sourceServiceKey,
    targetUrl,
    targetServiceKey,
    tables,
    dryRun: dryRun || !execute,
    batchSize,
  };

  console.log(`소스 프로젝트: ${sourceUrl.substring(0, 30)}...`);
  console.log(`타겟 프로젝트: ${targetUrl.substring(0, 30)}...`);
  console.log(`배치 크기: ${batchSize}\n`);

  await migrateSpecificTables(config);
}

main().catch((error) => {
  console.error('💥 마이그레이션 중 오류 발생:', error);
  process.exit(1);
});





