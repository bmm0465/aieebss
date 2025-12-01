-- test_results 테이블 생성
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created ON test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_type ON test_results(test_type);

-- RLS 정책
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 결과만 볼 수 있음
DROP POLICY IF EXISTS "Students can view their own results" ON test_results;
CREATE POLICY "Students can view their own results" 
  ON test_results FOR SELECT 
  USING (auth.uid() = user_id);

-- 학생은 자신의 결과를 삽입할 수 있음
DROP POLICY IF EXISTS "Students can insert their own results" ON test_results;
CREATE POLICY "Students can insert their own results" 
  ON test_results FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 교사는 담당 학생의 test_results를 볼 수 있음
DROP POLICY IF EXISTS "Teachers can view their students' results" ON test_results;
CREATE POLICY "Teachers can view their students' results" 
  ON test_results FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments 
      WHERE teacher_id = auth.uid() AND student_id = test_results.user_id
    )
  );

