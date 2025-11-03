import { createServiceClient } from '../src/lib/supabase/server';
import dotenv from 'dotenv';

// .env.local 파일에서 환경 변수 로드
dotenv.config({ path: '.env.local' });

/**
 * 한글을 영문으로 변환하는 간단한 함수
 * 한글 이름을 로마자 표기로 변환 (예: "권해경" -> "KwonHaekyung")
 */
function koreanToRoman(text: string): string {
  // 한글 초성 중성 종성 매핑 (간단한 버전)
  const initials = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  const vowels = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'weo', 'we', 'wi', 'yu', 'eu', 'yi', 'i'];
  const finals = ['', 'k', 'kk', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    if (char >= 0xAC00 && char <= 0xD7A3) {
      // 한글 유니코드 범위
      const base = char - 0xAC00;
      const initialIndex = Math.floor(base / (21 * 28));
      const vowelIndex = Math.floor((base % (21 * 28)) / 28);
      const finalIndex = base % 28;
      
      const initial = initials[initialIndex] || '';
      const vowel = vowels[vowelIndex] || '';
      const final = finals[finalIndex] || '';
      
      // 첫 글자는 대문자로
      if (result === '' || result.endsWith('_')) {
        result += (initial + vowel + final).charAt(0).toUpperCase() + (initial + vowel + final).slice(1);
      } else {
        result += initial + vowel + final;
      }
    } else if ((char >= 0x0041 && char <= 0x005A) || (char >= 0x0061 && char <= 0x007A) || (char >= 0x0030 && char <= 0x0039)) {
      // 영문/숫자는 그대로
      result += text[i];
    } else {
      // 기타 문자는 언더스코어로
      result += '_';
    }
  }
  return result.replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Supabase Storage 경로를 위한 안전한 경로 세그먼트 생성
 * 학생 이름을 포함하여 직관적으로 식별 가능하도록 합니다.
 */
function createSafePathSegment(userId: string, studentName: string): string {
  const userIdShort = userId.slice(0, 8);
  
  // 영문/숫자만 있는 경우 그대로 사용 (정리만)
  if (!/[가-힣]/.test(studentName)) {
    const safeName = studentName
      .replace(/[^a-zA-Z0-9-_.]/g, '_')
      .toLowerCase()
      .slice(0, 30);
    if (safeName) {
      return `${safeName}_${userIdShort}`;
    }
  }
  
  // 한글이 포함된 경우 로마자로 변환
  const romanName = koreanToRoman(studentName);
  if (romanName && romanName.length > 0) {
    return `${romanName}_${userIdShort}`;
  }
  
  // 변환 실패 시 user_id만 사용
  return `user_${userIdShort}`;
}

/**
 * 기존 Storage 파일들을 새로운 구조로 마이그레이션하는 스크립트
 * 
 * 기존: {testType}/{userId}/{timestamp}.webm
 * 새로운: {studentName}/{sessionDate}/{testType}/{timestamp}.webm
 * 
 * 사용법:
 *   npm run migrate-storage           # Dry-run (실제 이동 없이 미리보기)
 *   npm run migrate-storage -- --execute   # 실제 마이그레이션 실행
 * 
 * 환경 변수 (.env.local 파일 필요):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY (필수)
 */

interface MigrationFile {
  oldPath: string;
  newPath: string;
  testType: string;
  userId: string;
  timestamp: string;
  studentName: string;
  sessionDate: string;
}

