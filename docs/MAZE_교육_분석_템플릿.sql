-- ============================================
-- MAZE (Maze Comprehension) 교육 분석 SQL 템플릿
-- ============================================
-- MAZE는 읽기 이해력과 문맥 파악 능력을 평가합니다
-- 점수 = 정답 수 - 오답 수
-- ============================================

-- ============================================
-- 1. 전체 현황 분석
-- ============================================

-- 1-1. 반별 MAZE 성적 요약
SELECT 
  up.class_name AS 반,
  up.grade_level AS 학년,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  -- 평균 정답률
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 평균_정답률,
  -- 평균 MAZE 점수 계산
  ROUND(AVG(
    (SELECT COUNT(*) FROM test_results tr2 
     WHERE tr2.user_id = tr.user_id AND tr2.test_type = 'MAZE' AND tr2.is_correct = TRUE) -
    (SELECT COUNT(*) FROM test_results tr3 
     WHERE tr3.user_id = tr.user_id AND tr3.test_type = 'MAZE' AND tr3.is_correct = FALSE)
  ), 1) AS 평균_MAZE점수
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'MAZE'
GROUP BY up.class_name, up.grade_level
ORDER BY 평균_정답률 DESC;

-- 1-2. 가장 어려운 문항 TOP 10
SELECT 
  question AS 문항번호,
  COUNT(*) AS 총_시도,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 정답_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'MAZE'
GROUP BY question
ORDER BY 정답률 ASC
LIMIT 10;

-- 1-3. 가장 쉬운 문항 TOP 10
SELECT 
  question AS 문항번호,
  COUNT(*) AS 총_시도,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'MAZE'
GROUP BY question
ORDER BY 정답률 DESC
LIMIT 10;

-- ============================================
-- 2. 학생별 분석
-- ============================================

-- 2-1. 학생별 MAZE 종합 성적
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.student_number AS 번호,
  COUNT(*) AS 총_문항,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 정답,
  SUM(CASE WHEN NOT tr.is_correct THEN 1 ELSE 0 END) AS 오답,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) - 
  SUM(CASE WHEN NOT tr.is_correct THEN 1 ELSE 0 END) AS MAZE_점수,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  RANK() OVER (ORDER BY AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) DESC) AS 전체_순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'MAZE'
GROUP BY tr.user_id, up.full_name, up.class_name, up.student_number
ORDER BY 정답률 DESC;

-- 2-2. 특정 학생의 오답 문항 분석
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  tr.question AS 문항,
  tr.student_answer AS 학생_선택,
  '정답은 별도 확인 필요' AS 참고
FROM test_results tr
WHERE tr.test_type = 'MAZE'
  AND tr.user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
  AND tr.is_correct = FALSE
ORDER BY tr.question;

-- ============================================
-- 3. 오답 패턴 분석
-- ============================================

-- 3-1. 문항별 오답 선택 분포
SELECT 
  question AS 문항,
  student_answer AS 선택된_오답,
  COUNT(*) AS 선택_횟수,
  ROUND(COUNT(*)::FLOAT * 100.0 / 
    (SELECT COUNT(*) FROM test_results 
     WHERE test_type = 'MAZE' AND question = tr.question), 1) AS 선택_비율
FROM test_results tr
WHERE test_type = 'MAZE'
  AND is_correct = FALSE
GROUP BY question, student_answer
ORDER BY question, 선택_횟수 DESC;

-- 3-2. 가장 매력적인 오답 (distractors)
SELECT 
  question AS 문항,
  student_answer AS 매력적_오답,
  COUNT(*) AS 선택된_횟수,
  '이 오답을 많이 선택 = 효과적인 함정' AS 해석
FROM test_results
WHERE test_type = 'MAZE'
  AND is_correct = FALSE
GROUP BY question, student_answer
HAVING COUNT(*) >= 5
ORDER BY 선택된_횟수 DESC
LIMIT 15;

-- ============================================
-- 4. 수준별 그룹핑
-- ============================================

