-- 기본 테이블 생성 (test_results, user_profiles, teacher_student_assignments)
-- 이 마이그레이션은 데이터 마이그레이션 전에 실행되어야 합니다.

-- 1. test_results 테이블 생성
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  test_type TEXT NOT NULL, -- 'lnf', 'psf', 'nwf', 'wrf', 'orf', 'maze'
  session_id UUID NOT NULL,
  question TEXT,
  correct_answer TEXT,
  user_answer TEXT,
  is_correct BOOLEAN,
  accuracy DECIMAL(5,2),
  audio_url TEXT,
  transcription_results JSONB, -- Multi-API transcription results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. user_profiles 테이블 생성
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

-- 3. teacher_student_assignments 테이블 생성
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  class_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created ON test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_session ON test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_type ON test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_transcription_results ON test_results USING GIN (transcription_results);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_student_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_student ON teacher_student_assignments(student_id);

-- RLS (Row Level Security) 정책 설정

-- test_results 테이블 RLS 활성화
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 결과만 볼 수 있음
CREATE POLICY IF NOT EXISTS "Students can view their own results"
  ON test_results FOR SELECT
  USING (auth.uid() = user_id);

-- 학생은 자신의 결과를 삽입할 수 있음
CREATE POLICY IF NOT EXISTS "Students can insert their own results"
  ON test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- user_profiles 테이블 RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필을 볼 수 있음
CREATE POLICY IF NOT EXISTS "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필을 수정할 수 있음
CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- 사용자는 자신의 프로필을 삽입할 수 있음
CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 교사는 담당 학생의 프로필을 볼 수 있음
CREATE POLICY IF NOT EXISTS "Teachers can view their students' profiles"
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
CREATE POLICY IF NOT EXISTS "Teachers can view their assignments"
  ON teacher_student_assignments FOR SELECT
  USING (teacher_id = auth.uid());

-- 교사는 자신의 학생 배정을 삽입할 수 있음
CREATE POLICY IF NOT EXISTS "Teachers can insert their assignments"
  ON teacher_student_assignments FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- 교사는 담당 학생의 test_results를 볼 수 있음
CREATE POLICY IF NOT EXISTS "Teachers can view their students' results"
  ON test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments
      WHERE teacher_id = auth.uid() AND student_id = test_results.user_id
    )
  );

-- 업데이트 시간 자동 갱신 함수 (이미 존재할 수 있음)
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

-- 주석 추가
COMMENT ON TABLE test_results IS '테스트 결과 저장 테이블';
COMMENT ON COLUMN test_results.transcription_results IS 'Stores transcription results from multiple APIs: {openai: {...}, gemini: {...}, aws: {...}, azure: {...}}';
COMMENT ON TABLE user_profiles IS '사용자 프로필 및 역할 관리';
COMMENT ON TABLE teacher_student_assignments IS '교사-학생 관계 매핑';

