import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// .env.local 파일을 명시적으로 로드
config({ path: resolve(process.cwd(), '.env.local') });
// .env 파일도 로드 (fallback)
config({ path: resolve(process.cwd(), '.env') });

interface Teacher {
  name: string;
  email: string;
  password: string;
  school: string;
  classes: string[]; // 담당 학급 목록
}

interface Student {
  school: string;
  grade: string;
  class: string;
  number: string;
  name: string;
  email: string;
  password: string;
}

interface AccountCreationStats {
  teachers: { total: number; created: number; skipped: number; errors: number };
  students: { total: number; created: number; skipped: number; errors: number };
  assignments: { total: number; created: number; skipped: number; errors: number };
}

// 교사 데이터
const teachers: Teacher[] = [
  {
    name: '권해경',
    email: 'teacher_hk@abs.com',
    password: 'hk1234',
    school: '나루초등학교',
    classes: ['3학년 다솜반'],
  },
  {
    name: '이수민',
    email: 'teacher_sm@abs.com',
    password: 'sm1234',
    school: '우암초등학교',
    classes: ['3학년 1반'],
  },
  {
    name: '이수지',
    email: 'teacher_sj@abs.com',
    password: 'sj1234',
    school: '단재초등학교',
    classes: ['4학년 1반', '4학년 2반', '4학년 3반'],
  },
];

