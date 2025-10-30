import { createServiceClient } from '@/lib/supabase/server';

/**
 * 학생 이름을 가져오는 함수
 */
export async function getStudentName(userId: string): Promise<string> {
  try {
    const supabase = createServiceClient();
    
    // user_profiles 테이블에서 학생 이름 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.full_name) {
      console.warn(`[Storage Path] 사용자 이름을 찾을 수 없음: ${userId}, 에러: ${profileError?.message}`);
      
      // Auth 테이블에서 이메일을 이름으로 사용
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (!userError && userData?.user?.email) {
          // 이메일에서 @ 앞부분을 이름으로 사용
          const emailName = userData.user.email.split('@')[0];
          return emailName || `student_${userId.slice(0, 8)}`;
        }
      } catch (authError) {
        console.error('[Storage Path] Auth 조회 실패:', authError);
      }
      
      return `student_${userId.slice(0, 8)}`;
    }

    return profile.full_name;
  } catch (error) {
    console.error('[Storage Path] 학생 이름 조회 중 오류:', error);
    return `student_${userId.slice(0, 8)}`;
  }
}

/**
 * 현재 세션 날짜를 기반으로 한 세션 ID를 생성하는 함수
 */
export function getSessionDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD 형식
}

/**
 * 새로운 스토리지 경로를 생성하는 함수
 * 형식: {학교이름}/{학생이름}/{날짜}/{testType}/{timestamp}.webm
 */
export async function generateStoragePath(
  userId: string, 
  testType: string, 
  timestamp?: number
): Promise<string> {
  const supabase = createServiceClient();
  const sessionDate = getSessionDate();
  const fileTimestamp = timestamp || Date.now();
  
  // 학교 이름과 학생 이름 가져오기
  let schoolName = '';
  let studentName = '';
  
  try {
    // user_profiles 테이블에서 학생 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, class_name')
      .eq('id', userId)
      .single();

    if (!profileError && profile) {
      // 학생 이름
      if (profile.full_name) {
        // 한글은 그대로 유지, 특수문자만 치환
        studentName = profile.full_name.replace(/[^가-힣a-zA-Z0-9-_.]/g, '_');
      }
      
      // 학교 이름 (class_name에서 추출)
      if (profile.class_name) {
        // 예: "1학년 3반" → "1학년 3반"으로 그대로 사용
        schoolName = profile.class_name.replace(/[^가-힣a-zA-Z0-9-_. ]/g, '_');
      }
    }
    
    // 만약 정보를 가져오지 못했다면 Auth에서 이메일 사용
    if (!studentName) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (!userError && userData?.user?.email) {
        const emailPrefix = userData.user.email.split('@')[0];
        studentName = emailPrefix.replace(/[^a-zA-Z0-9-_.]/g, '_');
      } else {
        studentName = `student_${userId.slice(0, 8)}`;
      }
    }
    
    // 학교 이름이 없으면 기본값 설정
    if (!schoolName) {
      schoolName = 'default_school';
    }
  } catch (error) {
    console.error('[Storage Path] 사용자 정보 조회 실패:', error);
    // 폴백: user_id 사용
    studentName = `student_${userId.slice(0, 8)}`;
    schoolName = 'default_school';
  }
  
  return `${schoolName}/${studentName}/${sessionDate}/${testType.toLowerCase()}/${fileTimestamp}.webm`;
}

/**
 * 기존 경로를 새로운 경로로 변환하는 함수 (마이그레이션용)
 */
export function parseStoragePath(path: string): {
  studentName?: string;
  sessionDate?: string;
  testType?: string;
  fileName?: string;
} {
  const parts = path.split('/');
  
  // 새로운 형식: studentName/sessionDate/testType/fileName.webm
  if (parts.length === 4) {
    return {
      studentName: parts[0],
      sessionDate: parts[1],
      testType: parts[2],
      fileName: parts[3]
    };
  }
  
  // 기존 형식: testType/userId/timestamp.webm
  if (parts.length === 3) {
    return {
      testType: parts[0],
      fileName: parts[2]
    };
  }
  
  return {};
}
