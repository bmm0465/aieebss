import 'dotenv/config';
import { createServiceClient } from '../src/lib/supabase/server';

interface AnalysisResult {
  unusedColumns: Array<{ table: string; column: string; reason: string }>;
  nullColumns: Array<{ table: string; column: string; nullPercentage: number; totalRows: number }>;
  orphanedRecords: Array<{ table: string; count: number; description: string }>;
  duplicateData: Array<{ table: string; column: string; duplicateCount: number }>;
  storageDbMismatch: {
    filesInStorage: number;
    filesInDb: number;
    orphanedFiles: number;
    missingFiles: number;
  };
  schemaIssues: Array<{ issue: string; description: string }>;
}

/**
 * 데이터 품질 분석 스크립트
 * 
 * 기존 프로젝트(AIDTPEL)의 데이터를 분석하여:
 * - 사용되지 않는 컬럼 식별
 * - NULL 값이 많은 컬럼 확인
 * - Orphaned records 확인
 * - 중복 데이터 검색
 * - Storage와 DB 불일치 확인
 * 
 * 사용법:
 *   npx tsx scripts/analyze-data-quality.ts
 * 
 * 환경 변수 (.env.local 파일 필요):
 *   NEXT_PUBLIC_SUPABASE_URL (기존 프로젝트)
 *   SUPABASE_SERVICE_ROLE_KEY (기존 프로젝트)
 */
