-- test_results 테이블에 accuracy 컬럼 추가
-- 여러 교시(p2, p3, p5, p6)에서 accuracy를 저장하고 있으므로 컬럼 추가 필요

-- accuracy 컬럼 추가 (DECIMAL(5,2) 타입, NULL 허용)
-- 0.00 ~ 100.00 범위의 정확도 값을 저장
ALTER TABLE test_results 
ADD COLUMN IF NOT EXISTS accuracy DECIMAL(5,2);

-- 컬럼에 주석 추가
COMMENT ON COLUMN test_results.accuracy IS '정확도 (0.00 ~ 100.00). 정답일 경우 100, 오답일 경우 0으로 저장됨.';

