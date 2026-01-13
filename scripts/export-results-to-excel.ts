/**
 * Supabase에서 직접 데이터를 추출하여 엑셀 파일로 저장하는 스크립트
 * 
 * 사용법:
 * 
 * 1. 각 교시별로 별도 파일 생성 (모든 학교 포함):
 *    npx tsx scripts/export-results-to-excel.ts by-period
 *    npx tsx scripts/export-results-to-excel.ts by-period 1  (1교시부터 시작)
 * 
 * 2. 1교시만 추출 (테스트용):
 *    npx tsx scripts/export-results-to-excel.ts period
 *    또는
 *    npx tsx scripts/export-results-to-excel.ts 1
 * 
 * 3. 기존 방식 (학교별, 교시별 필터링):
 *    npx tsx scripts/export-results-to-excel.ts [학교명] [교시]
 *    예: npx tsx scripts/export-results-to-excel.ts danjae p2_segmental_phoneme
 */

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 이메일에서 학교 정보 추출
function extractSchoolFromEmail(email: string | null | undefined): string {
  if (!email) return '미지정';
  
  const parts = email.split('@');
  if (parts.length < 2) return '미지정';
  
  const domain = parts[1];
  const domainParts = domain.split('.');
  const schoolName = domainParts[0];
  
  const emailPrefix = parts[0];
  
  const commonDomains = ['gmail', 'naver', 'daum', 'yahoo', 'hotmail', 'outlook'];
  if (commonDomains.includes(schoolName.toLowerCase())) {
    return emailPrefix || '미지정';
  }
  
  return schoolName || emailPrefix || '미지정';
}

// 모든 데이터를 페이지네이션으로 가져오는 헬퍼 함수
async function fetchAllResults(
  query: any,
  batchSize: number = 1000
): Promise<any[]> {
  const allResults: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(from, from + batchSize - 1);
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allResults.push(...data);
      from += batchSize;
      
      // 가져온 데이터가 batchSize보다 적으면 마지막 페이지
      if (data.length < batchSize) {
        hasMore = false;
      }
    }
  }

  return allResults;
}