async function analyzeDataQuality(): Promise<AnalysisResult> {
  console.log('🔍 데이터 품질 분석 시작...\n');

  const supabase = createServiceClient();
  const result: AnalysisResult = {
    unusedColumns: [],
    nullColumns: [],
    orphanedRecords: [],
    duplicateData: [],
    storageDbMismatch: {
      filesInStorage: 0,
      filesInDb: 0,
      orphanedFiles: 0,
      missingFiles: 0,
    },
    schemaIssues: [],
  };

  // 1. 사용되지 않는 컬럼 확인
  console.log('📊 1. 사용되지 않는 컬럼 분석 중...');
  
  // session_id 컬럼이 문서에만 있고 실제로는 없는지 확인
  let testResultsColumns = null;
  try {
    const result = await supabase.rpc('get_table_columns', {
      table_name: 'test_results'
    });
    testResultsColumns = result.data;
  } catch {
    testResultsColumns = null;
  }

  // test_results 테이블에서 실제로 사용되지 않는 컬럼 확인
  const { data: testResultsSample } = await supabase
    .from('test_results')
    .select('*')
    .limit(1)
    .single();

  if (testResultsSample) {
    // session_id가 실제로 존재하는지 확인 (문서와 불일치 가능성)
    if (!('session_id' in testResultsSample)) {
      result.unusedColumns.push({
        table: 'test_results',
        column: 'session_id',
        reason: '문서에만 언급되어 있으나 실제 테이블에는 존재하지 않음',
      });
    }
  }

  // 2. NULL 값이 많은 컬럼 확인
  console.log('📊 2. NULL 값 분석 중...');
  
  const tables = ['test_results', 'user_profiles', 'teacher_student_assignments'];
  
  for (const table of tables) {
    const { data: allRows, error } = await supabase
      .from(table)
      .select('*')
      .limit(10000);

    if (error || !allRows || allRows.length === 0) continue;

    const totalRows = allRows.length;
    const sampleRow = allRows[0];
    
    for (const [column, value] of Object.entries(sampleRow)) {
      if (column === 'id' || column === 'created_at') continue; // 기본 컬럼 제외
      
      const nullCount = allRows.filter(row => row[column] === null || row[column] === undefined).length;
      const nullPercentage = (nullCount / totalRows) * 100;
      
      if (nullPercentage > 50) {
        result.nullColumns.push({
          table,
          column,
          nullPercentage: Math.round(nullPercentage * 100) / 100,
          totalRows,
        });
      }
    }
  }

  // 3. Orphaned records 확인
  console.log('📊 3. Orphaned records 분석 중...');
  
  // test_results에서 user_id가 auth.users에 없는 경우
  const { data: orphanedTestResults } = await supabase
    .from('test_results')
    .select('id, user_id')
    .not('user_id', 'is', null);

  if (orphanedTestResults) {
    const userIds = [...new Set(orphanedTestResults.map(r => r.user_id))];
    const validUserIds = new Set<string>();
    
    for (const userId of userIds.slice(0, 100)) { // 샘플링
      try {
        const { data: user } = await supabase.auth.admin.getUserById(userId);
        if (user?.user) {
          validUserIds.add(userId);
        }
      } catch {
        // 사용자를 찾을 수 없음
      }
    }
    
    const orphanedCount = orphanedTestResults.filter(r => !validUserIds.has(r.user_id)).length;
    if (orphanedCount > 0) {
      result.orphanedRecords.push({
        table: 'test_results',
        count: orphanedCount,
        description: 'user_id가 auth.users에 존재하지 않는 레코드',
      });
    }
  }

  // teacher_student_assignments에서 teacher_id 또는 student_id가 없는 경우
  const { data: assignments } = await supabase
    .from('teacher_student_assignments')
    .select('id, teacher_id, student_id');

  if (assignments) {
    const allUserIds = new Set<string>();
    assignments.forEach(a => {
      if (a.teacher_id) allUserIds.add(a.teacher_id);
      if (a.student_id) allUserIds.add(a.student_id);
    });

    let orphanedAssignments = 0;
    for (const userId of Array.from(allUserIds).slice(0, 50)) {
      try {
        const { data: user } = await supabase.auth.admin.getUserById(userId);
        if (!user?.user) {
          orphanedAssignments++;
        }
      } catch {
        orphanedAssignments++;
      }
    }
    
    if (orphanedAssignments > 0) {
      result.orphanedRecords.push({
        table: 'teacher_student_assignments',
        count: orphanedAssignments,
        description: 'teacher_id 또는 student_id가 auth.users에 존재하지 않는 레코드',
      });
    }
  }

  // 4. 중복 데이터 확인
  console.log('📊 4. 중복 데이터 분석 중...');
  
  // test_results에서 동일한 user_id, test_type, question, created_at이 같은 경우
  let duplicateTestResults = null;
  try {
    const result = await supabase.rpc('check_duplicates', {
      table_name: 'test_results',
      columns: ['user_id', 'test_type', 'question', 'created_at']
    });
    duplicateTestResults = result.data;
  } catch {
    // RPC가 없으면 직접 확인
    const { data: allResults } = await supabase
      .from('test_results')
      .select('user_id, test_type, question, created_at');
    
    if (allResults) {
      const seen = new Map<string, number>();
      allResults.forEach(r => {
        const key = `${r.user_id}-${r.test_type}-${r.question}-${r.created_at}`;
        seen.set(key, (seen.get(key) || 0) + 1);
      });
      
      const duplicates = Array.from(seen.entries())
        .filter(([_, count]) => count > 1)
        .length;
      
      duplicateTestResults = duplicates;
    }
  }

  if (duplicateTestResults && duplicateTestResults > 0) {
    result.duplicateData.push({
      table: 'test_results',
      column: 'user_id, test_type, question, created_at',
      duplicateCount: duplicateTestResults,
    });
  }

  // 5. Storage와 DB 불일치 확인
  console.log('📊 5. Storage-DB 불일치 분석 중...');
  
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

  result.storageDbMismatch.filesInDb = audioUrlsInDb.size;

  // Storage에서 파일 목록 가져오기
  const { data: storageFiles } = await supabase.storage
    .from('student-recordings')
    .list('', { limit: 10000, sortBy: { column: 'name', order: 'asc' } });

  if (storageFiles) {
    // 재귀적으로 모든 파일 찾기
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
    
    result.storageDbMismatch.filesInStorage = allStorageFiles.length;
    
    // DB에 없는 Storage 파일 (orphaned files)
    const orphanedFiles = allStorageFiles.filter(file => !audioUrlsInDb.has(file));
    result.storageDbMismatch.orphanedFiles = orphanedFiles.length;
    
    // Storage에 없는 DB 참조 (missing files)
    const missingFiles = Array.from(audioUrlsInDb).filter(url => !allStorageFiles.includes(url));
    result.storageDbMismatch.missingFiles = missingFiles.length;
  }

  // 6. 스키마 이슈 확인
  console.log('📊 6. 스키마 이슈 확인 중...');
  
  // 문서와 실제 스키마 불일치 확인
  result.schemaIssues.push({
    issue: 'session_id 컬럼',
    description: '문서에 session_id가 언급되어 있으나 실제 테이블에는 존재하지 않을 수 있음',
  });

  return result;
}

