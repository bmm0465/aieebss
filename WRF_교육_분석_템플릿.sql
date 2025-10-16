-- ============================================
-- WRF (Word Reading Fluency) 교육 분석 SQL 템플릿
-- ============================================
-- WRF는 Sight Words 자동 인식 능력을 평가합니다
-- 목표: 디코딩 없이 즉각적으로 단어를 읽는 능력
-- ============================================

-- ============================================
-- 1. 전체 현황 분석
-- ============================================

-- 1-1. 반별 WRF 성적 요약
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  COUNT(*) AS 총_시도_단어,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 정답_총계,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 평균_정답률,
  ROUND(MIN(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 최저,
  ROUND(MAX(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 최고
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
GROUP BY up.class_name
ORDER BY 평균_정답률 DESC;

-- 1-2. 가장 어려운 Sight Words TOP 20
SELECT 
  question_word AS 단어,
  LENGTH(question_word) AS 길이,
  COUNT(*) AS 시도_수,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 정답_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY question_word
ORDER BY 정답률 ASC
LIMIT 20;

-- 1-3. 가장 쉬운 단어 TOP 20
SELECT 
  question_word AS 단어,
  LENGTH(question_word) AS 길이,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY question_word
ORDER BY 정답률 DESC
LIMIT 20;

-- ============================================
-- 2. 빈도별 분석
-- ============================================

-- 2-1. 빈도 등급별 정답률
SELECT 
  CASE 
    WHEN question_word IN ('no', 'do', 'he', 'go', 'it', 'to', 'me', 'up', 
                          'the', 'she', 'yes', 'you', 'not', 'who', 'how') 
      THEN '1. 초고빈도 (1-3글자)'
    WHEN question_word IN ('this', 'that', 'like', 'look', 'good', 'come', 'have', 
                          'said', 'love', 'hat', 'cat', 'dad', 'sit', 'mom', 
                          'big', 'dog', 'pig', 'six', 'can', 'two', 'one', 
                          'pen', 'leg', 'pan', 'car', 'zoo', 'red', 'ten', 
                          'too', 'what', 'here', 'down', 'open', 'much', 'nice') 
      THEN '2. 고빈도 (3-4글자)'
    WHEN question_word IN ('tall', 'small', 'hello', 'three', 'four', 'five', 
                          'door', 'book', 'jump', 'swim', 'great', 'green', 
                          'eight', 'stand', 'blue', 'lion', 'nine', 'white', 
                          'many', 'apple', 'seven', 'pizza', 'sorry', 'color', 'close') 
      THEN '3. 중빈도 (4-5글자)'
    ELSE '4. 저빈도/복합 (5-6글자)'
  END AS 빈도_등급,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY 빈도_등급
ORDER BY 빈도_등급;

-- 2-2. 단어 길이별 정답률
SELECT 
  LENGTH(question_word) AS 단어_길이,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY LENGTH(question_word)
ORDER BY 단어_길이;

-- ============================================
-- 3. 학생별 분석
-- ============================================

-- 3-1. 학생별 WRF 종합 성적
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.student_number AS 번호,
  COUNT(*) AS 시도_단어,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 맞춘_단어,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  RANK() OVER (ORDER BY AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) DESC) AS 전체_순위,
  RANK() OVER (
    PARTITION BY up.class_name 
    ORDER BY AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) DESC
  ) AS 반내_순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
GROUP BY tr.user_id, up.full_name, up.class_name, up.student_number
ORDER BY 정답률 DESC;

-- 3-2. 특정 학생의 약점 단어
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  tr.question_word AS 단어,
  LENGTH(tr.question_word) AS 길이,
  COUNT(*) AS 틀린_횟수,
  CASE 
    WHEN tr.question_word IN ('no', 'do', 'he', 'go', 'it', 'to', 'me', 'up', 'the', 'she', 'yes', 'you', 'not', 'who', 'how') 
      THEN '초고빈도'
    WHEN tr.question_word IN ('this', 'that', 'like', 'look', 'good', 'come', 'have', 'said', 'love', 
                             'hat', 'cat', 'dad', 'sit', 'mom', 'big', 'dog', 'pig', 'six', 'can', 
                             'two', 'one', 'pen', 'leg', 'pan', 'car', 'zoo', 'red', 'ten', 'too', 
                             'what', 'here', 'down', 'open', 'much', 'nice') 
      THEN '고빈도'
    WHEN LENGTH(tr.question_word) <= 5 THEN '중빈도'
    ELSE '저빈도'
  END AS 빈도,
  CASE 
    WHEN tr.question_word IN ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten') THEN '숫자'
    WHEN tr.question_word IN ('red', 'blue', 'green', 'white') THEN '색깔'
    WHEN tr.question_word IN ('cat', 'dog', 'pig', 'lion', 'zoo') THEN '동물'
    WHEN tr.question_word IN ('sit', 'jump', 'swim', 'dance', 'stand', 'look', 'open', 'close') THEN '동작'
    ELSE '기타'
  END AS 주제
FROM test_results tr
WHERE tr.test_type = 'WRF'
  AND tr.user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
  AND tr.is_correct = FALSE
GROUP BY tr.question_word
ORDER BY 틀린_횟수 DESC
LIMIT 20;

-- 3-3. 특정 학생의 빈도별 숙지도
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  CASE 
    WHEN question_word IN ('no', 'do', 'he', 'go', 'it', 'to', 'me', 'up', 'the', 'she', 'yes', 'you', 'not', 'who', 'how') 
      THEN '초고빈도'
    WHEN question_word IN ('this', 'that', 'like', 'look', 'good', 'come', 'have', 'said', 'love', 
                           'hat', 'cat', 'dad', 'sit', 'mom', 'big', 'dog', 'pig', 'six', 'can', 
                           'two', 'one', 'pen', 'leg', 'pan', 'car', 'zoo', 'red', 'ten', 'too', 
                           'what', 'here', 'down', 'open', 'much', 'nice') 
      THEN '고빈도'
    WHEN LENGTH(question_word) <= 5 THEN '중빈도'
    ELSE '저빈도'
  END AS 빈도_등급,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY 빈도_등급
ORDER BY 정답률 DESC;

-- ============================================
-- 4. 주제별 어휘 분석
-- ============================================

-- 4-1. 주제별 정답률
SELECT 
  CASE 
    WHEN question_word IN ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten') 
      THEN '숫자'
    WHEN question_word IN ('red', 'blue', 'green', 'white') 
      THEN '색깔'
    WHEN question_word IN ('cat', 'dog', 'pig', 'lion', 'zoo') 
      THEN '동물'
    WHEN question_word IN ('sit', 'jump', 'swim', 'dance', 'stand', 'look', 'open', 'close') 
      THEN '동작 (동사)'
    WHEN question_word IN ('dad', 'mom', 'sister', 'he', 'she', 'you', 'me', 'who') 
      THEN '사람/가족'
    WHEN question_word IN ('hat', 'pen', 'door', 'book', 'ball', 'car', 'pencil', 'eraser', 'apple', 'pizza') 
      THEN '일상 물건'
    ELSE '기능어/기타'
  END AS 주제,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY 주제
ORDER BY 정답률 ASC;

-- 4-2. 특정 반의 주제별 약점 어휘
-- ⚠️ 반 이름을 실제 반 이름으로 변경하세요
SELECT 
  CASE 
    WHEN tr.question_word IN ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten') THEN '숫자'
    WHEN tr.question_word IN ('red', 'blue', 'green', 'white') THEN '색깔'
    WHEN tr.question_word IN ('cat', 'dog', 'pig', 'lion', 'zoo') THEN '동물'
    WHEN tr.question_word IN ('sit', 'jump', 'swim', 'dance', 'stand') THEN '동작'
    ELSE '기타'
  END AS 주제,
  tr.question_word AS 단어,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 반평균
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
  AND up.class_name = '나루초 3학년 다솜반'  -- 여기에 반 이름 입력
GROUP BY 주제, tr.question_word
HAVING AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) < 70
ORDER BY 반평균 ASC;

-- ============================================
-- 5. 불규칙 철자 단어 분석
-- ============================================

-- 5-1. 불규칙 철자 단어 vs 규칙적 단어
SELECT 
  CASE 
    -- 불규칙 철자 (파닉스로 읽기 어려움)
    WHEN question_word IN ('the', 'said', 'have', 'love', 'come', 'one', 'two', 
                          'what', 'who', 'color', 'bye', 'okay') 
      THEN '불규칙 철자'
    ELSE '규칙적 철자'
  END AS 철자_유형,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY 철자_유형
ORDER BY 정답률 DESC;

-- 5-2. 불규칙 철자 단어 개별 분석
SELECT 
  question_word AS 불규칙_단어,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  '시각적 암기 필요' AS 학습방법
FROM test_results
WHERE test_type = 'WRF'
  AND question_word IN ('the', 'said', 'have', 'love', 'come', 'one', 'two', 
                        'what', 'who', 'color', 'bye', 'okay')
GROUP BY question_word
ORDER BY 정답률 ASC;

-- ============================================
-- 6. 수준별 그룹핑
-- ============================================

-- 6-1. WRF 능력별 학생 분류
WITH student_levels AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
    COUNT(*) AS 시도_수,
    ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
    CASE 
      WHEN AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) >= 90 THEN '상위 (90%+)'
      WHEN AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) >= 75 THEN '중상위 (75-89%)'
      WHEN AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) >= 60 THEN '중하위 (60-74%)'
      ELSE '하위 (60% 미만)'
    END AS 수준
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'WRF'
  GROUP BY tr.user_id, up.full_name, up.class_name
)
SELECT 
  class_name AS 반,
  수준,
  COUNT(*) AS 학생_수,
  ROUND(AVG(정답률), 1) AS 평균_정답률,
  STRING_AGG(full_name, ', ' ORDER BY 정답률 DESC) AS 학생_명단