// 초를 분:초 형식으로 변환
function formatTime(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) return '0분 0초';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}분 ${secs}초`;
}

// test_type 매핑
const TEST_TYPE_MAP: Record<string, string> = {
  'p1_alphabet': '1교시',
  'p2_segmental_phoneme': '2교시',
  'p3_suprasegmental_phoneme': '3교시',
  'p4_phonics': '4교시',
  'p5_vocabulary': '5교시',
  'p6_comprehension': '6교시',
};

async function exportResultsByPeriod(startFromPeriod?: number) {
  // 각 교시별로 별도의 엑셀 파일 생성
  const testTypes = [
    { code: 'p1_alphabet', name: '1교시' },
    { code: 'p2_segmental_phoneme', name: '2교시' },
    { code: 'p3_suprasegmental_phoneme', name: '3교시' },
    { code: 'p4_phonics', name: '4교시' },
    { code: 'p5_vocabulary', name: '5교시' },
    { code: 'p6_comprehension', name: '6교시' },
  ];

  const startIndex = startFromPeriod ? startFromPeriod - 1 : 0;
  const testTypesToProcess = testTypes.slice(startIndex);

  for (const testTypeInfo of testTypesToProcess) {
    console.log(`\n📚 ${testTypeInfo.name} 데이터 추출 시작...`);
    await exportResultsForPeriod(testTypeInfo.code, testTypeInfo.name);
  }
  
  console.log('\n✅ 모든 교시별 엑셀 파일 생성 완료!');
}

async function exportResultsForPeriod(testType: string, testTypeName: string) {
  try {
    console.log(`📊 ${testTypeName} 데이터 추출 시작...`);
    
    // 학생 프로필 가져오기 (모든 학교)
    const { data: studentProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, class_name, student_number, grade_level')
      .eq('role', 'student');
    
    if (profilesError) {
      throw new Error(`학생 프로필 조회 오류: ${profilesError.message}`);
    }
    
    if (!studentProfiles || studentProfiles.length === 0) {
      console.log(`⚠️  ${testTypeName}: 학생 데이터가 없습니다.`);
      return;
    }
    
    console.log(`✅ ${studentProfiles.length}명의 학생 프로필 조회 완료`);
    
    // 학생 이메일 가져오기
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`사용자 목록 조회 오류: ${usersError.message}`);
    }
    
    const userEmails = new Map<string, string>();
    users?.forEach(u => {
      if (u.email) {
        userEmails.set(u.id, u.email);
      }
    });
    
    const studentIds = studentProfiles.map(p => p.id);
    
    // 해당 교시의 테스트 결과만 가져오기 (모든 데이터를 페이지네이션으로 가져오기)
    console.log(`📊 ${testTypeName} 테스트 결과 조회 중...`);
    const resultsQuery = supabase
      .from('test_results')
      .select('user_id, test_type, is_correct, time_taken, created_at')
      .in('user_id', studentIds)
      .eq('test_type', testType);
    
    const testResults = await fetchAllResults(resultsQuery);
    
    console.log(`✅ ${testResults.length}개의 ${testTypeName} 테스트 결과 조회 완료`);
    
    if (!testResults || testResults.length === 0) {
      console.log(`⚠️  ${testTypeName}: 추출할 데이터가 없습니다.`);
      return;
    }
    
    // 각 학생별로 가장 최근 평가 세션 찾기
    // 1단계: 각 학생별로 가장 최근 created_at 찾기
    const studentLatestTimestamps = new Map<string, Date>(); // key: userId, value: 가장 최근 Date
    
    testResults.forEach(result => {
      if (!result.created_at) return;
      
      const userId = result.user_id;
      const createdAt = new Date(result.created_at);
      
      const existing = studentLatestTimestamps.get(userId);
      if (!existing || createdAt > existing) {
        studentLatestTimestamps.set(userId, createdAt);
      }
    });
    
    // 2단계: 각 학생별로 가장 최근 세션 키 생성 (날짜_시간대)
    const latestSessionKeys = new Map<string, string>(); // key: userId, value: sessionKey (날짜_시간대)
    
    studentLatestTimestamps.forEach((latestDate, userId) => {
      const sessionKey = `${latestDate.toISOString().split('T')[0]}_${Math.floor(latestDate.getHours())}`;
      latestSessionKeys.set(userId, sessionKey);
    });
    
    console.log(`✅ ${latestSessionKeys.size}명의 학생의 최근 평가 세션 식별 완료`);
    
    // 데이터 집계
    const studentDataMap = new Map<string, {
      school: string;
      grade: string;
      class: string;
      number: string;
      name: string;
      totalQuestions: number;
      correctQuestions: number;
      totalTime: number;
    }>();
    
    // 최근 세션이 있는 모든 학생 초기화
    latestSessionKeys.forEach((sessionKey, userId) => {
      const profile = studentProfiles.find(p => p.id === userId);
      if (!profile) return;
      
      const email = userEmails.get(userId) || '';
      const school = extractSchoolFromEmail(email);
      const key = `${userId}_${testType}`;
      
      studentDataMap.set(key, {
        school,
        grade: profile.grade_level || '미지정',
        class: profile.class_name || '미지정',
        number: profile.student_number || '미지정',
        name: profile.full_name || '미지정',
        totalQuestions: 0,
        correctQuestions: 0,
        totalTime: 0,
      });
    });
    
    console.log(`✅ ${studentDataMap.size}명의 학생 데이터 초기화 완료`);
    
    // 각 학생별로 가장 최근 세션의 모든 결과 집계
    let processedCount = 0;
    let skippedCount = 0;
    
    testResults.forEach(result => {
      if (!result.created_at) {
        skippedCount++;
        return;
      }
      
      const userId = result.user_id;
      const latestSessionKey = latestSessionKeys.get(userId);
      
      // 이 학생의 최근 세션이 없으면 건너뛰기
      if (!latestSessionKey) {
        skippedCount++;
        return;
      }
      
      // 현재 결과가 최근 세션에 속하는지 확인
      const createdAt = new Date(result.created_at);
      const resultSessionKey = `${createdAt.toISOString().split('T')[0]}_${Math.floor(createdAt.getHours())}`;
      
      // 최근 세션에 속하는 결과만 집계
      if (resultSessionKey !== latestSessionKey) {
        skippedCount++;
        return;
      }
      
      // 해당 학생의 데이터에 집계
      const mapKey = `${userId}_${testType}`;
      const studentData = studentDataMap.get(mapKey);
      if (!studentData) {
        skippedCount++;
        return;
      }
      
      // 문제 개수 증가
      studentData.totalQuestions += 1;
      
      // 정답 여부 집계
      if (result.is_correct) {
        studentData.correctQuestions += 1;
      }
      
      // 세션의 최대 time_taken 사용 (같은 세션 내에서 가장 긴 시간)
      if (result.time_taken) {
        if (result.time_taken > studentData.totalTime) {
          studentData.totalTime = result.time_taken;
        }
      }
      
      processedCount++;
    });
    
    console.log(`✅ 처리된 결과: ${processedCount}개, 건너뛴 결과: ${skippedCount}개`);
    
    // 엑셀 데이터 준비 (학교별로 구분)
    const excelData = Array.from(studentDataMap.values())
      .filter(data => data.totalQuestions > 0) // 데이터가 있는 것만
      .map(data => ({
        '학교': data.school,
        '학년': data.grade,
        '반': data.class,
        '번호': data.number,
        '이름': data.name,
        '풀이한(발화한) 문제의 개수': data.totalQuestions,
        '맞힌 문제의 개수': data.correctQuestions,
        '정답률(맞힌 문제의 개수/풀이한(발화한) 문제의 개수)': 
          data.totalQuestions > 0 
            ? `${Math.round((data.correctQuestions / data.totalQuestions) * 100)}%`
            : '0%',
        '평가 시간': formatTime(data.totalTime),
      }))
      .sort((a, b) => {
        // 학교, 학년, 반, 번호 순으로 정렬
        if (a['학교'] !== b['학교']) {
          return String(a['학교']).localeCompare(String(b['학교']));
        }
        if (a['학년'] !== b['학년']) {
          return String(a['학년']).localeCompare(String(b['학년']));
        }
        if (a['반'] !== b['반']) {
          return String(a['반']).localeCompare(String(b['반']));
        }
        return String(a['번호']).localeCompare(String(b['번호']));
      });
    
    if (excelData.length === 0) {
      console.log(`⚠️  ${testTypeName}: 추출할 데이터가 없습니다.`);
      return;
    }
    
    // 엑셀 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${testTypeName} 평가 결과`);
    
    // 파일명 생성
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `${testTypeName}_학생평가결과_${dateStr}.xlsx`;
    
    // 파일 저장
    const outputDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filepath = path.join(outputDir, filename);
    XLSX.writeFile(workbook, filepath);
    
    console.log(`✅ ${testTypeName} 엑셀 파일 생성 완료: ${filepath}`);
    console.log(`📊 총 ${excelData.length}개의 데이터 행`);
  } catch (error) {
    console.error(`❌ ${testType} 오류 발생:`, error);
    // 에러가 발생해도 다음 교시 계속 진행
  }
}

