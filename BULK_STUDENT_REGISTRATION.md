# 📋 학생 일괄 등록 가이드

이 가이드는 CSV 파일을 사용하여 여러 학생을 한 번에 등록하는 방법을 안내합니다.

## 📁 CSV 파일 준비

### 1. CSV 파일 형식

`students_example.csv` 파일을 참조하여 다음 형식으로 작성하세요:

```csv
user_id,full_name,email,class_name,student_number,grade_level
abc12345-...,김민수,minsoo.kim@example.com,1학년 1반,1,1학년
abc12345-...,이영희,younghee.lee@example.com,1학년 1반,2,1학년
```

**필수 컬럼:**
- `user_id`: Supabase Auth에서 생성된 사용자 UUID
- `full_name`: 학생 이름
- `email`: 학생 이메일 (로그인용)
- `class_name`: 반 이름 (예: "1학년 1반", "2학년 3반")
- `student_number`: 반 내 학생 번호
- `grade_level`: 학년 (예: "1학년", "2학년")

### 2. Excel에서 CSV 만들기

1. Excel에서 학생 정보 입력
2. **파일** → **다른 이름으로 저장**
3. 파일 형식: **CSV UTF-8 (쉼표로 구분)** 선택
4. 저장

## 🚀 방법 1: Supabase에서 먼저 계정 생성 후 프로필 설정

### 1단계: Supabase에서 학생 계정 생성

**Supabase Dashboard → Authentication → Users → Add user**에서 학생 계정을 생성합니다.

또는 SQL로 생성:

```sql
-- 주의: 이 방법은 이메일 확인이 필요합니다
-- 실제 운영에서는 Dashboard에서 수동으로 생성하는 것을 권장

-- Auth 사용자 생성은 Dashboard에서 하고, 
-- 생성된 UUID를 아래 프로필 등록에 사용하세요
```

### 2단계: CSV 데이터로 프로필 일괄 등록

```sql
-- CSV에서 가져온 데이터로 프로필 등록
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  -- 1학년 1반
  ('abc12345-1234-1234-1234-123456789001', '김민수', 'student', '1학년 1반', '1', '1학년'),
  ('abc12345-1234-1234-1234-123456789002', '이영희', 'student', '1학년 1반', '2', '1학년'),
  ('abc12345-1234-1234-1234-123456789003', '박철수', 'student', '1학년 1반', '3', '1학년'),
  ('abc12345-1234-1234-1234-123456789004', '정지은', 'student', '1학년 1반', '4', '1학년'),
  ('abc12345-1234-1234-1234-123456789005', '최수아', 'student', '1학년 1반', '5', '1학년'),
  
  -- 1학년 2반
  ('abc12345-1234-1234-1234-123456789006', '강민준', 'student', '1학년 2반', '1', '1학년'),
  ('abc12345-1234-1234-1234-123456789007', '윤서연', 'student', '1학년 2반', '2', '1학년'),
  ('abc12345-1234-1234-1234-123456789008', '조현우', 'student', '1학년 2반', '3', '1학년'),
  ('abc12345-1234-1234-1234-123456789009', '한지우', 'student', '1학년 2반', '4', '1학년'),
  ('abc12345-1234-1234-1234-123456789010', '송하은', 'student', '1학년 2반', '5', '1학년'),
  
  -- 2학년 1반
  ('abc12345-1234-1234-1234-123456789011', '임도윤', 'student', '2학년 1반', '1', '2학년'),
  ('abc12345-1234-1234-1234-123456789012', '오서준', 'student', '2학년 1반', '2', '2학년'),
  ('abc12345-1234-1234-1234-123456789013', '장예린', 'student', '2학년 1반', '3', '2학년'),
  ('abc12345-1234-1234-1234-123456789014', '신우진', 'student', '2학년 1반', '4', '2학년'),
  ('abc12345-1234-1234-1234-123456789015', '배지훈', 'student', '2학년 1반', '5', '2학년'),
  
  -- 2학년 2반
  ('abc12345-1234-1234-1234-123456789016', '홍채원', 'student', '2학년 2반', '1', '2학년'),
  ('abc12345-1234-1234-1234-123456789017', '노시우', 'student', '2학년 2반', '2', '2학년'),
  ('abc12345-1234-1234-1234-123456789018', '서은채', 'student', '2학년 2반', '3', '2학년'),
  ('abc12345-1234-1234-1234-123456789019', '권유나', 'student', '2학년 2반', '4', '2학년'),
  ('abc12345-1234-1234-1234-123456789020', '고준서', 'student', '2학년 2반', '5', '2학년')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  class_name = EXCLUDED.class_name,
  student_number = EXCLUDED.student_number,
  grade_level = EXCLUDED.grade_level;
```

