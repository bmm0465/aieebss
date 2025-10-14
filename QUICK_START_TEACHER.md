# 🚀 교사 기능 빠른 시작 가이드

이 가이드는 교사 관리 기능을 빠르게 설정하고 테스트하는 방법을 안내합니다.

## ⏱️ 5분 안에 시작하기

### 1단계: 데이터베이스 테이블 생성 (2분)

Supabase Dashboard → SQL Editor에서 다음 SQL을 복사하여 실행:

```sql
-- user_profiles 테이블
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  class_name TEXT,
  student_number TEXT,
  grade_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- teacher_student_assignments 테이블
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  class_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_student_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_student ON teacher_student_assignments(student_id);

-- RLS 정책
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_student_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Teachers can view their students' profiles" ON user_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM teacher_student_assignments WHERE teacher_id = auth.uid() AND student_id = user_profiles.id)
);
CREATE POLICY "Teachers can view their assignments" ON teacher_student_assignments FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can view their students' results" ON test_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM teacher_student_assignments WHERE teacher_id = auth.uid() AND student_id = test_results.user_id)
);
```

### 2단계: 교사 계정 설정 (1분)

#### 방법 A: 기존 계정을 교사로 전환

1. 로그인한 계정의 UUID 확인 (Supabase Dashboard → Authentication → Users)
2. SQL Editor에서 실행:

```sql
-- 본인의 UUID를 넣으세요
INSERT INTO user_profiles (id, full_name, role)
VALUES ('YOUR-USER-UUID', '김선생', 'teacher')
ON CONFLICT (id) DO UPDATE SET role = 'teacher';
```

#### 방법 B: 새 교사 계정 생성

Supabase Dashboard → Authentication → Add user로 교사 계정 생성 후 위 SQL 실행

### 3단계: 테스트용 학생 데이터 생성 (2분)

```sql
-- 1. 학생 계정 3명 생성 (기존 계정 UUID 사용)
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  ('STUDENT1-UUID', '김민수', 'student', '1학년 1반', '1', '1학년'),
  ('STUDENT2-UUID', '이영희', 'student', '1학년 1반', '2', '1학년'),
  ('STUDENT3-UUID', '박철수', 'student', '1학년 2반', '5', '1학년')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  class_name = EXCLUDED.class_name,
  student_number = EXCLUDED.student_number,
  grade_level = EXCLUDED.grade_level;

-- 2. 교사-학생 연결
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES 
  ('YOUR-TEACHER-UUID', 'STUDENT1-UUID', '1학년 1반'),
  ('YOUR-TEACHER-UUID', 'STUDENT2-UUID', '1학년 1반'),
  ('YOUR-TEACHER-UUID', 'STUDENT3-UUID', '1학년 2반')
ON CONFLICT (teacher_id, student_id) DO NOTHING;
```

### 4단계: 테스트 🎉

1. 교사 계정으로 로그인
2. 로비에서 **"🎓 교사 관리 대시보드"** 버튼 클릭
3. 학생 목록 및 통계 확인
4. 학생 카드 클릭하여 상세 결과 페이지 확인

---

## 📝 UUID 확인 방법

### Supabase Dashboard에서:
1. Authentication → Users 메뉴
2. 원하는 사용자의 행 클릭
3. User UID 복사

### 프로그래밍 방식:
```sql
-- 모든 사용자의 이메일과 UUID 조회
SELECT id, email FROM auth.users;
```

---

## 🐛 문제 해결

### "접근 권한 없음" 오류
```sql
-- 교사 role이 올바르게 설정되었는지 확인
SELECT * FROM user_profiles WHERE id = 'YOUR-UUID';

-- role이 'teacher'가 아니면 업데이트
UPDATE user_profiles SET role = 'teacher' WHERE id = 'YOUR-UUID';
```

### 학생 목록이 비어있음
```sql
-- 교사-학생 매핑 확인
SELECT * FROM teacher_student_assignments WHERE teacher_id = 'YOUR-TEACHER-UUID';

-- 없으면 추가
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES ('TEACHER-UUID', 'STUDENT-UUID', '1학년 1반');
```

### RLS 정책 오류
```sql
-- 모든 RLS 정책 확인
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'teacher_student_assignments', 'test_results');

-- 정책이 없으면 1단계 SQL 다시 실행
```

---

## 💡 팁

### 한 번에 여러 학생 추가하기

```sql
-- CSV나 엑셀에서 데이터를 준비한 후
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  ('uuid1', '학생1', 'student', '1반', '1', '3학년'),
  ('uuid2', '학생2', 'student', '1반', '2', '3학년'),
  ('uuid3', '학생3', 'student', '2반', '1', '3학년')
  -- ... 계속 추가
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  class_name = EXCLUDED.class_name;

-- 교사에게 일괄 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
SELECT 'TEACHER-UUID', id, class_name 
FROM user_profiles 
WHERE role = 'student' AND class_name IN ('1반', '2반')
ON CONFLICT DO NOTHING;
```

### 테스트 데이터 초기화

```sql
-- 주의: 테스트 환경에서만 사용!
DELETE FROM teacher_student_assignments;
DELETE FROM user_profiles WHERE role = 'student';
```

---

## 📚 다음 단계

- 자세한 내용: `TEACHER_SETUP_GUIDE.md` 참조
- 전체 프로젝트 구조: `README.md` 참조
- 배포 체크리스트: `DEPLOYMENT_CHECKLIST.md` 참조

즐거운 교육 활동 되세요! 🎓✨