async function main() {
  // 환경변수 체크
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
    console.error('   .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL을 추가하세요.');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 SUPABASE_SERVICE_ROLE_KEY를 추가하세요.');
    process.exit(1);
  }

  try {
    const analysis = await analyzeDataQuality();

    // 결과 출력
    console.log('\n' + '='.repeat(60));
    console.log('📋 데이터 품질 분석 결과');
    console.log('='.repeat(60) + '\n');

    // 사용되지 않는 컬럼
    if (analysis.unusedColumns.length > 0) {
      console.log('⚠️  사용되지 않는 컬럼:');
      analysis.unusedColumns.forEach(item => {
        console.log(`   - ${item.table}.${item.column}: ${item.reason}`);
      });
      console.log();
    } else {
      console.log('✅ 사용되지 않는 컬럼 없음\n');
    }

    // NULL 값이 많은 컬럼
    if (analysis.nullColumns.length > 0) {
      console.log('⚠️  NULL 값이 많은 컬럼 (>50%):');
      analysis.nullColumns.forEach(item => {
        console.log(`   - ${item.table}.${item.column}: ${item.nullPercentage}% (${item.totalRows}개 중)`);
      });
      console.log();
    } else {
      console.log('✅ NULL 값이 많은 컬럼 없음\n');
    }

    // Orphaned records
    if (analysis.orphanedRecords.length > 0) {
      console.log('⚠️  Orphaned Records:');
      analysis.orphanedRecords.forEach(item => {
        console.log(`   - ${item.table}: ${item.count}개 (${item.description})`);
      });
      console.log();
    } else {
      console.log('✅ Orphaned Records 없음\n');
    }

    // 중복 데이터
    if (analysis.duplicateData.length > 0) {
      console.log('⚠️  중복 데이터:');
      analysis.duplicateData.forEach(item => {
        console.log(`   - ${item.table}.${item.column}: ${item.duplicateCount}개 중복`);
      });
      console.log();
    } else {
      console.log('✅ 중복 데이터 없음\n');
    }

    // Storage-DB 불일치
    console.log('📦 Storage-DB 불일치:');
    console.log(`   - Storage 파일 수: ${analysis.storageDbMismatch.filesInStorage}`);
    console.log(`   - DB 참조 수: ${analysis.storageDbMismatch.filesInDb}`);
    console.log(`   - Orphaned 파일 (Storage에만 있음): ${analysis.storageDbMismatch.orphanedFiles}`);
    console.log(`   - Missing 파일 (DB에만 참조): ${analysis.storageDbMismatch.missingFiles}`);
    console.log();

    // 스키마 이슈
    if (analysis.schemaIssues.length > 0) {
      console.log('⚠️  스키마 이슈:');
      analysis.schemaIssues.forEach(item => {
        console.log(`   - ${item.issue}: ${item.description}`);
      });
      console.log();
    }

    // 요약
    console.log('='.repeat(60));
    console.log('📊 요약');
    console.log('='.repeat(60));
    const totalIssues = 
      analysis.unusedColumns.length +
      analysis.nullColumns.length +
      analysis.orphanedRecords.length +
      analysis.duplicateData.length +
      (analysis.storageDbMismatch.orphanedFiles > 0 ? 1 : 0) +
      (analysis.storageDbMismatch.missingFiles > 0 ? 1 : 0) +
      analysis.schemaIssues.length;
    
    if (totalIssues === 0) {
      console.log('✅ 데이터 품질이 양호합니다. 정리할 항목이 없습니다.');
    } else {
      console.log(`⚠️  총 ${totalIssues}개의 이슈가 발견되었습니다.`);
      console.log('   cleanup-old-project.ts 스크립트를 실행하여 정리할 수 있습니다.');
    }
    console.log();

    // JSON 파일로 저장
    const fs = await import('fs/promises');
    await fs.writeFile(
      'data-quality-analysis.json',
      JSON.stringify(analysis, null, 2)
    );
    console.log('💾 분석 결과가 data-quality-analysis.json에 저장되었습니다.');

  } catch (error) {
    console.error('💥 분석 중 오류 발생:', error);
    process.exit(1);
  }
}

main();

