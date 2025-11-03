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
 * 형식: {학생이름}/{날짜}/{testType}/{timestamp}.webm
 */
export async function generateStoragePath(
  userId: string, 
  testType: string, 
  timestamp?: number
): Promise<string> {
  const supabase = createServiceClient();
  const sessionDate = getSessionDate();
  const fileTimestamp = timestamp || Date.now();
  
  // 학생 이름 가져오기
  let studentName = '';
  
  try {
    // user_profiles 테이블에서 학생 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (!profileError && profile?.full_name) {
      // 한글은 그대로 유지, 특수문자만 치환
      studentName = profile.full_name.replace(/[^가-힣a-zA-Z0-9-_.]/g, '_');
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
  } catch (error) {
    console.error('[Storage Path] 사용자 정보 조회 실패:', error);
    // 폴백: user_id 사용
    studentName = `student_${userId.slice(0, 8)}`;
  }
  
  // 한글을 로마자로 변환하는 함수
  const koreanToRoman = (text: string): string => {
    const initials = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
    const vowels = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'weo', 'we', 'wi', 'yu', 'eu', 'yi', 'i'];
    const finals = ['', 'k', 'kk', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      if (char >= 0xAC00 && char <= 0xD7A3) {
        const base = char - 0xAC00;
        const initialIndex = Math.floor(base / (21 * 28));
        const vowelIndex = Math.floor((base % (21 * 28)) / 28);
        const finalIndex = base % 28;
        
        const initial = initials[initialIndex] || '';
        const vowel = vowels[vowelIndex] || '';
        const final = finals[finalIndex] || '';
        
        if (result === '' || result.endsWith('_')) {
          result += (initial + vowel + final).charAt(0).toUpperCase() + (initial + vowel + final).slice(1);
        } else {
          result += initial + vowel + final;
        }
      } else if ((char >= 0x0041 && char <= 0x005A) || (char >= 0x0061 && char <= 0x007A) || (char >= 0x0030 && char <= 0x0039)) {
        result += text[i];
      } else {
        result += '_';
      }
    }
    return result.replace(/_+/g, '_').replace(/^_|_$/g, '');
  };
  
  // Supabase Storage 경로는 한글을 지원하지 않으므로 안전한 ASCII 문자만 사용
  const userIdShort = userId.slice(0, 8);
  let safeStudentName = '';
  
  // 영문/숫자만 있는 경우
  if (!/[가-힣]/.test(studentName)) {
    safeStudentName = studentName
      .replace(/[^a-zA-Z0-9-_.]/g, '_')
      .toLowerCase()
      .slice(0, 30);
    if (safeStudentName) {
      safeStudentName = `${safeStudentName}_${userIdShort}`;
    }
  }
  
  // 한글이 포함된 경우 로마자로 변환
  if (!safeStudentName) {
    const romanName = koreanToRoman(studentName);
    if (romanName && romanName.length > 0) {
      safeStudentName = `${romanName}_${userIdShort}`;
    } else {
      safeStudentName = `user_${userIdShort}`;
    }
  }
  
  return `${safeStudentName}/${sessionDate}/${testType.toLowerCase()}/${fileTimestamp}.webm`;
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
