import 'dotenv/config';
import { createServiceClient } from '../src/lib/supabase/server';

/**
 * 마이그레이션 후 최적화 스크립트
 * 
 * 새 프로젝트(AIEEBSS)의 데이터베이스를 최적화합니다:
 * - VACUUM 및 ANALYZE 실행
 * - 인덱스 재구성
 * - 통계 정보 업데이트
 * 
 * 사용법:
 *   npx tsx scripts/optimize-new-project.ts                    # Dry-run
 *   npx tsx scripts/optimize-new-project.ts --execute           # 실제 최적화
 * 
 * 환경 변수 (.env.local 파일 필요):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
async function optimizeNewProject(execute: boolean) {
  console.log('⚡ 데이터베이스 최적화 시작...\n');
  console.log(`모드: ${execute ? '✅ 실행 모드' : '👀 Dry-run 모드 (실제 최적화 없음)'}\n`);

  const supabase = createServiceClient();

  // 1. VACUUM 실행
  console.log('🧹 1. VACUUM 실행 중...');
  
  if (execute) {
    try {
      // VACUUM은 직접 SQL로 실행해야 함
      // Supabase는 REST API를 통해 직접 SQL을 실행할 수 없으므로,
      // 사용자에게 수동 실행을 안내
      console.log('   ℹ️  VACUUM은 Supabase 대시보드의 SQL Editor에서 실행해야 합니다.');
      console.log('   다음 SQL을 실행하세요:');
      console.log('   VACUUM ANALYZE;');
      console.log();
    } catch (error) {
      console.error('   ❌ VACUUM 실행 실패:', error);
    }
  } else {
    console.log('   👀 Dry-run: VACUUM ANALYZE 실행 예정');
    console.log('   실제 실행 시 Supabase SQL Editor에서 다음을 실행하세요:');
    console.log('   VACUUM ANALYZE;');
    console.log();
  }

  // 2. ANALYZE 실행 (테이블별)
  console.log('📊 2. ANALYZE 실행 중...\n');

  const tables = [
    'test_results',
    'user_profiles',
    'teacher_student_assignments',
    'curriculum_pdfs',
    'curriculum_pdf_chunks',
    'generated_test_items',
    'item_approval_workflow',
  ];

  if (execute) {
    console.log('   ℹ️  ANALYZE는 Supabase 대시보드의 SQL Editor에서 실행해야 합니다.');
    console.log('   다음 SQL을 실행하세요:\n');
    
    for (const table of tables) {
      console.log(`   ANALYZE ${table};`);
    }
    console.log();
  } else {
    console.log('   👀 Dry-run: 다음 테이블에 대해 ANALYZE 실행 예정:');
    tables.forEach(table => {
      console.log(`     - ${table}`);
    });
    console.log();
  }

  // 3. 인덱스 재구성
  console.log('🔧 3. 인덱스 상태 확인 중...\n');

  if (execute) {
    console.log('   ℹ️  인덱스 재구성은 Supabase 대시보드의 SQL Editor에서 실행해야 합니다.');
    console.log('   다음 SQL을 실행하여 인덱스 상태를 확인하세요:\n');
    console.log('   SELECT');
    console.log('     schemaname,');
    console.log('     tablename,');
    console.log('     indexname,');
    console.log('     idx_scan,');
    console.log('     idx_tup_read,');
    console.log('     idx_tup_fetch');
    console.log('   FROM pg_stat_user_indexes');
    console.log('   ORDER BY idx_scan;');
    console.log();
    console.log('   사용되지 않는 인덱스가 있다면 다음으로 삭제할 수 있습니다:');
    console.log('   DROP INDEX IF EXISTS index_name;');
    console.log();
  } else {
    console.log('   👀 Dry-run: 인덱스 상태 확인 예정');
    console.log();
  }

  // 4. 통계 정보 업데이트
  console.log('📈 4. 통계 정보 업데이트 중...\n');

  if (execute) {
    console.log('   ℹ️  통계 정보는 ANALYZE와 함께 업데이트됩니다.');
    console.log('   위의 ANALYZE 명령을 실행하면 통계 정보도 함께 업데이트됩니다.');
    console.log();
  } else {
    console.log('   👀 Dry-run: 통계 정보 업데이트 예정');
    console.log();
  }

  // 5. 테이블 크기 확인
  console.log('📏 5. 테이블 크기 확인 중...\n');

  if (execute) {
    try {
      // 테이블 크기 조회 SQL (RPC 함수가 있다면 사용)
      console.log('   ℹ️  테이블 크기는 Supabase 대시보드의 SQL Editor에서 확인할 수 있습니다.');
      console.log('   다음 SQL을 실행하세요:\n');
      console.log('   SELECT');
      console.log('     schemaname,');
      console.log('     tablename,');
      console.log('     pg_size_pretty(pg_total_relation_size(schemaname||\'.\'||tablename)) AS size');
      console.log('   FROM pg_tables');
      console.log('   WHERE schemaname = \'public\'');
      console.log('   ORDER BY pg_total_relation_size(schemaname||\'.\'||tablename) DESC;');
      console.log();
    } catch (error) {
      console.error('   ❌ 테이블 크기 확인 실패:', error);
    }
  } else {
    console.log('   👀 Dry-run: 테이블 크기 확인 예정');
    console.log();
  }

  // 결과 요약
  console.log('='.repeat(60));
  console.log('📊 최적화 작업 요약');
  console.log('='.repeat(60) + '\n');

  if (execute) {
    console.log('✅ 최적화 스크립트 실행 완료!\n');
    console.log('⚠️  다음 단계:');
    console.log('   1. Supabase 대시보드의 SQL Editor에 접속');
    console.log('   2. 위에 표시된 SQL 명령들을 순서대로 실행');
    console.log('   3. 실행 결과를 확인하고 필요시 추가 최적화 수행');
    console.log();
  } else {
    console.log('👀 Dry-run 모드: 실제로는 최적화되지 않았습니다.');
    console.log('   --execute 플래그를 사용하여 최적화 가이드를 확인하세요.\n');
  }

  // SQL 스크립트 파일 생성
  if (execute) {
    const fs = await import('fs/promises');
    const sqlScript = `-- Supabase 데이터베이스 최적화 스크립트
-- 생성일: ${new Date().toISOString()}

-- 1. VACUUM 및 ANALYZE
VACUUM ANALYZE;

-- 2. 테이블별 ANALYZE
${tables.map(table => `ANALYZE ${table};`).join('\n')}

-- 3. 인덱스 상태 확인
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- 4. 테이블 크기 확인
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
`;

    await fs.writeFile('supabase-optimization.sql', sqlScript, 'utf-8');
    console.log('💾 최적화 SQL 스크립트가 supabase-optimization.sql에 저장되었습니다.');
    console.log('   이 파일을 Supabase SQL Editor에서 실행할 수 있습니다.\n');
  }
}

async function main() {
  // 환경변수 체크
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ 환경변수가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 다음을 추가하세요:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // 명령줄 인자 파싱
  const args = process.argv.slice(2);
  const execute = args.includes('--execute') || args.includes('-e');

  await optimizeNewProject(execute);
}

main().catch((error) => {
  console.error('💥 최적화 중 오류 발생:', error);
  process.exit(1);
});

