import 'dotenv/config';
import { createServiceClient } from '../src/lib/supabase/server';
import { readFile } from 'fs/promises';

interface CleanupOptions {
  removeOrphanedRecords: boolean;
  removeOrphanedFiles: boolean;
  removeOldData: boolean;
  oldDataThresholdDays: number;
  dryRun: boolean;
}

/**
 * 데이터 정리 스크립트
 * 
 * 마이그레이션 전에 기존 프로젝트의 데이터를 정리합니다:
 * - 삭제된 사용자의 orphaned records 제거
 * - Storage와 DB 불일치 파일 정리
 * - 오래된 데이터 정리 (선택적)
 * 
 * 사용법:
 *   npx tsx scripts/cleanup-old-project.ts                    # Dry-run
 *   npx tsx scripts/cleanup-old-project.ts --execute         # 실제 실행
 *   npx tsx scripts/cleanup-old-project.ts --remove-orphaned   # Orphaned records만 제거
 *   npx tsx scripts/cleanup-old-project.ts --remove-files     # Orphaned files만 제거
 *   npx tsx scripts/cleanup-old-project.ts --remove-old 365    # 365일 이상 된 데이터 제거
 * 
 * 환경 변수 (.env.local 파일 필요):
 *   NEXT_PUBLIC_SUPABASE_URL (기존 프로젝트)
 *   SUPABASE_SERVICE_ROLE_KEY (기존 프로젝트)
 */