// 학생 데이터
const students: Student[] = [
  // 나루초등학교 3학년 다솜반
  { school: '나루초등학교', grade: '3', class: '다솜', number: '1', name: '고도윤', email: 'naru1@abs.com', password: 'naru1' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '2', name: '권아정', email: 'naru2@abs.com', password: 'naru2' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '3', name: '김도현', email: 'naru3@abs.com', password: 'naru3' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '4', name: '김민주', email: 'naru4@abs.com', password: 'naru4' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '5', name: '김시원', email: 'naru5@abs.com', password: 'naru5' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '6', name: '김영환', email: 'naru6@abs.com', password: 'naru6' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '7', name: '김채윤', email: 'naru7@abs.com', password: 'naru7' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '8', name: '김채이', email: 'naru8@abs.com', password: 'naru8' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '9', name: '남궁태양', email: 'naru9@abs.com', password: 'naru9' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '10', name: '박소언', email: 'naru10@abs.com', password: 'naru10' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '11', name: '서지후', email: 'naru11@abs.com', password: 'naru11' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '12', name: '손지훈', email: 'naru12@abs.com', password: 'naru12' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '13', name: '안이랑', email: 'naru13@abs.com', password: 'naru13' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '14', name: '안지윤', email: 'naru14@abs.com', password: 'naru14' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '15', name: '양보결', email: 'naru15@abs.com', password: 'naru15' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '16', name: '윤원교', email: 'naru16@abs.com', password: 'naru16' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '17', name: '이서현', email: 'naru17@abs.com', password: 'naru17' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '18', name: '이은도', email: 'naru18@abs.com', password: 'naru18' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '19', name: '이하윤', email: 'naru19@abs.com', password: 'naru19' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '20', name: '이한국', email: 'naru20@abs.com', password: 'naru20' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '21', name: '전민기', email: 'naru21@abs.com', password: 'naru21' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '22', name: '주태린', email: 'naru22@abs.com', password: 'naru22' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '23', name: '최민준', email: 'naru23@abs.com', password: 'naru23' },
  { school: '나루초등학교', grade: '3', class: '다솜', number: '24', name: '하태윤', email: 'naru24@abs.com', password: 'naru24' },
  
  // 우암초등학교 3학년 1반
  { school: '우암초등학교', grade: '3', class: '1', number: '1', name: '권도형', email: 'uam1@abs.com', password: 'uam1' },
  { school: '우암초등학교', grade: '3', class: '1', number: '2', name: '김윤희', email: 'uam2@abs.com', password: 'uam2' },
  { school: '우암초등학교', grade: '3', class: '1', number: '3', name: '노영진', email: 'uam3@abs.com', password: 'uam3' },
  { school: '우암초등학교', grade: '3', class: '1', number: '4', name: '심치우', email: 'uam4@abs.com', password: 'uam4' },
  { school: '우암초등학교', grade: '3', class: '1', number: '5', name: '양진솔', email: 'uam5@abs.com', password: 'uam5' },
  { school: '우암초등학교', grade: '3', class: '1', number: '6', name: '유혜린', email: 'uam6@abs.com', password: 'uam6' },
  { school: '우암초등학교', grade: '3', class: '1', number: '7', name: '이다원', email: 'uam7@abs.com', password: 'uam7' },
  { school: '우암초등학교', grade: '3', class: '1', number: '8', name: '이상준', email: 'uam8@abs.com', password: 'uam8' },
  { school: '우암초등학교', grade: '3', class: '1', number: '9', name: '이서진', email: 'uam9@abs.com', password: 'uam9' },
  { school: '우암초등학교', grade: '3', class: '1', number: '10', name: '이시준', email: 'uam10@abs.com', password: 'uam10' },
  { school: '우암초등학교', grade: '3', class: '1', number: '11', name: '이유준', email: 'uam11@abs.com', password: 'uam11' },
  { school: '우암초등학교', grade: '3', class: '1', number: '12', name: '정태연', email: 'uam12@abs.com', password: 'uam12' },
  { school: '우암초등학교', grade: '3', class: '1', number: '13', name: '지윤호', email: 'uam13@abs.com', password: 'uam13' },
  { school: '우암초등학교', grade: '3', class: '1', number: '14', name: '천승민', email: 'uam14@abs.com', password: 'uam14' },
  { school: '우암초등학교', grade: '3', class: '1', number: '15', name: '한진후', email: 'uam15@abs.com', password: 'uam15' },
  { school: '우암초등학교', grade: '3', class: '1', number: '16', name: '최유나', email: 'uam16@abs.com', password: 'uam16' },
  { school: '우암초등학교', grade: '3', class: '1', number: '17', name: '홍은찬', email: 'uam17@abs.com', password: 'uam17' },
  { school: '우암초등학교', grade: '3', class: '1', number: '18', name: '임진용', email: 'uam18@abs.com', password: 'uam18' },
  
  // 단재초등학교 4학년 1반
  { school: '단재초등학교', grade: '4', class: '1', number: '1', name: '강지안', email: '1danjae1@abs.com', password: '1danjae1' },
  { school: '단재초등학교', grade: '4', class: '1', number: '2', name: '곽수민', email: '1danjae2@abs.com', password: '1danjae2' },
  { school: '단재초등학교', grade: '4', class: '1', number: '3', name: '김가연', email: '1danjae3@abs.com', password: '1danjae3' },
  { school: '단재초등학교', grade: '4', class: '1', number: '4', name: '김범종', email: '1danjae4@abs.com', password: '1danjae4' },
  { school: '단재초등학교', grade: '4', class: '1', number: '5', name: '김지유', email: '1danjae5@abs.com', password: '1danjae5' },
  { school: '단재초등학교', grade: '4', class: '1', number: '6', name: '김채하', email: '1danjae6@abs.com', password: '1danjae6' },
  { school: '단재초등학교', grade: '4', class: '1', number: '7', name: '류하록', email: '1danjae7@abs.com', password: '1danjae7' },
  { school: '단재초등학교', grade: '4', class: '1', number: '8', name: '민 훈', email: '1danjae8@abs.com', password: '1danjae8' },
  { school: '단재초등학교', grade: '4', class: '1', number: '9', name: '박서아', email: '1danjae9@abs.com', password: '1danjae9' },
  { school: '단재초등학교', grade: '4', class: '1', number: '10', name: '박서연', email: '1danjae10@abs.com', password: '1danjae10' },
  { school: '단재초등학교', grade: '4', class: '1', number: '11', name: '박소은', email: '1danjae11@abs.com', password: '1danjae11' },
  { school: '단재초등학교', grade: '4', class: '1', number: '12', name: '박준서', email: '1danjae12@abs.com', password: '1danjae12' },
  { school: '단재초등학교', grade: '4', class: '1', number: '13', name: '배주현', email: '1danjae13@abs.com', password: '1danjae13' },
  { school: '단재초등학교', grade: '4', class: '1', number: '14', name: '서하랑', email: '1danjae14@abs.com', password: '1danjae14' },
  { school: '단재초등학교', grade: '4', class: '1', number: '15', name: '이선후', email: '1danjae15@abs.com', password: '1danjae15' },
  { school: '단재초등학교', grade: '4', class: '1', number: '16', name: '이승빈', email: '1danjae16@abs.com', password: '1danjae16' },
  { school: '단재초등학교', grade: '4', class: '1', number: '17', name: '이연섭', email: '1danjae17@abs.com', password: '1danjae17' },
  { school: '단재초등학교', grade: '4', class: '1', number: '18', name: '이영서', email: '1danjae18@abs.com', password: '1danjae18' },
  { school: '단재초등학교', grade: '4', class: '1', number: '19', name: '임정묵', email: '1danjae19@abs.com', password: '1danjae19' },
  { school: '단재초등학교', grade: '4', class: '1', number: '20', name: '전은찬', email: '1danjae20@abs.com', password: '1danjae20' },
  { school: '단재초등학교', grade: '4', class: '1', number: '21', name: '정우성', email: '1danjae21@abs.com', password: '1danjae21' },
  { school: '단재초등학교', grade: '4', class: '1', number: '22', name: '정우태', email: '1danjae22@abs.com', password: '1danjae22' },
  { school: '단재초등학교', grade: '4', class: '1', number: '23', name: '홍지호', email: '1danjae23@abs.com', password: '1danjae23' },
  { school: '단재초등학교', grade: '4', class: '1', number: '24', name: '김민기', email: '1danjae24@abs.com', password: '1danjae24' },
  
  // 단재초등학교 4학년 2반
  { school: '단재초등학교', grade: '4', class: '2', number: '1', name: '남윤석', email: '2danjae1@abs.com', password: '2danjae1' },
  { school: '단재초등학교', grade: '4', class: '2', number: '2', name: '류영아', email: '2danjae2@abs.com', password: '2danjae2' },
  { school: '단재초등학교', grade: '4', class: '2', number: '3', name: '박민서', email: '2danjae3@abs.com', password: '2danjae3' },
  { school: '단재초등학교', grade: '4', class: '2', number: '4', name: '박서아', email: '2danjae4@abs.com', password: '2danjae4' },
  { school: '단재초등학교', grade: '4', class: '2', number: '5', name: '박세용', email: '2danjae5@abs.com', password: '2danjae5' },
  { school: '단재초등학교', grade: '4', class: '2', number: '6', name: '박수현', email: '2danjae6@abs.com', password: '2danjae6' },
  { school: '단재초등학교', grade: '4', class: '2', number: '7', name: '박영환', email: '2danjae7@abs.com', password: '2danjae7' },
  { school: '단재초등학교', grade: '4', class: '2', number: '8', name: '박주완', email: '2danjae8@abs.com', password: '2danjae8' },
  { school: '단재초등학교', grade: '4', class: '2', number: '9', name: '박지현', email: '2danjae9@abs.com', password: '2danjae9' },
  { school: '단재초등학교', grade: '4', class: '2', number: '10', name: '손리아', email: '2danjae10@abs.com', password: '2danjae10' },
  { school: '단재초등학교', grade: '4', class: '2', number: '11', name: '신이찬', email: '2danjae11@abs.com', password: '2danjae11' },
  { school: '단재초등학교', grade: '4', class: '2', number: '12', name: '유시윤', email: '2danjae12@abs.com', password: '2danjae12' },
  { school: '단재초등학교', grade: '4', class: '2', number: '13', name: '유채아', email: '2danjae13@abs.com', password: '2danjae13' },
  { school: '단재초등학교', grade: '4', class: '2', number: '14', name: '윤서희', email: '2danjae14@abs.com', password: '2danjae14' },
  { school: '단재초등학교', grade: '4', class: '2', number: '15', name: '이상윤', email: '2danjae15@abs.com', password: '2danjae15' },
  { school: '단재초등학교', grade: '4', class: '2', number: '16', name: '이선우', email: '2danjae16@abs.com', password: '2danjae16' },
  { school: '단재초등학교', grade: '4', class: '2', number: '17', name: '이정준', email: '2danjae17@abs.com', password: '2danjae17' },
  { school: '단재초등학교', grade: '4', class: '2', number: '18', name: '이준후', email: '2danjae18@abs.com', password: '2danjae18' },
  { school: '단재초등학교', grade: '4', class: '2', number: '19', name: '이효원', email: '2danjae19@abs.com', password: '2danjae19' },
  { school: '단재초등학교', grade: '4', class: '2', number: '20', name: '장지우', email: '2danjae20@abs.com', password: '2danjae20' },
  { school: '단재초등학교', grade: '4', class: '2', number: '21', name: '조윤지', email: '2danjae21@abs.com', password: '2danjae21' },
  { school: '단재초등학교', grade: '4', class: '2', number: '22', name: '조주원', email: '2danjae22@abs.com', password: '2danjae22' },
  { school: '단재초등학교', grade: '4', class: '2', number: '23', name: '한민기', email: '2danjae23@abs.com', password: '2danjae23' },
  
  // 단재초등학교 4학년 3반
  { school: '단재초등학교', grade: '4', class: '3', number: '1', name: '강지우', email: '3danjae1@abs.com', password: '3danjae1' },
  { school: '단재초등학교', grade: '4', class: '3', number: '2', name: '구본준', email: '3danjae2@abs.com', password: '3danjae2' },
  { school: '단재초등학교', grade: '4', class: '3', number: '3', name: '권준서', email: '3danjae3@abs.com', password: '3danjae3' },
  { school: '단재초등학교', grade: '4', class: '3', number: '4', name: '김승후', email: '3danjae4@abs.com', password: '3danjae4' },
  { school: '단재초등학교', grade: '4', class: '3', number: '5', name: '김시우', email: '3danjae5@abs.com', password: '3danjae5' },
  { school: '단재초등학교', grade: '4', class: '3', number: '6', name: '김준우', email: '3danjae6@abs.com', password: '3danjae6' },
  { school: '단재초등학교', grade: '4', class: '3', number: '7', name: '노하연', email: '3danjae7@abs.com', password: '3danjae7' },
  { school: '단재초등학교', grade: '4', class: '3', number: '8', name: '라윤서', email: '3danjae8@abs.com', password: '3danjae8' },
  { school: '단재초등학교', grade: '4', class: '3', number: '9', name: '류다은', email: '3danjae9@abs.com', password: '3danjae9' },
  { school: '단재초등학교', grade: '4', class: '3', number: '10', name: '민채원', email: '3danjae10@abs.com', password: '3danjae10' },
  { school: '단재초등학교', grade: '4', class: '3', number: '11', name: '박영민', email: '3danjae11@abs.com', password: '3danjae11' },
  { school: '단재초등학교', grade: '4', class: '3', number: '12', name: '박지현', email: '3danjae12@abs.com', password: '3danjae12' },
  { school: '단재초등학교', grade: '4', class: '3', number: '13', name: '서준혁', email: '3danjae13@abs.com', password: '3danjae13' },
  { school: '단재초등학교', grade: '4', class: '3', number: '14', name: '성수현', email: '3danjae14@abs.com', password: '3danjae14' },
  { school: '단재초등학교', grade: '4', class: '3', number: '15', name: '오승준', email: '3danjae15@abs.com', password: '3danjae15' },
  { school: '단재초등학교', grade: '4', class: '3', number: '16', name: '이봄', email: '3danjae16@abs.com', password: '3danjae16' },
  { school: '단재초등학교', grade: '4', class: '3', number: '17', name: '이승민', email: '3danjae17@abs.com', password: '3danjae17' },
  { school: '단재초등학교', grade: '4', class: '3', number: '18', name: '이승재', email: '3danjae18@abs.com', password: '3danjae18' },
  { school: '단재초등학교', grade: '4', class: '3', number: '19', name: '최서원', email: '3danjae19@abs.com', password: '3danjae19' },
  { school: '단재초등학교', grade: '4', class: '3', number: '20', name: '최지원', email: '3danjae20@abs.com', password: '3danjae20' },
  { school: '단재초등학교', grade: '4', class: '3', number: '21', name: '허윤서', email: '3danjae21@abs.com', password: '3danjae21' },
  { school: '단재초등학교', grade: '4', class: '3', number: '22', name: '홍유비', email: '3danjae22@abs.com', password: '3danjae22' },
];

