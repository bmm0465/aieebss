-- transcription_accuracy_reviews 테이블 생성
-- 교사가 음성 인식 정확도를 점검하기 위해 테스트 결과를 유형별로 분류한 정보를 저장

CREATE TABLE IF NOT EXISTS transcription_accuracy_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_result_id BIGINT REFERENCES test_results(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  review_type INTEGER NOT NULL CHECK (review_type IN (1, 2, 3, 4)),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(test_result_id, teacher_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_transcription_reviews_test_result 
  ON transcription_accuracy_reviews(test_result_id);
CREATE INDEX IF NOT EXISTS idx_transcription_reviews_teacher 
  ON transcription_accuracy_reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_transcription_reviews_type 
  ON transcription_accuracy_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_transcription_reviews_created 
  ON transcription_accuracy_reviews(created_at DESC);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_transcription_accuracy_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_transcription_accuracy_reviews_updated_at 
  ON transcription_accuracy_reviews;
CREATE TRIGGER trigger_update_transcription_accuracy_reviews_updated_at
  BEFORE UPDATE ON transcription_accuracy_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_transcription_accuracy_reviews_updated_at();

-- RLS 활성화
ALTER TABLE transcription_accuracy_reviews ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 교사는 자신이 작성한 리뷰만 조회 가능
DROP POLICY IF EXISTS "Teachers can view their own reviews" 
  ON transcription_accuracy_reviews;
CREATE POLICY "Teachers can view their own reviews" 
  ON transcription_accuracy_reviews FOR SELECT 
  USING (auth.uid() = teacher_id);

-- RLS 정책: 교사는 자신의 리뷰만 삽입 가능
DROP POLICY IF EXISTS "Teachers can insert their own reviews" 
  ON transcription_accuracy_reviews;
CREATE POLICY "Teachers can insert their own reviews" 
  ON transcription_accuracy_reviews FOR INSERT 
  WITH CHECK (auth.uid() = teacher_id);

-- RLS 정책: 교사는 자신의 리뷰만 수정 가능
DROP POLICY IF EXISTS "Teachers can update their own reviews" 
  ON transcription_accuracy_reviews;
CREATE POLICY "Teachers can update their own reviews" 
  ON transcription_accuracy_reviews FOR UPDATE 
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- RLS 정책: 교사는 자신의 리뷰만 삭제 가능
DROP POLICY IF EXISTS "Teachers can delete their own reviews" 
  ON transcription_accuracy_reviews;
CREATE POLICY "Teachers can delete their own reviews" 
  ON transcription_accuracy_reviews FOR DELETE 
  USING (auth.uid() = teacher_id);

-- 테이블 및 컬럼에 주석 추가
COMMENT ON TABLE transcription_accuracy_reviews IS '교사가 음성 인식 정확도를 점검하기 위해 테스트 결과를 유형별로 분류한 정보';
COMMENT ON COLUMN transcription_accuracy_reviews.test_result_id IS '점검 대상 테스트 결과 ID';
COMMENT ON COLUMN transcription_accuracy_reviews.teacher_id IS '점검한 교사 ID';
COMMENT ON COLUMN transcription_accuracy_reviews.review_type IS '유형 번호: 1=정답 발화→정확한 전사→정답, 2=정답 발화→부정확한 전사→오답, 3=오답 발화→부정확한 전사→정답/오답, 4=오답 발화→정확한 전사→오답';
COMMENT ON COLUMN transcription_accuracy_reviews.notes IS '추가 메모';
