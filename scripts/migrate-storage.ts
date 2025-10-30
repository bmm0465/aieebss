import { createServiceClient } from '../src/lib/supabase/server';

/**
 * 기존 Storage 파일들을 새로운 구조로 마이그레이션하는 스크립트
 * 
 * 기존: lnf/{userId}/{timestamp}.webm
 * 새로운: {schoolName}/{studentName}/{date}/{testType}/{timestamp}.webm
 */

async function migrateStorageFiles() {
  console.log('🔄 Storage 마이그레이션 시작...\n');
  
  const supabase = createServiceClient();
  
  // 유지/마이그레이션 대상 교사 ID 화이트리스트
  const teacherIdsToKeep = [
    '14ea1f09-1c7f-43eb-95cf-1b491dd876a4',
    '3c9db811-8b08-48bc-8f0e-d515fa045d51',
    'fe2e88ce-bc53-4c37-825b-4bff261ef1a9'
  ];
  const allowedUserIds = teacherIdsToKeep;
  
  // 삭제할 이메일 패턴
  const studentEmailPattern = /^student\d+@aieebss\.com$/;
  
  console.log('🗑️  학생 계정 파일 삭제 시작...\n');
  
  // 1. 폴더 트리 순회하며 기존 형식 파일 수집 (테스트유형/userId/*.webm)
  console.log('📂 기존 폴더 트리 순회 중...');
  const oldFormatFiles: Array<{ path: string; testType: string; userId: string; timestamp: string }> = [];
  const filesToDelete: string[] = [];

  // 최상위에서 테스트 유형 폴더들을 나열
  const TEST_TYPES = ['lnf', 'psf', 'nwf', 'wrf', 'orf'] as const;
  for (const testType of TEST_TYPES) {
    // 각 테스트 유형 폴더 내에서 사용자 폴더 나열 (userId 폴더)
    const { data: userFolders, error: userListErr } = await supabase.storage
      .from('student-recordings')
      .list(testType, { limit: 10000 });
    if (userListErr) {
      console.warn(`경고: ${testType} 폴더 목록 조회 실패:`, userListErr.message);
      continue;
    }

    for (const entry of userFolders || []) {
      if (!entry.name) continue;
      const userId = entry.name; // userId 폴더명

      // 화이트리스트 아닌 사용자 skip
      if (!allowedUserIds.includes(userId)) continue;

      // 해당 사용자 폴더 내 파일 나열
      const folderPath = `${testType}/${userId}`;
      const { data: filesInUser, error: filesErr } = await supabase.storage
        .from('student-recordings')
        .list(folderPath, { limit: 10000 });
      if (filesErr) {
        console.warn(`경고: 폴더 목록 실패: ${folderPath}`, filesErr.message);
        continue;
      }

      // 필요 시 삭제/보존 판단을 위해 이메일 조회 (학생 계정 정리 로직 유지)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('id', userId)
        .single();
      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = profile?.email || authData?.user?.email;
      const isTeacher = teacherIdsToKeep.includes(userId);
      const isStudentAccount = userEmail && studentEmailPattern.test(userEmail);

      for (const f of filesInUser || []) {
        if (!f.name.endsWith('.webm')) continue;
        const timestamp = f.name.replace('.webm', '');
        const fullPath = `${folderPath}/${f.name}`;
        if (isStudentAccount && !isTeacher) {
          filesToDelete.push(fullPath);
        } else {
          oldFormatFiles.push({ path: fullPath, testType, userId, timestamp });
        }
      }
    }
  }
  
  console.log(`\n📊 통계:`);
  console.log(`   🗑️  삭제 대상: ${filesToDelete.length}개 파일`);
  console.log(`   📋 마이그레이션 대상(화이트리스트): ${oldFormatFiles.length}개 파일\n`);
  
  // 3. 학생 계정 파일 삭제
  if (filesToDelete.length > 0) {
    console.log('🗑️  학생 계정 파일 삭제 중...');
    const { error: deleteError } = await supabase.storage
      .from('student-recordings')
      .remove(filesToDelete);
    
    if (deleteError) {
      console.error('❌ 파일 삭제 실패:', deleteError);
    } else {
      console.log(`✅ ${filesToDelete.length}개 파일 삭제 완료\n`);
    }
  }
  
  // 4. 각 파일을 새로운 경로로 이동
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of oldFormatFiles) {
    try {
      // user_id로 사용자 정보 조회
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, class_name')
        .eq('id', file.userId)
        .single();
      
      let schoolName = 'default_school';
      let studentName = '';
      
      if (profile) {
        // 학교 이름
        if (profile.class_name) {
          schoolName = profile.class_name.replace(/[^가-힣a-zA-Z0-9-_. ]/g, '_');
        }
        
        // 학생 이름
        if (profile.full_name) {
          studentName = profile.full_name.replace(/[^가-힣a-zA-Z0-9-_.]/g, '_');
        }
      }
      
      // 학생 이름이 없으면 user_id 사용
      if (!studentName) {
        const { data: userData } = await supabase.auth.admin.getUserById(file.userId);
        if (userData?.user?.email) {
          studentName = userData.user.email.split('@')[0];
        } else {
          studentName = `student_${file.userId.slice(0, 8)}`;
        }
      }
      
      // 타임스탬프에서 날짜 추출
      const timestamp = parseInt(file.timestamp);
      const date = new Date(timestamp);
      const dateStr = date.toISOString().split('T')[0];
      
      // 새로운 경로 생성
      const newPath = `${schoolName}/${studentName}/${dateStr}/${file.testType}/${file.timestamp}.webm`;
      
      // 파일 데이터 가져오기
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('student-recordings')
        .download(file.path);
      
      if (downloadError || !fileData) {
        console.error(`❌ 파일 다운로드 실패: ${file.path}`, downloadError);
        errorCount++;
        continue;
      }
      
      // 새로운 경로에 업로드
      const arrayBuffer = await fileData.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('student-recordings')
        .upload(newPath, arrayBuffer, { contentType: 'audio/webm' });
      
      if (uploadError) {
        console.error(`❌ 파일 업로드 실패: ${newPath}`, uploadError);
        errorCount++;
        continue;
      }
      
      // 기존 파일 삭제
      const { error: deleteError } = await supabase.storage
        .from('student-recordings')
        .remove([file.path]);
      
      if (deleteError) {
        console.error(`⚠️  파일 삭제 실패: ${file.path}`, deleteError);
      } else {
        console.log(`✅ 마이그레이션 완료: ${file.path} → ${newPath}`);
        successCount++;
      }
      
    } catch (error) {
      console.error(`❌ 마이그레이션 에러: ${file.path}`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 마이그레이션 완료:`);
  console.log(`   ✅ 성공: ${successCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개`);
}

// 스크립트 실행
migrateStorageFiles()
  .then(() => {
    console.log('\n✨ 마이그레이션 스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 마이그레이션 스크립트 에러:', error);
    process.exit(1);
  });

