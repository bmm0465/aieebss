# 교사 관리 시스템 설정 가이드

## 📋 개요

AIEEBSS 프로젝트에 교사 관리 기능이 추가되었습니다. 교사는 담당 학생들의 평가 결과를 한눈에 확인하고 분석할 수 있습니다.

## 🗄️ 데이터베이스 설정

### 1단계: 테이블 생성

Supabase SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- 1. user_profiles 테이블 생성
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student', -- 'student' or 'teacher'
  class_name TEXT, -- 학생의 경우 반 이름
  student_number TEXT, -- 학생 번호
  grade_level TEXT, -- 학년
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. teacher_student_assignments 테이블 생성
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  class_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- 3. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_student_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_student ON teacher_student_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created ON test_results(created_at DESC);
```

### 2단계: RLS (Row Level Security) 정책 설정

```sql
-- user_profiles 테이블 RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필을 볼 수 있음
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필을 수정할 수 있음
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 교사는 담당 학생의 프로필을 볼 수 있음
CREATE POLICY "Teachers can view their students' profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments
      WHERE teacher_id = auth.uid() AND student_id = user_profiles.id
    )
  );

-- teacher_student_assignments 테이블 RLS 활성화
ALTER TABLE teacher_student_assignments ENABLE ROW LEVEL SECURITY;

-- 교사는 자신의 학생 배정을 볼 수 있음
CREATE POLICY "Teachers can view their assignments"
  ON teacher_student_assignments FOR SELECT
  USING (teacher_id = auth.uid());

-- test_results 테이블에 교사 접근 정책 추가
CREATE POLICY "Teachers can view their students' results"
  ON test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments
      WHERE teacher_id = auth.uid() AND student_id = test_results.user_id
    )
  );
```

## 👨‍🏫 교사 계정 설정

### 방법 1: Supabase Dashboard 사용

1. **Supabase Dashboard** → **Authentication** → **Users**로 이동
2. **Add user** 버튼 클릭하여 교사 계정 생성
3. 생성된 사용자의 UUID 복사
4. **SQL Editor**에서 다음 실행:

```sql
-- 교사 프로필 생성
INSERT INTO user_profiles (id, full_name, role)
VALUES ('교사의-UUID', '김선생', 'teacher');
```

### 방법 2: SQL로 직접 생성 (이미 가입한 사용자를 교사로 전환)

```sql
-- 기존 사용자를 교사로 설정
INSERT INTO user_profiles (id, full_name, role)
VALUES ('사용자의-UUID', '김선생', 'teacher')
ON CONFLICT (id) 
DO UPDATE SET role = 'teacher', full_name = '김선생';
```

## 👨‍🎓 학생 프로필 설정

```sql
-- 학생 프로필 생성 (여러 명 동시 생성 가능)
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  ('학생1-UUID', '김학생', 'student', '1학년 1반', '1', '1학년'),
  ('학생2-UUID', '이학생', 'student', '1학년 1반', '2', '1학년'),
  ('학생3-UUID', '박학생', 'student', '1학년 2반', '1', '1학년')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  class_name = EXCLUDED.class_name,
  student_number = EXCLUDED.student_number,
  grade_level = EXCLUDED.grade_level;
```

## 🔗 교사-학생 연결

```sql
-- 학생을 교사에게 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES 
  ('교사-UUID', '학생1-UUID', '1학년 1반'),
  ('교사-UUID', '학생2-UUID', '1학년 1반'),
  ('교사-UUID', '학생3-UUID', '1학년 2반')
ON CONFLICT (teacher_id, student_id) DO NOTHING;
```

## 🎯 사용 방법

### 교사 로그인 후

1. **로비 페이지**에서 **"🎓 교사 관리 대시보드"** 버튼 클릭
2. **대시보드**에서 담당 학생 목록 및 통계 확인
3. 개별 학생 카드를 클릭하여 **상세 결과 페이지** 이동
4. 상세 페이지에서 다음 정보 확인:
   - 테스트별 정확도 통계
   - 시각화 차트 (막대 그래프, 레이더 차트)
   - 평가 세션 기록
   - 종합 평가 코멘트

## 📊 대시보드 기능

### 메인 대시보드 (`/teacher/dashboard`)
- ✅ 담당 학생 수, 반 수, 전체 테스트 수, 평균 정확도 통계
- ✅ 반별 학생 목록 (그룹화)
- ✅ 학생별 기본 정보 및 성적 요약
- ✅ 완료율 및 평균 정확도 색상 표시
- ✅ 학생 카드 클릭 시 상세 페이지 이동

### 학생 상세 페이지 (`/teacher/student/[studentId]`)
- ✅ 학생 기본 정보 (이름, 반, 번호, 학년)
- ✅ 6가지 테스트별 통계 (LNF, PSF, NWF, WRF, ORF, MAZE)
- ✅ 막대 차트: 테스트별 정확도 비교
- ✅ 레이더 차트: 종합 역량 시각화
- ✅ 종합 평가 코멘트 (자동 생성)
- ✅ 평가 세션 기록 (날짜별)

## 🔒 보안

- **RLS 정책**: 교사는 자신이 담당하는 학생의 정보만 볼 수 있습니다.
- **인증 확인**: 모든 페이지에서 교사 권한을 확인합니다.
- **권한 없음 시**: 자동으로 로비 페이지로 리다이렉트됩니다.

## 📝 샘플 데이터 생성 스크립트

테스트를 위해 샘플 데이터를 생성하려면:

```sql
-- 1. 교사 계정 (이미 auth.users에 존재하는 계정의 UUID 사용)
INSERT INTO user_profiles (id, full_name, role)
VALUES ('YOUR-TEACHER-UUID', '김선생님', 'teacher');

-- 2. 학생 계정 3명 (이미 auth.users에 존재하는 계정들)
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  ('STUDENT1-UUID', '김민수', 'student', '1학년 1반', '1', '1학년'),
  ('STUDENT2-UUID', '이영희', 'student', '1학년 1반', '2', '1학년'),
  ('STUDENT3-UUID', '박철수', 'student', '1학년 2반', '5', '1학년');

-- 3. 교사-학생 연결
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES 
  ('YOUR-TEACHER-UUID', 'STUDENT1-UUID', '1학년 1반'),
  ('YOUR-TEACHER-UUID', 'STUDENT2-UUID', '1학년 1반'),
  ('YOUR-TEACHER-UUID', 'STUDENT3-UUID', '1학년 2반');
```

## 🚨 문제 해결

### "접근 권한 없음" 오류
- `user_profiles` 테이블에 해당 사용자의 role이 'teacher'로 설정되어 있는지 확인

### 학생 목록이 비어있음
- `teacher_student_assignments` 테이블에 교사-학생 매핑이 있는지 확인
- RLS 정책이 올바르게 설정되어 있는지 확인

### 학생 이메일이 "이메일 없음"으로 표시됨
- Supabase Auth Admin API 접근 권한 확인
- `SUPABASE_SERVICE_ROLE_KEY` 환경 변수가 올바르게 설정되어 있는지 확인

## 📚 추가 개선 사항 (향후)

- [ ] 학생 직접 추가/삭제 UI
- [ ] 반별 통계 비교
- [ ] 학생 성적 추이 그래프 (시계열)
- [ ] CSV/Excel 내보내기
- [ ] 학생별 개별 코멘트 작성 기능
- [ ] 학부모 계정 및 조회 기능

---

**문의사항이 있으시면 개발팀에 연락해주세요!** 🙂