-- 4-1. MAZE 능력별 학생 분류
WITH student_levels AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
    COUNT(*) AS 총_문항,
    ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
    SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) - 
    SUM(CASE WHEN NOT tr.is_correct THEN 1 ELSE 0 END) AS MAZE_점수,
    CASE 
      WHEN AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) >= 85 THEN '상위 (85%+)'
      WHEN AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) >= 70 THEN '중상위 (70-84%)'
      WHEN AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) >= 55 THEN '중하위 (55-69%)'
      ELSE '하위 (55% 미만)'
    END AS 수준
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'MAZE'
  GROUP BY tr.user_id, up.full_name, up.class_name
)
SELECT 
  class_name AS 반,
  수준,
  COUNT(*) AS 학생_수,
  ROUND(AVG(정답률), 1) AS 평균_정답률,
  ROUND(AVG(MAZE_점수), 1) AS 평균_MAZE점수,
  STRING_AGG(full_name, ', ' ORDER BY 정답률 DESC) AS 학생_명단
FROM student_levels
GROUP BY class_name, 수준
ORDER BY class_name, 
  CASE 수준
    WHEN '상위 (85%+)' THEN 1
    WHEN '중상위 (70-84%)' THEN 2
    WHEN '중하위 (55-69%)' THEN 3
    ELSE 4
  END;

-- ============================================
-- 5. 성장 추적
-- ============================================

-- 5-1. 특정 학생의 MAZE 성장 추이
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  COUNT(*) AS 총_문항,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 정답,
  SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) AS 오답,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) - 
  SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) AS MAZE_점수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  -- 전 평가 대비 향상도
  ROUND(
    AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END) - 
    LAG(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END)) 
    OVER (ORDER BY DATE(created_at)), 
    1
  ) AS 향상도
FROM test_results
WHERE test_type = 'MAZE'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY DATE(created_at)
ORDER BY 평가일;

-- ============================================
-- 6. 통합 분석 (ORF + MAZE)
-- ============================================

-- 6-1. 유창성과 독해력의 관계
WITH integrated_scores AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
    MAX(CASE WHEN tr.test_type = 'ORF' THEN tr.wcpm END) AS ORF_WCPM,
    MAX(CASE WHEN tr.test_type = 'ORF' THEN tr.accuracy END) AS ORF_정확도,
    AVG(CASE WHEN tr.test_type = 'MAZE' AND tr.is_correct THEN 100.0 ELSE 0 END) AS MAZE_정답률
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type IN ('ORF', 'MAZE')
  GROUP BY tr.user_id, up.full_name, up.class_name
  HAVING MAX(CASE WHEN tr.test_type = 'ORF' THEN tr.wcpm END) IS NOT NULL
    AND AVG(CASE WHEN tr.test_type = 'MAZE' AND tr.is_correct THEN 100.0 ELSE 0 END) IS NOT NULL
)
SELECT 
  full_name AS 학생이름,
  class_name AS 반,
  ROUND(ORF_WCPM, 1) AS ORF_WCPM,
  ROUND(MAZE_정답률, 1) AS MAZE_정답률,
  CASE 
    WHEN ORF_WCPM >= 80 AND MAZE_정답률 >= 80 THEN '✅ 우수: 빠르고 이해도 높음'
    WHEN ORF_WCPM >= 80 AND MAZE_정답률 < 80 THEN '⚠️ 속도형: 빠르지만 이해 부족'
    WHEN ORF_WCPM < 80 AND MAZE_정답률 >= 80 THEN '📚 정확형: 느리지만 이해 높음'
    ELSE '🔴 개선필요: 둘 다 낮음'
  END AS 읽기_프로필,
  CASE 
    WHEN ORF_WCPM >= 80 AND MAZE_정답률 < 80 THEN '천천히 의미 파악하며 읽기'
    WHEN ORF_WCPM < 80 AND MAZE_정답률 >= 80 THEN '반복 읽기로 속도 향상'
    WHEN ORF_WCPM < 80 AND MAZE_정답률 < 80 THEN '기초 어휘 및 문법 복습'
    ELSE '심화 독해 활동'
  END AS 권장_학습
FROM integrated_scores
ORDER BY MAZE_정답률 DESC;

-- 6-2. WRF (어휘) + MAZE (독해) 상관관계
WITH vocab_comp AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
    AVG(CASE WHEN tr.test_type = 'WRF' AND tr.is_correct THEN 100.0 ELSE 0 END) AS WRF_점수,
    AVG(CASE WHEN tr.test_type = 'MAZE' AND tr.is_correct THEN 100.0 ELSE 0 END) AS MAZE_점수
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type IN ('WRF', 'MAZE')
  GROUP BY tr.user_id, up.full_name, up.class_name
  HAVING 
    AVG(CASE WHEN tr.test_type = 'WRF' AND tr.is_correct THEN 100.0 ELSE 0 END) IS NOT NULL
    AND AVG(CASE WHEN tr.test_type = 'MAZE' AND tr.is_correct THEN 100.0 ELSE 0 END) IS NOT NULL
)
SELECT 
  full_name AS 학생이름,
  class_name AS 반,
  ROUND(WRF_점수, 1) AS 어휘력,
  ROUND(MAZE_점수, 1) AS 독해력,
  ROUND(WRF_점수 - MAZE_점수, 1) AS 격차,
  CASE 
    WHEN WRF_점수 - MAZE_점수 > 15 THEN '어휘는 있지만 문맥 이해 약함'
    WHEN MAZE_점수 - WRF_점수 > 15 THEN '어휘 부족하지만 추론 능력 좋음'
    ELSE '균형 잡힌 능력'
  END AS 해석
