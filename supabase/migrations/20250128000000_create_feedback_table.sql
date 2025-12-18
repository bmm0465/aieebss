-- 피드백 저장 테이블 생성
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL, -- 세션 식별자 (예: "2024-01-15_0")
  test_type TEXT NOT NULL, -- 교시 타입 (p1_alphabet, p2_segmental_phoneme, etc.)
  feedback_data JSONB NOT NULL, -- HattieFeedbackResponse 구조
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, session_id, test_type)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_session ON feedbacks(session_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_test_type ON feedbacks(test_type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_session ON feedbacks(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedbacks_updated_at
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_feedbacks_updated_at();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 피드백을 볼 수 있음
DROP POLICY IF EXISTS "Students can view their own feedbacks" ON feedbacks;
CREATE POLICY "Students can view their own feedbacks"
  ON feedbacks FOR SELECT
  USING (auth.uid() = user_id);

-- 교사는 담당 학생의 피드백을 볼 수 있음
DROP POLICY IF EXISTS "Teachers can view their students' feedbacks" ON feedbacks;
CREATE POLICY "Teachers can view their students' feedbacks"
  ON feedbacks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments
      WHERE teacher_id = auth.uid() AND student_id = feedbacks.user_id
    )
  );

-- 시스템은 피드백을 생성/업데이트할 수 있음 (API에서 사용)
-- 학생 본인 또는 교사가 담당 학생의 피드백을 생성/업데이트할 수 있음
DROP POLICY IF EXISTS "Users can insert/update their own feedbacks" ON feedbacks;
CREATE POLICY "Users can insert/update their own feedbacks"
  ON feedbacks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM teacher_student_assignments
      WHERE teacher_id = auth.uid() AND student_id = feedbacks.user_id
    )
  );

DROP POLICY IF EXISTS "Users can update their own feedbacks" ON feedbacks;
CREATE POLICY "Users can update their own feedbacks"
  ON feedbacks FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM teacher_student_assignments
      WHERE teacher_id = auth.uid() AND student_id = feedbacks.user_id
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM teacher_student_assignments
      WHERE teacher_id = auth.uid() AND student_id = feedbacks.user_id
    )
  );
