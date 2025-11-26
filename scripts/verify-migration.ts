import 'dotenv/config';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface VerificationResult {
  tableCounts: Record<string, { source: number; target: number; match: boolean }>;
  storageCounts: { source: number; target: number; match: boolean };
  sampleData: Record<string, { source: any; target: any; match: boolean }>;
  foreignKeyIntegrity: Array<{ table: string; issue: string }>;
  dataIntegrity: Array<{ table: string; issue: string }>;
}

/**
 * 마이그레이션 검증 스크립트
 * 
 * 마이그레이션 후 데이터 무결성을 검증합니다:
 * - 테이블별 레코드 수 비교
 * - Storage 파일 수 비교
 * - 샘플 데이터 검증
 * - 외래키 무결성 확인
 * 
 * 사용법:
 *   npx tsx scripts/verify-migration.ts
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
async function verifyMigration(): Promise<VerificationResult> {
  console.log('🔍 마이그레이션 검증 시작...\n');

  const sourceUrl = process.env.OLD_SUPABASE_URL;
  const sourceServiceKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
  const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targetServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sourceUrl || !sourceServiceKey || !targetUrl || !targetServiceKey) {
    console.error('❌ 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const sourceClient = createSupabaseClient(sourceUrl, sourceServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const targetClient = createSupabaseClient(targetUrl, targetServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const result: VerificationResult = {
    tableCounts: {},
    storageCounts: { source: 0, target: 0, match: false },
    sampleData: {},
    foreignKeyIntegrity: [],
    dataIntegrity: [],
  };

  // 1. 테이블별 레코드 수 비교
  console.log('📊 1. 테이블별 레코드 수 비교 중...\n');

  const tables = [
    'user_profiles',
    'teacher_student_assignments',
    'test_results',
    'curriculum_pdfs',
    'curriculum_pdf_chunks',
    'generated_test_items',
    'item_approval_workflow',
  ];

  for (const table of tables) {
    try {
      const { count: sourceCount } = await sourceClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      const { count: targetCount } = await targetClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      const match = sourceCount === targetCount;
      result.tableCounts[table] = {
        source: sourceCount || 0,
        target: targetCount || 0,
        match,
      };

      const status = match ? '✅' : '❌';
      console.log(`   ${status} ${table}: 소스 ${sourceCount || 0}개, 타겟 ${targetCount || 0}개`);
    } catch (error) {
      console.error(`   ❌ ${table} 검증 실패:`, error);
      result.tableCounts[table] = {
        source: 0,
        target: 0,
        match: false,
      };
    }
  }

  console.log();

  // 2. Storage 파일 수 비교
  console.log('📦 2. Storage 파일 수 비교 중...\n');

  const bucketName = process.env.STORAGE_BUCKET_NAME || 'student-recordings';

  async function countFiles(client: typeof sourceClient): Promise<number> {
    let count = 0;
    
    async function countRecursive(path: string = '') {
      const { data: files, error } = await client.storage
        .from(bucketName)
        .list(path, { limit: 1000 });
      
      if (error || !files) return;
      
      for (const file of files) {
        const fullPath = path ? `${path}/${file.name}` : file.name;
        if (file.id) {
          count++;
        } else {
          await countRecursive(fullPath);
        }
      }
    }

    await countRecursive();
    return count;
  }

  try {
    const sourceFileCount = await countFiles(sourceClient);
    const targetFileCount = await countFiles(targetClient);
    
    result.storageCounts = {
      source: sourceFileCount,
      target: targetFileCount,
      match: sourceFileCount === targetFileCount,
    };

    const status = result.storageCounts.match ? '✅' : '❌';
    console.log(`   ${status} Storage 파일: 소스 ${sourceFileCount}개, 타겟 ${targetFileCount}개\n`);
  } catch (error) {
    console.error(`   ❌ Storage 검증 실패:`, error);
  }

  // 3. 샘플 데이터 검증
  console.log('🔍 3. 샘플 데이터 검증 중...\n');

  // test_results에서 샘플 가져오기
  const { data: sourceSamples } = await sourceClient
    .from('test_results')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false });

  if (sourceSamples && sourceSamples.length > 0) {
    for (const sample of sourceSamples.slice(0, 3)) {
      try {
        const { data: targetSample } = await targetClient
          .from('test_results')
          .select('*')
          .eq('id', sample.id)
          .single();

        if (targetSample) {
          // 주요 필드 비교
          const match = 
            targetSample.user_id === sample.user_id &&
            targetSample.test_type === sample.test_type &&
            targetSample.question === sample.question;

          result.sampleData[`test_results_${sample.id}`] = {
            source: { id: sample.id, user_id: sample.user_id, test_type: sample.test_type },
            target: { id: targetSample.id, user_id: targetSample.user_id, test_type: targetSample.test_type },
            match,
          };

          const status = match ? '✅' : '❌';
          console.log(`   ${status} test_results #${sample.id}: ${match ? '일치' : '불일치'}`);
        } else {
          result.sampleData[`test_results_${sample.id}`] = {
            source: { id: sample.id },
            target: null,
            match: false,
          };
          console.log(`   ❌ test_results #${sample.id}: 타겟에 없음`);
        }
      } catch (error) {
        console.error(`   ❌ test_results #${sample.id} 검증 실패:`, error);
      }
    }
  }

  console.log();

  // 4. 외래키 무결성 확인
  console.log('🔗 4. 외래키 무결성 확인 중...\n');

  // test_results의 user_id 확인
  const { data: orphanedTestResults } = await targetClient
    .from('test_results')
    .select('id, user_id')
    .not('user_id', 'is', null)
    .limit(100);

  if (orphanedTestResults) {
    const userIds = [...new Set(orphanedTestResults.map(r => r.user_id))];
    let orphanedCount = 0;

    for (const userId of userIds.slice(0, 20)) {
      try {
        const { data: user } = await targetClient.auth.admin.getUserById(userId);
        if (!user?.user) {
          orphanedCount++;
        }
      } catch {
        orphanedCount++;
      }
    }

    if (orphanedCount > 0) {
      result.foreignKeyIntegrity.push({
        table: 'test_results',
        issue: `${orphanedCount}개의 orphaned user_id 발견 (샘플링)`,
      });
      console.log(`   ⚠️  test_results: ${orphanedCount}개의 orphaned user_id 발견`);
    } else {
      console.log(`   ✅ test_results: 외래키 무결성 양호`);
    }
  }

  console.log();

  // 5. 데이터 무결성 확인
  console.log('🔍 5. 데이터 무결성 확인 중...\n');

  // NULL 값이 많은 컬럼 확인
  const { data: testResultsWithNulls } = await targetClient
    .from('test_results')
    .select('audio_url, question, student_answer')
    .limit(100);

  if (testResultsWithNulls) {
    const nullAudioUrl = testResultsWithNulls.filter(r => !r.audio_url).length;
    const nullQuestion = testResultsWithNulls.filter(r => !r.question).length;
    
    if (nullAudioUrl > testResultsWithNulls.length * 0.5) {
      result.dataIntegrity.push({
        table: 'test_results',
        issue: `audio_url이 NULL인 레코드가 많음 (${nullAudioUrl}/${testResultsWithNulls.length})`,
      });
      console.log(`   ⚠️  test_results: audio_url NULL 비율 높음`);
    } else {
      console.log(`   ✅ test_results: 데이터 무결성 양호`);
    }
  }

  console.log();

  return result;
}

async function main() {
  try {
    const result = await verifyMigration();

    // 결과 요약
    console.log('='.repeat(60));
    console.log('📊 검증 결과 요약');
    console.log('='.repeat(60) + '\n');

    // 테이블 카운트
    console.log('📊 테이블 레코드 수:');
    let allTablesMatch = true;
    for (const [table, counts] of Object.entries(result.tableCounts)) {
      const status = counts.match ? '✅' : '❌';
      console.log(`   ${status} ${table}: ${counts.source} → ${counts.target}`);
      if (!counts.match) {
        allTablesMatch = false;
      }
    }
    console.log();

    // Storage 카운트
    console.log('📦 Storage 파일 수:');
    const storageStatus = result.storageCounts.match ? '✅' : '❌';
    console.log(`   ${storageStatus} ${result.storageCounts.source} → ${result.storageCounts.target}`);
    console.log();

    // 샘플 데이터
    console.log('🔍 샘플 데이터 검증:');
    let allSamplesMatch = true;
    for (const [key, sample] of Object.entries(result.sampleData)) {
      const status = sample.match ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${sample.match ? '일치' : '불일치'}`);
      if (!sample.match) {
        allSamplesMatch = false;
      }
    }
    console.log();

    // 외래키 무결성
    if (result.foreignKeyIntegrity.length > 0) {
      console.log('⚠️  외래키 무결성 이슈:');
      result.foreignKeyIntegrity.forEach(issue => {
        console.log(`   - ${issue.table}: ${issue.issue}`);
      });
      console.log();
    }

    // 데이터 무결성
    if (result.dataIntegrity.length > 0) {
      console.log('⚠️  데이터 무결성 이슈:');
      result.dataIntegrity.forEach(issue => {
        console.log(`   - ${issue.table}: ${issue.issue}`);
      });
      console.log();
    }

    // 최종 결과
    const allMatch = allTablesMatch && result.storageCounts.match && allSamplesMatch;
    
    if (allMatch && result.foreignKeyIntegrity.length === 0 && result.dataIntegrity.length === 0) {
      console.log('✅ 마이그레이션 검증 완료: 모든 검증 통과!\n');
    } else {
      console.log('⚠️  마이그레이션 검증 완료: 일부 이슈 발견\n');
      console.log('다음 단계:');
      console.log('  1. 발견된 이슈를 확인하고 수정');
      console.log('  2. optimize-new-project.ts 스크립트를 실행하여 최적화');
      console.log();
    }

  } catch (error) {
    console.error('💥 검증 중 오류 발생:', error);
    process.exit(1);
  }
}

main();