### 3단계: 교사에게 학생 일괄 배정

```sql
-- 1학년 1반을 권해경 선생님에게 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES 
  ('14ea1f09-1c7f-43eb-95cf-1b491dd876a4', 'abc12345-1234-1234-1234-123456789001', '1학년 1반'),
  ('14ea1f09-1c7f-43eb-95cf-1b491dd876a4', 'abc12345-1234-1234-1234-123456789002', '1학년 1반'),
  ('14ea1f09-1c7f-43eb-95cf-1b491dd876a4', 'abc12345-1234-1234-1234-123456789003', '1학년 1반'),
  ('14ea1f09-1c7f-43eb-95cf-1b491dd876a4', 'abc12345-1234-1234-1234-123456789004', '1학년 1반'),
  ('14ea1f09-1c7f-43eb-95cf-1b491dd876a4', 'abc12345-1234-1234-1234-123456789005', '1학년 1반')
ON CONFLICT (teacher_id, student_id) DO NOTHING;

-- 1학년 2반을 이수민 선생님에게 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES 
  ('fe2e88ce-bc53-4c37-825b-4bff261ef1a9', 'abc12345-1234-1234-1234-123456789006', '1학년 2반'),
  ('fe2e88ce-bc53-4c37-825b-4bff261ef1a9', 'abc12345-1234-1234-1234-123456789007', '1학년 2반'),
  ('fe2e88ce-bc53-4c37-825b-4bff261ef1a9', 'abc12345-1234-1234-1234-123456789008', '1학년 2반'),
  ('fe2e88ce-bc53-4c37-825b-4bff261ef1a9', 'abc12345-1234-1234-1234-123456789009', '1학년 2반'),
  ('fe2e88ce-bc53-4c37-825b-4bff261ef1a9', 'abc12345-1234-1234-1234-123456789010', '1학년 2반')
ON CONFLICT (teacher_id, student_id) DO NOTHING;

-- 2학년 반들을 이수지 선생님에게 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
SELECT '3c9db811-8b08-48bc-8f0e-d515fa045d51', id, class_name
FROM user_profiles 
WHERE role = 'student' 
  AND (class_name = '2학년 1반' OR class_name = '2학년 2반')
ON CONFLICT (teacher_id, student_id) DO NOTHING;
```

## 🔧 방법 2: SQL 함수를 사용한 자동화 (고급)

### 반별 학생 자동 배정 함수

```sql
-- 특정 반의 모든 학생을 교사에게 자동 배정하는 함수
CREATE OR REPLACE FUNCTION assign_class_to_teacher(
  p_teacher_id UUID,
  p_class_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
  SELECT p_teacher_id, id, class_name
  FROM user_profiles
  WHERE role = 'student' AND class_name = p_class_name
  ON CONFLICT (teacher_id, student_id) DO NOTHING;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- 사용 예시
SELECT assign_class_to_teacher(
  '14ea1f09-1c7f-43eb-95cf-1b491dd876a4',  -- 권해경 선생님 UUID
  '1학년 1반'
);
```

## 📊 Excel 템플릿 생성 방법