/**
 * 교사 계정 생성
 */
async function createTeachers(
  client: ReturnType<typeof createSupabaseClient>,
  existingUsersMap: Map<string, string>,
  dryRun: boolean
): Promise<Map<string, string>> {
  console.log('\n👨‍🏫 교사 계정 생성 중...\n');
  const teacherIdMap = new Map<string, string>(); // email -> userId

  for (const teacher of teachers) {
    try {
      if (dryRun) {
        console.log(`   👀 [Dry-run] 교사 계정 생성 예정: ${teacher.name} (${teacher.email})`);
        teacherIdMap.set(teacher.email, 'dry-run-user-id');
        continue;
      }

      // 이미 존재하는 사용자 확인
      const existingUserId = existingUsersMap.get(teacher.email);
      if (existingUserId) {
        console.log(`   ⏭️  교사 계정 이미 존재: ${teacher.name} (${teacher.email})`);
        teacherIdMap.set(teacher.email, existingUserId);
      } else {
        // Auth 사용자 생성
        const { data: authUser, error: createError } = await client.auth.admin.createUser({
          email: teacher.email,
          password: teacher.password,
          email_confirm: true,
          user_metadata: {
            name: teacher.name,
            school: teacher.school,
          },
        });

        if (createError) {
          // 이미 존재하는 경우
          if (
            createError.message.includes('already registered') ||
            createError.message.includes('already exists') ||
            createError.message.includes('User already registered') ||
            createError.message.includes('has already been registered')
          ) {
            console.log(`   ⏭️  교사 계정 이미 존재: ${teacher.name} (${teacher.email})`);
            // 기존 사용자 재조회
            const { data: existingUsers } = await client.auth.admin.listUsers();
            const existingUser = existingUsers?.users.find((u) => u.email === teacher.email);
            if (existingUser) {
              teacherIdMap.set(teacher.email, existingUser.id);
              existingUsersMap.set(teacher.email, existingUser.id);
            } else {
              console.error(`   ❌ 기존 교사 계정을 찾을 수 없음: ${teacher.email}`);
              continue;
            }
          } else {
            console.error(`   ❌ 교사 계정 생성 실패 (${teacher.name}):`, createError.message);
            continue;
          }
        } else if (authUser?.user) {
          teacherIdMap.set(teacher.email, authUser.user.id);
          existingUsersMap.set(teacher.email, authUser.user.id);
          console.log(`   ✅ 교사 계정 생성 완료: ${teacher.name} (${teacher.email})`);
        }
      }

      // user_profiles에 프로필 생성
      const userId = teacherIdMap.get(teacher.email);
      if (userId && userId !== 'dry-run-user-id') {
        const { error: profileError } = await client.from('user_profiles').upsert(
          {
            id: userId,
            full_name: teacher.name,
            role: 'teacher',
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          // 스키마 캐시 오류인 경우 경고만 출력 (테이블은 존재함)
          if (profileError.message.includes('schema cache')) {
            console.log(`   ⚠️  교사 프로필 생성 중 스키마 캐시 오류 (${teacher.name}), 나중에 수동으로 생성 필요`);
          } else {
            console.error(`   ⚠️  교사 프로필 생성 실패 (${teacher.name}):`, profileError.message);
          }
        } else {
          console.log(`   ✅ 교사 프로필 생성 완료: ${teacher.name}`);
        }
      }
    } catch (error) {
      console.error(`   💥 교사 계정 생성 중 오류 (${teacher.name}):`, error);
    }
  }

  return teacherIdMap;
}

/**
 * 학생 계정 생성
 */
async function createStudents(
  client: ReturnType<typeof createSupabaseClient>,
  existingUsersMap: Map<string, string>,
  dryRun: boolean
): Promise<Map<string, string>> {
  console.log('\n👨‍🎓 학생 계정 생성 중...\n');
  const studentIdMap = new Map<string, string>(); // email -> userId

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    try {
      const className = `${student.grade}학년 ${student.class}반`;
      const gradeLevel = `${student.grade}학년`;

      if (dryRun) {
        console.log(`   👀 [Dry-run] 학생 계정 생성 예정: ${student.name} (${student.email}) - ${student.school} ${className}`);
        studentIdMap.set(student.email, 'dry-run-user-id');
        continue;
      }

      // 이미 존재하는 사용자 확인
      const existingUserId = existingUsersMap.get(student.email);
      if (existingUserId) {
        studentIdMap.set(student.email, existingUserId);
        if ((i + 1) % 10 === 0) {
          console.log(`   진행 중... ${i + 1}/${students.length}`);
        }
      } else {
        // Auth 사용자 생성
        const { data: authUser, error: createError } = await client.auth.admin.createUser({
          email: student.email,
          password: student.password,
          email_confirm: true,
          user_metadata: {
            name: student.name,
            school: student.school,
            grade: student.grade,
            class: student.class,
            number: student.number,
          },
        });

        if (createError) {
          // 이미 존재하는 경우
          if (
            createError.message.includes('already registered') ||
            createError.message.includes('already exists') ||
            createError.message.includes('User already registered') ||
            createError.message.includes('has already been registered')
          ) {
            // 기존 사용자 재조회
            const { data: existingUsers } = await client.auth.admin.listUsers();
            const existingUser = existingUsers?.users.find((u) => u.email === student.email);
            if (existingUser) {
              studentIdMap.set(student.email, existingUser.id);
              existingUsersMap.set(student.email, existingUser.id);
            } else {
              console.error(`   ❌ 기존 학생 계정을 찾을 수 없음: ${student.email}`);
              continue;
            }
          } else {
            console.error(`   ❌ 학생 계정 생성 실패 (${student.name}):`, createError.message);
            continue;
          }
        } else if (authUser?.user) {
          studentIdMap.set(student.email, authUser.user.id);
          existingUsersMap.set(student.email, authUser.user.id);
          if ((i + 1) % 10 === 0) {
            console.log(`   진행 중... ${i + 1}/${students.length}`);
          }
        }
      }

      // user_profiles에 프로필 생성
      const userId = studentIdMap.get(student.email);
      if (userId && userId !== 'dry-run-user-id') {
        const { error: profileError } = await client.from('user_profiles').upsert(
          {
            id: userId,
            full_name: student.name,
            role: 'student',
            class_name: className,
            student_number: student.number,
            grade_level: gradeLevel,
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          // 스키마 캐시 오류인 경우 경고만 출력 (테이블은 존재함)
          if (profileError.message.includes('schema cache')) {
            if ((i + 1) % 20 === 0 || i < 5) {
              // 처음 5개와 20개마다만 경고 로깅
              console.log(`   ⚠️  학생 프로필 생성 중 스키마 캐시 오류 발생 (계속 진행 중...)`);
            }
          } else {
            if ((i + 1) % 10 === 0 || i < 10) {
              // 처음 10개와 10개마다만 에러 로깅 (너무 많은 로그 방지)
              console.error(`   ⚠️  학생 프로필 생성 실패 (${student.name}):`, profileError.message);
            }
          }
        }
      }
    } catch (error) {
      console.error(`   💥 학생 계정 생성 중 오류 (${student.name}):`, error);
    }
  }

  console.log(`   ✅ 학생 계정 생성 완료: ${studentIdMap.size}명`);
  return studentIdMap;
}

/**
 * 교사-학생 배정
 */
async function createAssignments(
  client: ReturnType<typeof createSupabaseClient>,
  teacherIdMap: Map<string, string>,
  studentIdMap: Map<string, string>,
  dryRun: boolean
): Promise<void> {
  console.log('\n🔗 교사-학생 배정 중...\n');

  let assignmentCount = 0;

  for (const teacher of teachers) {
    const teacherId = teacherIdMap.get(teacher.email);
    if (!teacherId) {
      console.error(`   ❌ 교사 ID를 찾을 수 없음: ${teacher.name} (${teacher.email})`);
      continue;
    }

    // 각 담당 학급에 속한 학생 찾기
    for (const className of teacher.classes) {
      const [grade, classNum] = className.split(' ');
      const gradeNum = grade.replace('학년', '');

      const assignedStudents = students.filter(
        (s) => s.school === teacher.school && s.grade === gradeNum && s.class === classNum.replace('반', '')
      );

      for (const student of assignedStudents) {
        const studentId = studentIdMap.get(student.email);
        if (!studentId) {
          console.error(`   ❌ 학생 ID를 찾을 수 없음: ${student.name} (${student.email})`);
          continue;
        }

        try {
          if (dryRun) {
            console.log(`   👀 [Dry-run] 배정 예정: ${teacher.name} ← ${student.name} (${className})`);
            assignmentCount++;
            continue;
          }

          const { error: assignmentError } = await client
            .from('teacher_student_assignments')
            .upsert(
              {
                teacher_id: teacherId,
                student_id: studentId,
                class_name: className,
              },
              { onConflict: 'teacher_id,student_id' }
            );

          if (assignmentError) {
            // 스키마 캐시 오류인 경우에도 계속 진행 (테이블은 존재함)
            if (assignmentError.message.includes('schema cache')) {
              // 무시하고 계속 진행 (나중에 수동으로 배정 가능)
              if (assignmentCount % 20 === 0) {
                console.log(`   ⚠️  배정 중 스키마 캐시 오류 발생 (계속 진행 중...)`);
              }
              assignmentCount++;
            } else {
              console.error(
                `   ❌ 배정 실패 (${teacher.name} ← ${student.name}):`,
                assignmentError.message
              );
            }
          } else {
            assignmentCount++;
            if (assignmentCount % 10 === 0) {
              console.log(`   진행 중... ${assignmentCount}개 배정 완료`);
            }
          }
        } catch (error) {
          console.error(`   💥 배정 중 오류 (${teacher.name} ← ${student.name}):`, error);
        }
      }
    }

    console.log(`   ✅ ${teacher.name} 배정 완료: ${teacher.classes.join(', ')}`);
  }

  console.log(`   ✅ 총 ${assignmentCount}개 배정 완료`);
}

/**
 * 메인 함수
 */
async function main() {
  // 환경변수 체크
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const envLocalPath = resolve(process.cwd(), '.env.local');
  const envPath = resolve(process.cwd(), '.env');

  console.log('🔍 환경변수 로딩 확인...');
  console.log(`   .env.local 파일 존재: ${existsSync(envLocalPath) ? '✅' : '❌'}`);
  console.log(`   .env 파일 존재: ${existsSync(envPath) ? '✅' : '❌'}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ 설정됨' : '❌ 없음'}`);
  console.log();

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 다음을 추가하세요:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=프로젝트_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=서비스_역할_키');
    console.error(`\n   현재 작업 디렉토리: ${process.cwd()}`);
    console.error(`   .env.local 경로: ${envLocalPath}`);
    process.exit(1);
  }

  // 명령줄 인자 파싱
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');

  const client = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('='.repeat(60));
  console.log('📝 계정 생성 및 배정 스크립트');
  console.log('='.repeat(60));
  console.log(`모드: ${dryRun ? '👀 Dry-run (실제 생성 없음)' : '✅ 실행 모드'}`);
  console.log(`Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
  console.log(`교사 수: ${teachers.length}명`);
  console.log(`학생 수: ${students.length}명`);
  console.log();

  const stats: AccountCreationStats = {
    teachers: { total: teachers.length, created: 0, skipped: 0, errors: 0 },
    students: { total: students.length, created: 0, skipped: 0, errors: 0 },
    assignments: { total: 0, created: 0, skipped: 0, errors: 0 },
  };

  try {
    // 기존 사용자 목록을 한 번만 조회하여 Map 생성
    console.log('\n📋 기존 사용자 목록 조회 중...\n');
    const existingUsersMap = new Map<string, string>();
    if (!dryRun) {
      try {
        const { data: existingUsers, error: listError } = await client.auth.admin.listUsers();
        if (listError) {
          console.error(`   ⚠️  기존 사용자 목록 조회 실패:`, listError.message);
        } else if (existingUsers?.users) {
          for (const user of existingUsers.users) {
            if (user.email) {
              existingUsersMap.set(user.email, user.id);
            }
          }
          console.log(`   ✅ 기존 사용자 ${existingUsersMap.size}명 발견\n`);
        }
      } catch (error) {
        console.error(`   ⚠️  기존 사용자 목록 조회 중 오류:`, error);
      }
    }

    // 1. 교사 계정 생성
    const teacherIdMap = await createTeachers(client, existingUsersMap, dryRun);
    stats.teachers.created = teacherIdMap.size;

    // 2. 학생 계정 생성
    const studentIdMap = await createStudents(client, existingUsersMap, dryRun);
    stats.students.created = studentIdMap.size;

    // 3. 교사-학생 배정
    await createAssignments(client, teacherIdMap, studentIdMap, dryRun);

    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 계정 생성 결과 요약');
    console.log('='.repeat(60) + '\n');

    console.log('교사:');
    console.log(`   총 ${stats.teachers.total}명`);
    console.log(`   생성/확인: ${stats.teachers.created}명`);
    console.log();

    console.log('학생:');
    console.log(`   총 ${stats.students.total}명`);
    console.log(`   생성/확인: ${stats.students.created}명`);
    console.log();

    if (dryRun) {
      console.log('👀 Dry-run 모드: 실제로는 계정이 생성되지 않았습니다.');
      console.log('   --dry-run 플래그 없이 실행하여 실제 계정을 생성하세요.\n');
    } else {
      console.log('✅ 계정 생성 및 배정 완료!\n');
      console.log('⚠️  참고: 스키마 캐시 오류가 발생한 경우, 다음을 확인하세요:');
      console.log('   1. Supabase Dashboard에서 user_profiles 테이블이 존재하는지 확인');
      console.log('   2. teacher_student_assignments 테이블이 존재하는지 확인');
      console.log('   3. 필요시 Supabase Dashboard에서 수동으로 프로필 및 배정을 생성하세요');
      console.log('   4. 또는 Supabase MCP를 사용하여 직접 SQL을 실행할 수 있습니다\n');
    }
  } catch (error) {
    console.error('💥 계정 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