async function exportResults(schoolName?: string, testType?: string) {
  try {
    console.log('📊 데이터 추출 시작...');
    
    // 학생 프로필 가져오기
    let profilesQuery = supabase
      .from('user_profiles')
      .select('id, full_name, class_name, student_number, grade_level')
      .eq('role', 'student');
    
    const { data: studentProfiles, error: profilesError } = await profilesQuery;
    
    if (profilesError) {
      throw new Error(`학생 프로필 조회 오류: ${profilesError.message}`);
    }
    
    if (!studentProfiles || studentProfiles.length === 0) {
      console.log('⚠️  학생 데이터가 없습니다.');
      return;
    }
    
    console.log(`✅ ${studentProfiles.length}명의 학생 프로필 조회 완료`);
    
    // 학생 이메일 가져오기
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`사용자 목록 조회 오류: ${usersError.message}`);
    }
    
    const userEmails = new Map<string, string>();
    users?.forEach(u => {
      if (u.email) {
        userEmails.set(u.id, u.email);
      }
    });
    
    // 학교별 필터링
    let filteredProfiles = studentProfiles;
    if (schoolName) {
      filteredProfiles = studentProfiles.filter(profile => {
        const email = userEmails.get(profile.id);
        const school = extractSchoolFromEmail(email);
        return school.toLowerCase() === schoolName.toLowerCase();
      });
      console.log(`✅ ${schoolName} 학교: ${filteredProfiles.length}명의 학생`);
    }
    
    const studentIds = filteredProfiles.map(p => p.id);
    
    if (studentIds.length === 0) {
      console.log('⚠️  해당 조건의 학생이 없습니다.');
      return;
    }
    
    // 테스트 결과 가져오기 (모든 교시)
    // 모든 가능한 test_type 목록
    const allPossibleTestTypes = ['p1_alphabet', 'p2_segmental_phoneme', 'p3_suprasegmental_phoneme', 'p4_phonics', 'p5_vocabulary', 'p6_comprehension'];
    
    // 필터링된 test_type 목록
    const targetTestTypes = testType 
      ? [testType] 
      : allPossibleTestTypes;
    
    // 테스트 결과 가져오기 (모든 데이터를 페이지네이션으로 가져오기)
    console.log(`📊 테스트 결과 조회 중...`);
    let resultsQuery = supabase
      .from('test_results')
      .select('user_id, test_type, is_correct, time_taken, created_at')
      .in('user_id', studentIds);
    
    if (testType) {
      resultsQuery = resultsQuery.eq('test_type', testType);
    } else {
      resultsQuery = resultsQuery.in('test_type', targetTestTypes);
    }
    
    const testResults = await fetchAllResults(resultsQuery);
    
    console.log(`✅ ${testResults.length}개의 테스트 결과 조회 완료`);
    
    // 실제로 데이터가 있는 test_type 확인
    const actualTestTypes = [...new Set(testResults?.map(r => r.test_type) || [])];
    console.log(`✅ 발견된 교시: ${actualTestTypes.join(', ')}`);
    
    // 각 학생별, 교시별로 가장 최근 평가 세션 찾기
    // 세션은 같은 날짜, 같은 시간대(1시간 단위)로 구분
    const latestSessionTimestamps = new Map<string, number>(); // key: userId_testType, value: 최근 세션의 타임스탬프
    
    testResults?.forEach(result => {
      if (!result.created_at) return;
      
      const createdAt = new Date(result.created_at);
      const sessionTimestamp = createdAt.getTime();
      const mapKey = `${result.user_id}_${result.test_type}`;
      
      const existingTimestamp = latestSessionTimestamps.get(mapKey);
      if (!existingTimestamp || sessionTimestamp > existingTimestamp) {
        // 가장 최근 세션의 타임스탬프 업데이트
        latestSessionTimestamps.set(mapKey, sessionTimestamp);
      }
    });
    
    console.log(`✅ ${latestSessionTimestamps.size}개의 최근 평가 세션 식별 완료`);
    
    // 데이터 집계
    const studentDataMap = new Map<string, {
      school: string;
      grade: string;
      class: string;
      number: string;
      name: string;
      testType: string;
      totalQuestions: number;
      correctQuestions: number;
      totalTime: number;
    }>();
    
    // 사용할 test_type 목록 (실제 데이터가 있는 것만)
    const testTypesToUse = testType 
      ? [testType] 
      : actualTestTypes.length > 0 
        ? actualTestTypes 
        : allPossibleTestTypes;
    
    // 학생별 초기화 (실제 데이터가 있는 test_type만)
    filteredProfiles.forEach(profile => {
      const email = userEmails.get(profile.id) || '';
      const school = extractSchoolFromEmail(email);
      
      testTypesToUse.forEach(tt => {
        const key = `${profile.id}_${tt}`;
        studentDataMap.set(key, {
          school,
          grade: profile.grade_level || '미지정',
          class: profile.class_name || '미지정',
          number: profile.student_number || '미지정',
          name: profile.full_name || '미지정',
          testType: tt,
          totalQuestions: 0,
          correctQuestions: 0,
          totalTime: 0,
        });
      });
    });
    
    // 가장 최근 세션의 결과만 집계
    testResults?.forEach(result => {
      if (!result.created_at) return;
      
      const mapKey = `${result.user_id}_${result.test_type}`;
      const latestTimestamp = latestSessionTimestamps.get(mapKey);
      
      if (!latestTimestamp) return;
      
      // 현재 결과가 최근 세션에 속하는지 확인
      const createdAt = new Date(result.created_at);
      const resultTimestamp = createdAt.getTime();
      
      // 같은 날짜, 같은 시간대(1시간 단위)인지 확인
      const latestDate = new Date(latestTimestamp);
      const latestSessionKey = `${latestDate.toISOString().split('T')[0]}_${Math.floor(latestDate.getHours())}`;
      const resultSessionKey = `${createdAt.toISOString().split('T')[0]}_${Math.floor(createdAt.getHours())}`;
      
      if (resultSessionKey !== latestSessionKey) {
        // 최근 세션이 아니면 건너뛰기
        return;
      }
      
      const studentData = studentDataMap.get(mapKey);
      if (!studentData) return;
      
      studentData.totalQuestions += 1;
      if (result.is_correct) {
        studentData.correctQuestions += 1;
      }
      
      // 세션의 최대 time_taken 사용
      if (result.time_taken) {
        if (result.time_taken > studentData.totalTime) {
          studentData.totalTime = result.time_taken;
        }
      }
    });
    
    // 엑셀 데이터 준비
    const excelData = Array.from(studentDataMap.values())
      .filter(data => data.totalQuestions > 0) // 데이터가 있는 것만
      .map(data => ({
        '학교': data.school,
        '학년': data.grade,
        '반': data.class,
        '번호': data.number,
        '이름': data.name,
        '교시': TEST_TYPE_MAP[data.testType] || data.testType,
        '풀이한(발화한) 문제의 개수': data.totalQuestions,
        '맞힌 문제의 개수': data.correctQuestions,
        '정답률(맞힌 문제의 개수/풀이한(발화한) 문제의 개수)': 
          data.totalQuestions > 0 
            ? `${Math.round((data.correctQuestions / data.totalQuestions) * 100)}%`
            : '0%',
        '평가 시간': formatTime(data.totalTime),
      }))
      .sort((a, b) => {
        if (a['학교'] !== b['학교']) {
          return String(a['학교']).localeCompare(String(b['학교']));
        }
        if (a['학년'] !== b['학년']) {
          return String(a['학년']).localeCompare(String(b['학년']));
        }
        if (a['반'] !== b['반']) {
          return String(a['반']).localeCompare(String(b['반']));
        }
        if (a['번호'] !== b['번호']) {
          return String(a['번호']).localeCompare(String(b['번호']));
        }
        return String(a['교시']).localeCompare(String(b['교시']));
      });
    
    if (excelData.length === 0) {
      console.log('⚠️  추출할 데이터가 없습니다.');
      return;
    }
    
    // 엑셀 워크북 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '학생 평가 결과');
    
    // 파일명 생성
    const schoolLabel = schoolName || '전체';
    const testTypeLabel = testType ? TEST_TYPE_MAP[testType] || testType : '전체';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `학생평가결과_${schoolLabel}_${testTypeLabel}_${dateStr}.xlsx`;
    
    // 파일 저장
    const outputDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filepath = path.join(outputDir, filename);
    XLSX.writeFile(workbook, filepath);
    
    console.log(`✅ 엑셀 파일 생성 완료: ${filepath}`);
    console.log(`📊 총 ${excelData.length}개의 데이터 행`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 명령줄 인자 파싱
const args = process.argv.slice(2);
const mode = args[0]; // 'by-period' 또는 기존 방식

if (mode === 'by-period') {
  // 각 교시별로 별도 파일 생성
  const startFromPeriod = args[1] ? parseInt(args[1]) : undefined;
  if (startFromPeriod) {
    console.log(`📚 ${startFromPeriod}교시부터 시작합니다.`);
  }
  exportResultsByPeriod(startFromPeriod);
} else if (mode === 'period' || args[0] === '1') {
  // 1교시만 추출 (테스트용)
  console.log('📚 1교시 데이터 추출 시작...');
  exportResultsForPeriod('p1_alphabet', '1교시');
} else {
  // 기존 방식 (학교별, 교시별 필터링)
  const schoolName = args[0] || undefined;
  const testType = args[1] || undefined;

  if (schoolName) {
    console.log(`🏫 학교: ${schoolName}`);
  }
  if (testType) {
    console.log(`📚 교시: ${TEST_TYPE_MAP[testType] || testType}`);
  }

  exportResults(schoolName, testType);
}
