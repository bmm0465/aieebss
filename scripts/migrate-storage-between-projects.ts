import 'dotenv/config';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface MigrationConfig {
  sourceUrl: string;
  sourceServiceKey: string;
  targetUrl: string;
  targetServiceKey: string;
  bucketName: string;
  dryRun: boolean;
  skipOrphaned: boolean;
}

/**
 * 프로젝트 간 Storage 파일 마이그레이션 스크립트
 * 
 * 기존 프로젝트(AIDTPEL)에서 새 프로젝트(AIEEBSS)로 Storage 파일을 마이그레이션합니다.
 * DB에 참조가 있는 파일만 이전합니다 (불일치 파일 제외).
 * 
 * 사용법:
 *   npx tsx scripts/migrate-storage-between-projects.ts                    # Dry-run
 *   npx tsx scripts/migrate-storage-between-projects.ts --execute         # 실제 마이그레이션
 *   npx tsx scripts/migrate-storage-between-projects.ts --include-orphaned  # Orphaned 파일도 포함
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
async function migrateStorageBetweenProjects(config: MigrationConfig) {
  console.log('🔄 Storage 파일 마이그레이션 시작...\n');
  console.log(`모드: ${config.dryRun ? '👀 Dry-run (실제 마이그레이션 없음)' : '✅ 실행 모드'}\n`);

  const sourceClient = createSupabaseClient(config.sourceUrl, config.sourceServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const targetClient = createSupabaseClient(config.targetUrl, config.targetServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. 타겟 프로젝트에서 DB에 참조된 파일 목록 가져오기
  console.log('📊 1. 타겟 프로젝트의 DB 참조 파일 확인 중...');
  
  const { data: testResultsWithAudio } = await targetClient
    .from('test_results')
    .select('audio_url')
    .not('audio_url', 'is', null);

  const audioUrlsInTargetDb = new Set(
    (testResultsWithAudio || [])
      .map(r => r.audio_url)
      .filter((url): url is string => !!url)
  );

  console.log(`   타겟 DB에 참조된 파일: ${audioUrlsInTargetDb.size}개\n`);

  // 2. 소스 프로젝트에서 모든 Storage 파일 찾기
  console.log('📦 2. 소스 프로젝트의 Storage 파일 스캔 중...');
  
  const allSourceFiles: string[] = [];
  
  async function listAllFiles(client: typeof sourceClient, path: string = '') {
    const { data: files, error } = await client.storage
      .from(config.bucketName)
      .list(path, { limit: 1000 });
    
    if (error) {
      console.warn(`   ⚠️  목록 조회 실패 (${path}):`, error.message);
      return;
    }
    
    if (!files) return;
    
    for (const file of files) {
      const fullPath = path ? `${path}/${file.name}` : file.name;
      if (file.id) {
        // 파일인 경우
        allSourceFiles.push(fullPath);
      } else {
        // 폴더인 경우 재귀
        await listAllFiles(client, fullPath);
      }
    }
  }

  await listAllFiles(sourceClient);
  console.log(`   소스 Storage 파일 수: ${allSourceFiles.length}개\n`);

  // 3. 마이그레이션할 파일 필터링
  console.log('🔍 3. 마이그레이션 대상 파일 필터링 중...');
  
  let filesToMigrate: string[] = [];
  
  if (config.skipOrphaned) {
    // DB에 참조가 있는 파일만 마이그레이션
    filesToMigrate = allSourceFiles.filter(file => audioUrlsInTargetDb.has(file));
    console.log(`   DB에 참조된 파일: ${filesToMigrate.length}개`);
  } else {
    // 모든 파일 마이그레이션
    filesToMigrate = allSourceFiles;
    console.log(`   모든 파일: ${filesToMigrate.length}개`);
  }

  if (filesToMigrate.length === 0) {
    console.log('✅ 마이그레이션할 파일이 없습니다.\n');
    return;
  }

  // 샘플 출력
  console.log('\n📋 마이그레이션 계획 샘플 (처음 5개):');
  filesToMigrate.slice(0, 5).forEach((file, idx) => {
    console.log(`   ${idx + 1}. ${file}`);
  });
  if (filesToMigrate.length > 5) {
    console.log(`   ... 및 ${filesToMigrate.length - 5}개 더\n`);
  }

  if (config.dryRun) {
    console.log('\n👀 Dry-run 모드: 실제 마이그레이션을 실행하려면 --execute 플래그를 사용하세요.\n');
    return;
  }

  // 4. 실제 마이그레이션 실행
  console.log('\n🚀 마이그레이션 실행 중...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (let i = 0; i < filesToMigrate.length; i++) {
    const filePath = filesToMigrate[i];
    const progress = `[${i + 1}/${filesToMigrate.length}]`;
    
    try {
      // 타겟에 이미 파일이 있는지 확인
      const { data: existingFile } = await targetClient.storage
        .from(config.bucketName)
        .list(filePath.split('/').slice(0, -1).join('/'));

      if (existingFile?.some(f => f.name === filePath.split('/').pop())) {
        console.log(`${progress} ⏭️  건너뜀 (이미 존재): ${filePath}`);
        skipCount++;
        continue;
      }

      // 소스에서 파일 다운로드
      const { data: fileData, error: downloadError } = await sourceClient.storage
        .from(config.bucketName)
        .download(filePath);
      
      if (downloadError || !fileData) {
        const errorMsg = downloadError?.message || '파일을 찾을 수 없음';
        console.error(`${progress} ❌ 다운로드 실패: ${filePath} - ${errorMsg}`);
        errors.push({ file: filePath, error: `다운로드 실패: ${errorMsg}` });
        errorCount++;
        continue;
      }

      // 타겟에 업로드
      const arrayBuffer = await fileData.arrayBuffer();
      const { error: uploadError } = await targetClient.storage
        .from(config.bucketName)
        .upload(filePath, arrayBuffer, { 
          contentType: fileData.type || 'application/octet-stream',
          upsert: false 
        });
      
      if (uploadError) {
        console.error(`${progress} ❌ 업로드 실패: ${filePath} - ${uploadError.message}`);
        errors.push({ file: filePath, error: `업로드 실패: ${uploadError.message}` });
        errorCount++;
        continue;
      }

      console.log(`${progress} ✅ 완료: ${filePath}`);
      successCount++;

      // 진행 상황 표시 (10개마다)
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 진행 상황: ${i + 1}/${filesToMigrate.length} (성공: ${successCount}, 실패: ${errorCount}, 건너뜀: ${skipCount})\n`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`${progress} ❌ 에러: ${filePath} - ${errorMsg}`);
      errors.push({ file: filePath, error: errorMsg });
      errorCount++;
    }
  }

  // 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 마이그레이션 완료');
  console.log('='.repeat(60));
  console.log(`   ✅ 성공: ${successCount}개`);
  console.log(`   ⏭️  건너뜀: ${skipCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개`);

  // 에러 요약 출력
  if (errors.length > 0) {
    console.log(`\n⚠️  에러 요약 (처음 10개):`);
    errors.slice(0, 10).forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.file}: ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... 및 ${errors.length - 10}개 더`);
    }
  }

  console.log('\n✨ Storage 파일 마이그레이션 완료!\n');
}

async function main() {
  // 환경변수 체크
  const sourceUrl = process.env.OLD_SUPABASE_URL;
  const sourceServiceKey = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
  const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targetServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.STORAGE_BUCKET_NAME || 'student-recordings';

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
  const includeOrphaned = args.includes('--include-orphaned');

  const config: MigrationConfig = {
    sourceUrl,
    sourceServiceKey,
    targetUrl,
    targetServiceKey,
    bucketName,
    dryRun: !execute,
    skipOrphaned: !includeOrphaned,
  };

  console.log(`소스 프로젝트: ${sourceUrl.substring(0, 30)}...`);
  console.log(`타겟 프로젝트: ${targetUrl.substring(0, 30)}...`);
  console.log(`버킷 이름: ${bucketName}`);
  console.log(`Orphaned 파일: ${config.skipOrphaned ? '제외' : '포함'}\n`);

  await migrateStorageBetweenProjects(config);
}

main().catch((error) => {
  console.error('💥 마이그레이션 중 오류 발생:', error);
  process.exit(1);
});

