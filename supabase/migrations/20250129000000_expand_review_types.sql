-- transcription_accuracy_reviews 테이블의 review_type 확장
-- 기존 4가지 유형을 14가지로 확장하고 기존 데이터 마이그레이션

-- 1. 기존 CHECK 제약조건 제거
ALTER TABLE transcription_accuracy_reviews 
DROP CONSTRAINT IF EXISTS transcription_accuracy_reviews_review_type_check;

-- 2. review_type을 NULL 허용으로 변경 (유형 3 데이터를 NULL로 변경하기 전에 먼저 실행)
ALTER TABLE transcription_accuracy_reviews 
ALTER COLUMN review_type DROP NOT NULL;

-- 3. 기존 데이터 마이그레이션
-- 유형 1 → 유형 1 (변경 없음)
-- 유형 2 → 유형 4 (정답 발화→부정확한 전사→오답)
UPDATE transcription_accuracy_reviews 
SET review_type = 4 
WHERE review_type = 2;

-- 유형 3 → NULL (수동 재검토 필요)
UPDATE transcription_accuracy_reviews 
SET 
  review_type = NULL,
  notes = COALESCE(
    notes || E'\n\n[마이그레이션] 기존 유형 3 데이터: 재검토 필요 (오답 발화→부정확한 전사→정답/오답)',
    '[마이그레이션] 기존 유형 3 데이터: 재검토 필요 (오답 발화→부정확한 전사→정답/오답)'
  )
WHERE review_type = 3;

-- 유형 4 → 유형 6 (오답 발화→정확한 전사→오답)
UPDATE transcription_accuracy_reviews 
SET review_type = 6 
WHERE review_type = 4;

-- 4. 새로운 CHECK 제약조건 추가 (1-14 또는 NULL 허용)
ALTER TABLE transcription_accuracy_reviews 
ADD CONSTRAINT transcription_accuracy_reviews_review_type_check 
CHECK (review_type IS NULL OR (review_type >= 1 AND review_type <= 14));

-- 5. 컬럼 주석 업데이트
COMMENT ON COLUMN transcription_accuracy_reviews.review_type IS 
'유형 번호: 1=정답 발화→정확한 전사→정답, 2=정답 발화→정확한 전사→오답, 3=정답 발화→부정확한 전사→정답, 4=정답 발화→부정확한 전사→오답, 5=오답 발화→정확한 전사→정답, 6=오답 발화→정확한 전사→오답, 7=오답 발화→부정확한 전사→정답, 8=오답 발화→부정확한 전사→오답, 9=발화 없음→부정확한 전사→정답, 10=발화 없음→부정확한 전사→오답, 11=발화 수정→정확한 전사→정답, 12=발화 수정→정확한 전사→오답, 13=발화 수정→부정확한 전사→정답, 14=발화 수정→부정확한 전사→오답, NULL=재검토 필요';