FROM student_levels
GROUP BY class_name, 수준
ORDER BY class_name, 
  CASE 수준
    WHEN '상위 (90%+)' THEN 1
    WHEN '중상위 (75-89%)' THEN 2
    WHEN '중하위 (60-74%)' THEN 3
    ELSE 4
  END;

-- 6-2. 집중 지도가 필요한 학생 (60% 미만)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.student_number AS 번호,
  COUNT(*) AS 시도_단어,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 맞춘_단어,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  -- 가장 많이 틀린 단어 3개
  STRING_AGG(
    CASE WHEN NOT tr.is_correct THEN tr.question_word END, 
    ', '
  ) FILTER (WHERE NOT tr.is_correct) AS 약점_단어
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
GROUP BY tr.user_id, up.full_name, up.class_name, up.student_number
HAVING AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) < 60
ORDER BY 정답률 ASC;

-- ============================================
-- 7. 개인별 맞춤 학습 추천
-- ============================================

-- 7-1. 특정 학생에게 추천할 플래시카드 단어
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
WITH student_weak_words AS (
  SELECT 
    question_word,
    COUNT(*) AS 틀린_횟수,
    CASE 
      WHEN question_word IN ('no', 'do', 'he', 'go', 'it', 'to', 'me', 'up', 'the', 'she', 'yes', 'you', 'not', 'who', 'how') 
        THEN 1  -- 초고빈도 우선
      WHEN LENGTH(question_word) <= 4 THEN 2  -- 짧은 단어 우선
      ELSE 3
    END AS 우선순위
  FROM test_results
  WHERE test_type = 'WRF'
    AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
    AND is_correct = FALSE
  GROUP BY question_word
  ORDER BY 우선순위, 틀린_횟수 DESC
  LIMIT 15
)
SELECT 
  '추천 플래시카드 단어 (우선순위순):' AS 안내,
  STRING_AGG(question_word, ', ' ORDER BY 우선순위, 틀린_횟수 DESC) AS 단어_목록