FROM vocab_comp
ORDER BY 독해력 DESC;

-- ============================================
-- 7. 종합 읽기 능력 분석 (5개 테스트)
-- ============================================

-- 7-1. 학생별 DIBELS 종합 프로필
WITH all_tests AS (
  SELECT 
    user_id,
    -- LNF
    MAX(CASE WHEN test_type = 'LNF' THEN 
      (SELECT ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1)
       FROM test_results WHERE test_type = 'LNF' AND user_id = tr.user_id)
    END) AS LNF_정답률,
    -- PSF
    MAX(CASE WHEN test_type = 'PSF' THEN
      (SELECT ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1)
       FROM test_results WHERE test_type = 'PSF' AND user_id = tr.user_id)
    END) AS PSF_정확도,
    -- NWF
    MAX(CASE WHEN test_type = 'NWF' THEN
      (SELECT ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1)
       FROM test_results WHERE test_type = 'NWF' AND user_id = tr.user_id)
    END) AS NWF_WWR,
    -- WRF
    MAX(CASE WHEN test_type = 'WRF' THEN
      (SELECT ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1)
       FROM test_results WHERE test_type = 'WRF' AND user_id = tr.user_id)
    END) AS WRF_정답률,
    -- ORF
    MAX(CASE WHEN test_type = 'ORF' THEN wcpm END) AS ORF_WCPM,
    -- MAZE
    AVG(CASE WHEN test_type = 'MAZE' AND is_correct THEN 100.0 ELSE 0 END) AS MAZE_정답률
  FROM test_results tr
  GROUP BY user_id
)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  at.LNF_정답률,
  at.PSF_정확도,
  at.NWF_WWR,
  at.WRF_정답률,
  at.ORF_WCPM,
  ROUND(at.MAZE_정답률, 1) AS MAZE_정답률,
  -- 전체 평균
  ROUND((at.LNF_정답률 + at.PSF_정확도 + at.NWF_WWR + at.WRF_정답률 + at.MAZE_정답률) / 5, 1) AS 종합_평균
FROM all_tests at
JOIN user_profiles up ON at.user_id = up.id
WHERE at.MAZE_정답률 IS NOT NULL
ORDER BY 종합_평균 DESC;

-- ============================================
-- 사용 가이드
-- ============================================

/*
🎯 빠른 분석 순서:

1. 반별 현황
   → 1-1번 쿼리

2. 어려운 문항
   → 1-2번 쿼리

3. 학생별 성적
   → 2-1번 쿼리

4. 그룹 편성
   → 4-1번 쿼리

5. ORF-MAZE 통합
   → 6-1번 쿼리

6. 종합 프로필
   → 7-1번 쿼리

📊 CSV 내보내기:
   Results → Download CSV
*/

-- ============================================
-- 교육적 해석 가이드
-- ============================================

/*
🎓 결과 해석:

1. MAZE 정답률 85% 이상
   → 우수한 독해력
   → 추론 능력 뛰어남
   → 심화 독해 활동

2. MAZE 70-84%
   → 양호한 독해력
   → 문법 개념 보강
   → 다양한 지문 읽기

3. MAZE 55-69%
   → 기본 독해력
   → 문맥 단서 찾기 연습
   → 품사 학습

4. MAZE 55% 미만
   → 독해 전략 부족
   → 기초 어휘/문법 복습
   → 1:1 개별 지도

5. ORF 높음 + MAZE 낮음
   → 빨리 읽지만 이해 안 함
   → "왜?"라고 질문하며 읽기

6. ORF 낮음 + MAZE 높음
   → 이해력은 있지만 느림
   → 속도 향상 연습

📌 DIBELS 기준:
   3학년: 15-20점
   4학년: 20-25점
   (정답 - 오답)
*/