### 1. 엑셀 템플릿

| user_id | full_name | email | class_name | student_number | grade_level |
|---------|-----------|-------|------------|----------------|-------------|
| [UUID] | 김민수 | student1@school.com | 1학년 1반 | 1 | 1학년 |
| [UUID] | 이영희 | student2@school.com | 1학년 1반 | 2 | 1학년 |

### 2. UUID 일괄 생성 방법

**옵션 A: Supabase에서 먼저 계정 생성**
1. Supabase Dashboard → Authentication → Users
2. 학생 수만큼 계정 생성 (이메일, 임시 비밀번호)
3. 생성된 UUID를 복사하여 Excel에 붙여넣기

**옵션 B: 온라인 UUID 생성기 사용**
- https://www.uuidgenerator.net/
- 필요한 개수만큼 UUID 생성
- 단, 이 경우 Supabase Auth에 계정을 먼저 생성해야 함

## 🔍 검증 쿼리

### 등록된 학생 확인

```sql
-- 모든 학생 목록 조회
SELECT 
  up.id,
  up.full_name,
  up.class_name,
  up.student_number,
  up.grade_level,
  au.email
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE up.role = 'student'
ORDER BY up.class_name, up.student_number;
```

### 교사-학생 매핑 확인

```sql
-- 교사별 담당 학생 수 확인
SELECT 
  t.full_name AS teacher_name,
  tsa.class_name,
  COUNT(tsa.student_id) AS student_count
FROM teacher_student_assignments tsa
JOIN user_profiles t ON tsa.teacher_id = t.id
GROUP BY t.full_name, tsa.class_name
ORDER BY t.full_name, tsa.class_name;
```

### 배정되지 않은 학생 찾기

```sql
-- 교사에게 배정되지 않은 학생 목록
SELECT 
  up.full_name,
  up.class_name,
  up.student_number
FROM user_profiles up
WHERE up.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM teacher_student_assignments tsa
    WHERE tsa.student_id = up.id
  )
ORDER BY up.class_name, up.student_number;
```

## 💡 실전 팁

### 1. 임시 비밀번호 설정

Supabase에서 계정 생성 시 임시 비밀번호를 설정하고, 학생들에게 첫 로그인 후 비밀번호 변경을 안내하세요.

### 2. 반별 일괄 등록 스크립트

```sql
-- 한 반 전체를 한 번에 등록하는 템플릿
DO $$
DECLARE
  class_name TEXT := '3학년 1반';
  grade_level TEXT := '3학년';
  teacher_uuid UUID := 'YOUR-TEACHER-UUID';
  student_data RECORD;
BEGIN
  -- 학생 프로필 생성
  INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
  VALUES 
    ('uuid-1', '학생1', 'student', class_name, '1', grade_level),
    ('uuid-2', '학생2', 'student', class_name, '2', grade_level),
    ('uuid-3', '학생3', 'student', class_name, '3', grade_level)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    class_name = EXCLUDED.class_name;
  
  -- 교사에게 일괄 배정
  INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
  SELECT teacher_uuid, id, class_name
  FROM user_profiles
  WHERE class_name = class_name AND role = 'student'
  ON CONFLICT DO NOTHING;
END $$;
```

### 3. 학생 정보 수정

```sql
-- 특정 학생의 정보 수정
UPDATE user_profiles
SET 
  full_name = '새이름',
  class_name = '2학년 3반',
  student_number = '15'
WHERE id = 'STUDENT-UUID';
```

## 📚 관련 문서

- `students_example.csv`: 예시 CSV 파일
- `QUICK_START_TEACHER.md`: 교사 기능 빠른 시작
- `TEACHER_SETUP_GUIDE.md`: 상세 설정 가이드

---

**참고:** 실제 운영 환경에서는 개인정보 보호를 위해 CSV 파일을 안전하게 관리하고, 작업 후 즉시 삭제하세요. 🔐