FROM student_weak_words;

-- ============================================
-- 8. 성장 추적
-- ============================================

-- 8-1. 특정 학생의 평가일별 성적 변화
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  COUNT(*) AS 시도_단어,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 맞춘_단어,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  -- 전 평가 대비 향상도
  ROUND(
    AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END) - 
    LAG(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END)) 
    OVER (ORDER BY DATE(created_at)), 
    1
  ) AS 향상도,
  -- 새로 맞춘 단어 수
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) - 
  LAG(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)) 
  OVER (ORDER BY DATE(created_at)) AS 증가한_단어수
FROM test_results
WHERE test_type = 'WRF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY DATE(created_at)
ORDER BY 평가일;

-- 8-2. 특정 단어의 학습 효과 검증
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  question_word AS 단어,
  BOOL_OR(is_correct) AS 성공여부,
  COUNT(*) AS 시도_횟수
FROM test_results
WHERE test_type = 'WRF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
  AND question_word IN ('pencil', 'sister', 'eraser')  -- 학습한 단어들
GROUP BY DATE(created_at), question_word
ORDER BY 평가일, 단어;

-- ============================================
-- 9. 반별 약점 어휘
-- ============================================

-- 9-1. 반 전체가 어려워하는 단어
-- ⚠️ 반 이름을 실제 반 이름으로 변경하세요
SELECT 
  tr.question_word AS 단어,
  LENGTH(tr.question_word) AS 길이,
  COUNT(DISTINCT tr.user_id) AS 시도한_학생_수,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 반평균,
  CASE 
    WHEN tr.question_word IN ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten') THEN '숫자'
    WHEN tr.question_word IN ('red', 'blue', 'green', 'white') THEN '색깔'
    ELSE '기타'
  END AS 주제
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
  AND up.class_name = '나루초 3학년 다솜반'  -- 여기에 반 이름 입력