async function cleanupOldProject(options: CleanupOptions) {
  console.log('🧹 데이터 정리 시작...\n');
  console.log(`모드: ${options.dryRun ? '👀 Dry-run (실제 삭제 없음)' : '✅ 실행 모드'}\n`);

  const supabase = createServiceClient();
  let totalDeleted = 0;
  const errors: Array<{ type: string; error: string }> = [];

  // 1. Orphaned records 제거
  if (options.removeOrphanedRecords) {
    console.log('📊 1. Orphaned Records 정리 중...\n');

    // test_results에서 user_id가 auth.users에 없는 경우
    const { data: allTestResults } = await supabase
      .from('test_results')
      .select('id, user_id')
      .not('user_id', 'is', null);

    if (allTestResults) {
      const userIds = [...new Set(allTestResults.map(r => r.user_id))];
      const validUserIds = new Set<string>();
      const orphanedIds: number[] = [];

      console.log(`   사용자 확인 중... (${userIds.length}개)`);
      
      // 배치로 사용자 확인
      for (let i = 0; i < userIds.length; i += 50) {
        const batch = userIds.slice(i, i + 50);
        for (const userId of batch) {
          try {
            const { data: user } = await supabase.auth.admin.getUserById(userId);
            if (user?.user) {
              validUserIds.add(userId);
            }
          } catch {
            // 사용자가 없음
          }
        }
        
        if ((i + 50) % 200 === 0) {
          console.log(`   진행 중... ${Math.min(i + 50, userIds.length)}/${userIds.length}`);
        }
      }

      // Orphaned records 찾기
      for (const result of allTestResults) {
        if (!validUserIds.has(result.user_id)) {
          orphanedIds.push(result.id);
        }
      }

      if (orphanedIds.length > 0) {
        console.log(`   발견된 orphaned records: ${orphanedIds.length}개`);
        
        if (!options.dryRun) {
          // 배치로 삭제
          for (let i = 0; i < orphanedIds.length; i += 100) {
            const batch = orphanedIds.slice(i, i + 100);
            const { error } = await supabase
              .from('test_results')
              .delete()
              .in('id', batch);

            if (error) {
              console.error(`   ❌ 삭제 실패 (배치 ${i / 100 + 1}):`, error.message);
              errors.push({ type: 'orphaned_test_results', error: error.message });
            } else {
              totalDeleted += batch.length;
              console.log(`   ✅ 삭제 완료: ${batch.length}개 (총 ${totalDeleted}개)`);
            }
          }
        } else {
          console.log(`   👀 Dry-run: ${orphanedIds.length}개 레코드가 삭제될 예정입니다.`);
        }
      } else {
        console.log('   ✅ Orphaned records 없음');
      }
    }

    // teacher_student_assignments에서 orphaned records 제거
    const { data: assignments } = await supabase
      .from('teacher_student_assignments')
      .select('id, teacher_id, student_id');

    if (assignments) {
      const allUserIds = new Set<string>();
      assignments.forEach(a => {
        if (a.teacher_id) allUserIds.add(a.teacher_id);
        if (a.student_id) allUserIds.add(a.student_id);
      });

      const validUserIds = new Set<string>();
      for (const userId of Array.from(allUserIds)) {
        try {
          const { data: user } = await supabase.auth.admin.getUserById(userId);
          if (user?.user) {
            validUserIds.add(userId);
          }
        } catch {
          // 사용자가 없음
        }
      }

      const orphanedAssignments = assignments.filter(
        a => 
          (a.teacher_id && !validUserIds.has(a.teacher_id)) ||
          (a.student_id && !validUserIds.has(a.student_id))
      );

      if (orphanedAssignments.length > 0) {
        console.log(`   발견된 orphaned assignments: ${orphanedAssignments.length}개`);
        
        if (!options.dryRun) {
          const { error } = await supabase
            .from('teacher_student_assignments')
            .delete()
            .in('id', orphanedAssignments.map(a => a.id));

          if (error) {
            console.error(`   ❌ 삭제 실패:`, error.message);
            errors.push({ type: 'orphaned_assignments', error: error.message });
          } else {
            totalDeleted += orphanedAssignments.length;
            console.log(`   ✅ 삭제 완료: ${orphanedAssignments.length}개`);
          }
        } else {
          console.log(`   👀 Dry-run: ${orphanedAssignments.length}개 레코드가 삭제될 예정입니다.`);
        }
      } else {
        console.log('   ✅ Orphaned assignments 없음');
      }
    }

    console.log();
  }

  // 2. Storage와 DB 불일치 파일 정리
  if (options.removeOrphanedFiles) {
    console.log('📦 2. Orphaned Storage 파일 정리 중...\n');

    // DB에서 audio_url 추출
    const { data: testResultsWithAudio } = await supabase
      .from('test_results')
      .select('audio_url')
      .not('audio_url', 'is', null);

    const audioUrlsInDb = new Set(
      (testResultsWithAudio || [])
        .map(r => r.audio_url)
        .filter((url): url is string => !!url)
    );

    console.log(`   DB에 참조된 파일: ${audioUrlsInDb.size}개`);

    // Storage에서 모든 파일 찾기
    const allStorageFiles: string[] = [];
    
    async function listAllFiles(path: string = '') {
      const { data: files } = await supabase.storage
        .from('student-recordings')
        .list(path, { limit: 1000 });
      
      if (!files) return;
      
      for (const file of files) {
        const fullPath = path ? `${path}/${file.name}` : file.name;
        if (file.id) {
          // 파일인 경우
          allStorageFiles.push(fullPath);
        } else {
          // 폴더인 경우 재귀
          await listAllFiles(fullPath);
        }
      }
    }

    await listAllFiles();
    console.log(`   Storage 파일 수: ${allStorageFiles.length}개`);

    // DB에 없는 Storage 파일 (orphaned files)
    const orphanedFiles = allStorageFiles.filter(file => !audioUrlsInDb.has(file));
    
    if (orphanedFiles.length > 0) {
      console.log(`   발견된 orphaned 파일: ${orphanedFiles.length}개`);
      
      if (!options.dryRun) {
        // 배치로 삭제
        for (let i = 0; i < orphanedFiles.length; i += 100) {
          const batch = orphanedFiles.slice(i, i + 100);
          const { error } = await supabase.storage
            .from('student-recordings')
            .remove(batch);

          if (error) {
            console.error(`   ❌ 삭제 실패 (배치 ${i / 100 + 1}):`, error.message);
            errors.push({ type: 'orphaned_files', error: error.message });
          } else {
            console.log(`   ✅ 삭제 완료: ${batch.length}개 (${i + batch.length}/${orphanedFiles.length})`);
          }
        }
      } else {
        console.log(`   👀 Dry-run: ${orphanedFiles.length}개 파일이 삭제될 예정입니다.`);
        console.log(`   샘플 (처음 5개):`);
        orphanedFiles.slice(0, 5).forEach(file => {
          console.log(`     - ${file}`);
        });
      }
    } else {
      console.log('   ✅ Orphaned 파일 없음');
    }

    console.log();
  }

  // 3. 오래된 데이터 정리
  if (options.removeOldData) {
    console.log(`📅 3. 오래된 데이터 정리 중 (${options.oldDataThresholdDays}일 이상)...\n`);

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - options.oldDataThresholdDays);
    const thresholdISO = thresholdDate.toISOString();

    // test_results에서 오래된 데이터 찾기
    const { data: oldTestResults } = await supabase
      .from('test_results')
      .select('id, created_at')
      .lt('created_at', thresholdISO);

    if (oldTestResults && oldTestResults.length > 0) {
      console.log(`   발견된 오래된 test_results: ${oldTestResults.length}개`);
      
      if (!options.dryRun) {
        const { error } = await supabase
          .from('test_results')
          .delete()
          .lt('created_at', thresholdISO);

        if (error) {
          console.error(`   ❌ 삭제 실패:`, error.message);
          errors.push({ type: 'old_test_results', error: error.message });
        } else {
          totalDeleted += oldTestResults.length;
          console.log(`   ✅ 삭제 완료: ${oldTestResults.length}개`);
        }
      } else {
        console.log(`   👀 Dry-run: ${oldTestResults.length}개 레코드가 삭제될 예정입니다.`);
      }
    } else {
      console.log('   ✅ 오래된 데이터 없음');
    }

    console.log();
  }

  // 결과 요약
  console.log('='.repeat(60));
  console.log('📊 정리 작업 완료');
  console.log('='.repeat(60));
  
  if (options.dryRun) {
    console.log(`👀 Dry-run 모드: 실제로는 삭제되지 않았습니다.`);
    console.log(`   --execute 플래그를 사용하여 실제 삭제를 실행하세요.`);
  } else {
    console.log(`✅ 총 ${totalDeleted}개 항목이 삭제되었습니다.`);
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  오류 발생: ${errors.length}개`);
    errors.slice(0, 10).forEach(err => {
      console.log(`   - ${err.type}: ${err.error}`);
    });
  }

  console.log();
}

async function main() {
  // 환경변수 체크
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  // 명령줄 인자 파싱
  const args = process.argv.slice(2);
  const execute = args.includes('--execute') || args.includes('-e');
  const removeOrphaned = args.includes('--remove-orphaned') || execute;
  const removeFiles = args.includes('--remove-files') || execute;
  const removeOld = args.includes('--remove-old');
  
  let oldDataThresholdDays = 365;
  const oldDataIndex = args.indexOf('--remove-old');
  if (oldDataIndex >= 0 && args[oldDataIndex + 1]) {
    const days = parseInt(args[oldDataIndex + 1]);
    if (!isNaN(days) && days > 0) {
      oldDataThresholdDays = days;
    }
  }

  const options: CleanupOptions = {
    removeOrphanedRecords: removeOrphaned,
    removeOrphanedFiles: removeFiles,
    removeOldData: removeOld,
    oldDataThresholdDays,
    dryRun: !execute,
  };

  // 분석 결과 파일이 있으면 로드
  try {
    const analysisData = await readFile('data-quality-analysis.json', 'utf-8');
    const analysis = JSON.parse(analysisData);
    console.log('📋 data-quality-analysis.json 파일을 찾았습니다. 분석 결과를 기반으로 정리합니다.\n');
  } catch {
    console.log('ℹ️  data-quality-analysis.json 파일이 없습니다. 전체 정리를 진행합니다.\n');
  }

  await cleanupOldProject(options);
}

main().catch((error) => {
  console.error('💥 정리 작업 중 오류 발생:', error);
  process.exit(1);
});