async function migrateStorageFiles(execute: boolean = false) {
  console.log('🔄 Storage 마이그레이션 시작...\n');
  console.log(`모드: ${execute ? '✅ 실행 모드' : '👀 Dry-run 모드 (실제 이동 없음)'}\n`);
  
  // 환경 변수 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
    console.error('   .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL을 추가하세요.');
    process.exit(1);
  }
  
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 SUPABASE_SERVICE_ROLE_KEY를 추가하세요.');
    process.exit(1);
  }
  
  console.log(`✅ 환경 변수 확인 완료 (URL: ${supabaseUrl.substring(0, 30)}...)\n`);
  
  const supabase = createServiceClient();
  
  const migrationFiles: MigrationFile[] = [];
  const errors: Array<{ path: string; error: string }> = [];
  
  // 1. 기존 형식의 파일들을 모두 찾기
  console.log('📂 기존 폴더 구조 스캔 중...');
  const TEST_TYPES = ['lnf', 'psf', 'nwf', 'wrf', 'orf'] as const;
  
  for (const testType of TEST_TYPES) {
    console.log(`\n📁 ${testType.toUpperCase()} 폴더 처리 중...`);
    
    // 각 테스트 유형 폴더 내에서 사용자 폴더 나열
    const { data: userFolders, error: userListErr } = await supabase.storage
      .from('student-recordings')
      .list(testType, { limit: 10000 });
    
    if (userListErr) {
      console.warn(`  ⚠️  ${testType} 폴더 목록 조회 실패:`, userListErr.message);
      continue;
    }

    if (!userFolders || userFolders.length === 0) {
      console.log(`  ℹ️  ${testType} 폴더에 하위 폴더 없음`);
      continue;
    }

    console.log(`  📊 발견된 사용자 폴더: ${userFolders.length}개`);

    for (const entry of userFolders) {
      if (!entry.name || entry.name === 'admin') continue;
      const userId = entry.name;

      // 해당 사용자 폴더 내 파일 나열
      const folderPath = `${testType}/${userId}`;
      const { data: filesInUser, error: filesErr } = await supabase.storage
        .from('student-recordings')
        .list(folderPath, { limit: 10000 });
      
      if (filesErr) {
        console.warn(`  ⚠️  폴더 목록 실패: ${folderPath}`, filesErr.message);
        continue;
      }

      if (!filesInUser || filesInUser.length === 0) {
        continue;
      }

      // 사용자 정보 조회 (이름 가져오기)
      let studentName = '';
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', userId)
          .single();
        
        if (profile?.full_name) {
          // 한글은 그대로 유지, 특수문자만 치환
          studentName = profile.full_name.replace(/[^가-힣a-zA-Z0-9-_.]/g, '_');
        }
        
        // 이름이 없으면 Auth에서 이메일 사용
        if (!studentName) {
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          if (userData?.user?.email) {
            const emailPrefix = userData.user.email.split('@')[0];
            studentName = emailPrefix.replace(/[^a-zA-Z0-9-_.]/g, '_');
          }
        }
        
        // 여전히 없으면 기본값 사용
        if (!studentName) {
          studentName = `student_${userId.slice(0, 8)}`;
        }
      } catch (error) {
        console.warn(`  ⚠️  사용자 ${userId} 정보 조회 실패, 기본값 사용`);
        studentName = `student_${userId.slice(0, 8)}`;
      }

      // 각 파일 처리
      for (const file of filesInUser) {
        if (!file.name.endsWith('.webm')) continue;
        
        const timestamp = file.name.replace('.webm', '');
        const oldPath = `${folderPath}/${file.name}`;
        
        // 타임스탬프에서 날짜 추출
        let sessionDate = '';
        try {
          const timestampNum = parseInt(timestamp);
          if (!isNaN(timestampNum) && timestampNum > 0) {
            const date = new Date(timestampNum);
            sessionDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
          } else {
            // 타임스탬프가 유효하지 않으면 오늘 날짜 사용
            sessionDate = new Date().toISOString().split('T')[0];
          }
        } catch {
          sessionDate = new Date().toISOString().split('T')[0];
        }
        
        // 새로운 경로 생성 (문서 기준: studentName/sessionDate/testType/timestamp.webm)
        // Supabase Storage는 한글을 지원하지 않으므로 안전한 ASCII 문자만 사용
        const safeStudentName = createSafePathSegment(userId, studentName);
        const newPath = `${safeStudentName}/${sessionDate}/${testType}/${timestamp}.webm`;
        
        migrationFiles.push({
          oldPath,
          newPath,
          testType,
          userId,
          timestamp,
          studentName,
          sessionDate
        });
      }
    }
  }
  
  console.log(`\n📊 마이그레이션 대상 파일: ${migrationFiles.length}개\n`);
  
  if (migrationFiles.length === 0) {
    console.log('✅ 마이그레이션할 파일이 없습니다.');
    return;
  }

  // 샘플 출력 (처음 5개만)
  console.log('📋 마이그레이션 계획 샘플 (처음 5개):');
  migrationFiles.slice(0, 5).forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${file.oldPath}`);
    console.log(`     → ${file.newPath} (${file.studentName}, ${file.sessionDate})`);
  });
  if (migrationFiles.length > 5) {
    console.log(`  ... 및 ${migrationFiles.length - 5}개 더\n`);
  }

  if (!execute) {
    console.log('\n👀 Dry-run 모드: 실제 마이그레이션을 실행하려면 --execute 플래그를 사용하세요.');
    console.log('   예: npm run migrate-storage -- --execute\n');
    return;
  }

  // 2. 실제 마이그레이션 실행
  console.log('\n🚀 마이그레이션 실행 중...\n');
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const audioUrlUpdates: Array<{ oldUrl: string; newUrl: string; testType: string }> = [];

  for (let i = 0; i < migrationFiles.length; i++) {
    const file = migrationFiles[i];
    const progress = `[${i + 1}/${migrationFiles.length}]`;
    
    try {
      // 새 경로에 이미 파일이 있는지 확인
      const { data: existingFile } = await supabase.storage
        .from('student-recordings')
        .list(file.newPath.split('/').slice(0, -1).join('/'));
      
      if (existingFile?.some(f => f.name === file.newPath.split('/').pop())) {
        console.log(`${progress} ⏭️  건너뜀 (이미 존재): ${file.newPath}`);
        skipCount++;
        continue;
      }

      // 파일 데이터 다운로드
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('student-recordings')
        .download(file.oldPath);
      
      if (downloadError || !fileData) {
        const errorMsg = downloadError?.message || '파일을 찾을 수 없음';
        console.error(`${progress} ❌ 다운로드 실패: ${file.oldPath} - ${errorMsg}`);
        errors.push({ path: file.oldPath, error: `다운로드 실패: ${errorMsg}` });
        errorCount++;
        continue;
      }

      // 새 경로에 업로드
      const arrayBuffer = await fileData.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('student-recordings')
        .upload(file.newPath, arrayBuffer, { 
          contentType: 'audio/webm',
          upsert: false 
        });
      
      if (uploadError) {
        console.error(`${progress} ❌ 업로드 실패: ${file.newPath} - ${uploadError.message}`);
        errors.push({ path: file.newPath, error: `업로드 실패: ${uploadError.message}` });
        errorCount++;
        continue;
      }

      // 기존 파일 삭제
      const { error: deleteError } = await supabase.storage
        .from('student-recordings')
        .remove([file.oldPath]);
      
      if (deleteError) {
        console.warn(`${progress} ⚠️  기존 파일 삭제 실패: ${file.oldPath} - ${deleteError.message}`);
        // 삭제 실패해도 업로드는 성공했으므로 계속 진행
      }

      console.log(`${progress} ✅ 완료: ${file.oldPath} → ${file.newPath}`);
      successCount++;
      
      // audio_url 업데이트를 위해 정보 저장
      audioUrlUpdates.push({
        oldUrl: file.oldPath,
        newUrl: file.newPath,
        testType: file.testType
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`${progress} ❌ 에러: ${file.oldPath} - ${errorMsg}`);
      errors.push({ path: file.oldPath, error: errorMsg });
      errorCount++;
    }

    // 진행 상황 표시 (10개마다)
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 진행 상황: ${i + 1}/${migrationFiles.length} (성공: ${successCount}, 실패: ${errorCount}, 건너뜀: ${skipCount})\n`);
    }
  }

  console.log(`\n📊 마이그레이션 완료:`);
  console.log(`   ✅ 성공: ${successCount}개`);
  console.log(`   ⏭️  건너뜀: ${skipCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개`);

  // 3. test_results 테이블의 audio_url 업데이트
  if (audioUrlUpdates.length > 0) {
    console.log(`\n🔄 test_results 테이블의 audio_url 업데이트 중...`);
    
    let dbUpdateSuccess = 0;
    let dbUpdateFail = 0;

    for (const update of audioUrlUpdates) {
      try {
        // 기존 경로를 사용하는 모든 test_results 업데이트
        const { error: updateError } = await supabase
          .from('test_results')
          .update({ audio_url: update.newUrl })
          .eq('audio_url', update.oldUrl);

        if (updateError) {
          console.warn(`  ⚠️  DB 업데이트 실패: ${update.oldUrl} - ${updateError.message}`);
          dbUpdateFail++;
        } else {
          dbUpdateSuccess++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        console.warn(`  ⚠️  DB 업데이트 에러: ${update.oldUrl} - ${errorMsg}`);
        dbUpdateFail++;
      }
    }

    console.log(`\n📊 DB 업데이트 완료:`);
    console.log(`   ✅ 성공: ${dbUpdateSuccess}개`);
    console.log(`   ❌ 실패: ${dbUpdateFail}개`);
  }

  // 에러 요약 출력
  if (errors.length > 0) {
    console.log(`\n⚠️  에러 요약 (처음 10개):`);
    errors.slice(0, 10).forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.path}: ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... 및 ${errors.length - 10}개 더`);
    }
  }

  console.log('\n✨ 마이그레이션 작업 완료!');
}

// 명령줄 인자 파싱
const args = process.argv.slice(2);
const execute = args.includes('--execute') || args.includes('-e');

// 스크립트 실행
migrateStorageFiles(execute)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 마이그레이션 스크립트 에러:', error);
    process.exit(1);
  });
