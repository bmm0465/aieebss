-- ============================================================
-- AIEEBSS 프로젝트 데이터베이스 완전 설정 SQL
-- Supabase SQL Editor에 복사하여 실행하세요
-- ============================================================

-- 1. user_profiles 테이블 생성
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

-- 2. teacher_student_assignments 테이블 생성
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  class_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- 3. test_results 테이블 생성
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  test_type TEXT NOT NULL,
  correct_answer TEXT,
  asr_gpt TEXT,
  asr_gemini TEXT,
  asr_aws TEXT,
  asr_azure TEXT,
  student_answer TEXT,
  is_correct BOOLEAN,
  error_type TEXT,
  time_taken INTEGER,
  audio_url TEXT
);

-- ============================================================
-- 인덱스 생성
-- ============================================================

-- user_profiles 인덱스
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- teacher_student_assignments 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_student_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_student ON teacher_student_assignments(student_id);

-- test_results 인덱스
CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created ON test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_type ON test_results(test_type);

-- ============================================================
-- RLS (Row Level Security) 활성화
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_student_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS 정책 생성
-- ============================================================

-- user_profiles 정책
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" 
  ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can view their students' profiles" ON user_profiles;
CREATE POLICY "Teachers can view their students' profiles" 
  ON user_profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments 
      WHERE teacher_id = auth.uid() AND student_id = user_profiles.id
    )
  );

-- teacher_student_assignments 정책
DROP POLICY IF EXISTS "Teachers can view their assignments" ON teacher_student_assignments;
CREATE POLICY "Teachers can view their assignments" 
  ON teacher_student_assignments FOR SELECT 
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can insert their assignments" ON teacher_student_assignments;
CREATE POLICY "Teachers can insert their assignments" 
  ON teacher_student_assignments FOR INSERT 
  WITH CHECK (teacher_id = auth.uid());

-- test_results 정책
DROP POLICY IF EXISTS "Students can view their own results" ON test_results;
CREATE POLICY "Students can view their own results" 
  ON test_results FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert their own results" ON test_results;
CREATE POLICY "Students can insert their own results" 
  ON test_results FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can view their students' results" ON test_results;
CREATE POLICY "Teachers can view their students' results" 
  ON test_results FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments 
      WHERE teacher_id = auth.uid() AND student_id = test_results.user_id
    )
  );

-- ============================================================
-- 트리거 및 함수
-- ============================================================

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user_profiles 업데이트 시간 트리거
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 완료
-- ============================================================