GROUP BY tr.question_word
HAVING AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) < 70
ORDER BY 반평균 ASC;

-- ============================================
-- 10. 진도율 분석 (WCPM 유사)
-- ============================================

-- 10-1. 학생별 60초 내 완료 단어 수
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  DATE(tr.created_at) AS 평가일,
  COUNT(*) AS 완료_단어수,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 정확_단어수,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정확도,
  -- WCPM (Words Correct Per Minute) 유사 지표
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS WCPM_점수
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
GROUP BY tr.user_id, up.full_name, up.class_name, DATE(tr.created_at)
ORDER BY WCPM_점수 DESC;

-- 10-2. 반별 평균 단어 완료 수
SELECT 
  up.class_name AS 반,
  ROUND(AVG(단어수), 1) AS 평균_완료_단어,
  ROUND(MIN(단어수), 0) AS 최소,
  ROUND(MAX(단어수), 0) AS 최대
FROM (
  SELECT 
    up.class_name,
    tr.user_id,
    DATE(tr.created_at) AS 평가일,
    COUNT(*) AS 단어수
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'WRF'
  GROUP BY up.class_name, tr.user_id, DATE(tr.created_at)
) AS subquery
GROUP BY class_name
ORDER BY 평균_완료_단어 DESC;

-- ============================================
-- 사용 가이드
-- ============================================

/*
🎯 빠른 분석 순서:

1. 반별 현황 확인
   → 1-1번 쿼리

2. 어려운 단어 파악
   → 1-2번 쿼리

3. 빈도별 숙지도 확인
   → 2-1번 쿼리

4. 주제별 어휘 확인
   → 4-1번 쿼리

5. 그룹 편성
   → 6-1번 쿼리

6. 개인별 플래시카드
   → 7-1번 쿼리 (UUID 변경)

7. 성장 추적
   → 8-1번 쿼리 (UUID 변경)

📊 CSV 내보내기:
   Results → Download CSV → Excel
*/

-- ============================================
-- 교육적 해석 가이드
-- ============================================

/*
🎓 결과 해석:

1. 초고빈도 < 90%
   → 기본 sight words 집중 학습
   → 매일 플래시카드 10분

2. 고빈도 < 75%
   → 어휘 노출 부족
   → 리더스 책 읽기 시작

3. 주제별 불균형 (예: 숫자는 높지만 동작은 낮음)
   → 약한 주제 집중 학습
   → 관련 활동 추가

4. 불규칙 철자 < 60%
   → 파닉스로 읽으려는 경향
   → 시각적 암기 전략 필요

5. 완료 단어 < 20개 (60초 기준)
   → 읽기 속도 느림
   → 자동성 부족
   → 반복 연습 필요

6. 정확도 높지만 속도 느림
   → 자동 인식 부족
   → 타이머로 속도 연습

📌 DIBELS 기준:
   - 3학년: 40-60 WCPM
   - 정확도: 95% 이상
*/

