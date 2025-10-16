-- ============================================
-- ORF (Oral Reading Fluency) 교육 분석 SQL 템플릿
-- ============================================
-- ORF는 읽기 유창성과 정확도를 동시에 평가합니다
-- WCPM (Words Correct Per Minute): 분당 정확하게 읽은 단어 수
-- Accuracy: 읽기 정확도 (%)
-- ============================================

-- ============================================
-- 1. 전체 현황 분석
-- ============================================

-- 1-1. 반별 ORF 성적 요약
SELECT 
  up.class_name AS 반,
  up.grade_level AS 학년,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  COUNT(*) AS 총_평가_횟수,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  ROUND(MIN(tr.wcpm), 1) AS 최저_WCPM,
  ROUND(MAX(tr.wcpm), 1) AS 최고_WCPM,
  ROUND(STDDEV(tr.wcpm), 1) AS WCPM_표준편차
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY up.class_name, up.grade_level
ORDER BY 평균_WCPM DESC;

-- 1-2. 학년별 기대치 대비 성취도
SELECT 
  up.grade_level AS 학년,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  CASE 
    WHEN up.grade_level = '1학년' AND AVG(tr.wcpm) >= 40 THEN '목표 달성'
    WHEN up.grade_level = '2학년' AND AVG(tr.wcpm) >= 70 THEN '목표 달성'
    WHEN up.grade_level = '3학년' AND AVG(tr.wcpm) >= 90 THEN '목표 달성'
    WHEN up.grade_level = '4학년' AND AVG(tr.wcpm) >= 100 THEN '목표 달성'
    ELSE '추가 연습 필요'
  END AS 학년별_평가
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY up.grade_level
ORDER BY up.grade_level;

-- ============================================
-- 2. 학생별 분석
-- ============================================

-- 2-1. 학생별 ORF 종합 성적
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.student_number AS 번호,
  COUNT(*) AS 평가_횟수,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  ROUND(MAX(tr.wcpm), 1) AS 최고_WCPM,
  -- 종합 점수 (WCPM × 정확도)
  ROUND(AVG(tr.wcpm * tr.accuracy / 100), 1) AS 종합_점수,
  RANK() OVER (ORDER BY AVG(tr.wcpm) DESC) AS WCPM_순위,
  RANK() OVER (ORDER BY AVG(tr.accuracy) DESC) AS 정확도_순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY tr.user_id, up.full_name, up.class_name, up.student_number
ORDER BY 평균_WCPM DESC;

-- 2-2. 학생별 읽기 유형 분류
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  ROUND(AVG(tr.wcpm), 1) AS WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 정확도,
  CASE 
    WHEN AVG(tr.wcpm) >= 80 AND AVG(tr.accuracy) >= 95 THEN '이상적 (빠르고 정확)'
    WHEN AVG(tr.wcpm) >= 80 AND AVG(tr.accuracy) < 95 THEN '속도형 (빠르지만 부정확)'
    WHEN AVG(tr.wcpm) < 80 AND AVG(tr.accuracy) >= 95 THEN '정확형 (느리지만 정확)'
    ELSE '개선필요 (느리고 부정확)'
  END AS 읽기_유형,
  CASE 
    WHEN AVG(tr.wcpm) >= 80 AND AVG(tr.accuracy) < 95 THEN '정확도 향상: 천천히 정확하게 읽기'
    WHEN AVG(tr.wcpm) < 80 AND AVG(tr.accuracy) >= 95 THEN '속도 향상: 반복 읽기, 타이머 사용'
    WHEN AVG(tr.wcpm) < 80 AND AVG(tr.accuracy) < 95 THEN '기초부터: sight words 복습, 구문 읽기'
    ELSE '표현력 향상: 감정 넣어 읽기'
  END AS 권장_학습
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY WCPM DESC;

-- ============================================
-- 3. 유창성 vs 정확도 균형 분석
-- ============================================

-- 3-1. 속도는 빠르지만 정확도가 낮은 학생
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  ROUND(AVG(tr.wcpm), 1) AS WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 정확도,
  ROUND(AVG(tr.wcpm) - (AVG(tr.accuracy) - 90) * 2, 1) AS 조정_점수,
  '정확도 향상 필요' AS 권장사항
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY tr.user_id, up.full_name, up.class_name
HAVING AVG(tr.wcpm) >= 70 AND AVG(tr.accuracy) < 93
ORDER BY 정확도 ASC;

-- 3-2. 정확하지만 느린 학생
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  ROUND(AVG(tr.wcpm), 1) AS WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 정확도,
  '속도 향상 필요 (반복 읽기)' AS 권장사항
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY tr.user_id, up.full_name, up.class_name
HAVING AVG(tr.wcpm) < 60 AND AVG(tr.accuracy) >= 95
ORDER BY WCPM ASC;

-- ============================================
-- 4. 성장 추적 분석
-- ============================================

-- 4-1. 특정 학생의 ORF 성장 곡선
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  wcpm AS WCPM,
  accuracy AS 정확도,
  -- 전 평가 대비 증가량
  wcpm - LAG(wcpm) OVER (ORDER BY created_at) AS WCPM_증가,
  ROUND(accuracy - LAG(accuracy) OVER (ORDER BY created_at), 1) AS 정확도_변화,
  -- 종합 점수
  ROUND(wcpm * accuracy / 100, 1) AS 종합_점수
FROM test_results
WHERE test_type = 'ORF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
ORDER BY 평가일;

-- 4-2. 반 전체의 주간 성장 추이
SELECT 
  up.class_name AS 반,
  DATE_TRUNC('week', tr.created_at) AS 주차,
  COUNT(DISTINCT tr.user_id) AS 평가한_학생,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  -- 전주 대비 변화
  ROUND(AVG(tr.wcpm) - LAG(AVG(tr.wcpm)) OVER (
    PARTITION BY up.class_name 
    ORDER BY DATE_TRUNC('week', tr.created_at)
  ), 1) AS 주간_WCPM_증가
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY up.class_name, DATE_TRUNC('week', tr.created_at)
ORDER BY 반, 주차;

-- ============================================
-- 5. 수준별 그룹핑
-- ============================================

-- 5-1. ORF 능력별 학생 분류
WITH student_levels AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
    up.grade_level,
    ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
    ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
    CASE 
      WHEN AVG(tr.wcpm) >= 100 THEN '상위 (100+)'
      WHEN AVG(tr.wcpm) >= 70 THEN '중상위 (70-99)'
      WHEN AVG(tr.wcpm) >= 40 THEN '중하위 (40-69)'
      ELSE '하위 (<40)'
    END AS 수준
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'ORF'
  GROUP BY tr.user_id, up.full_name, up.class_name, up.grade_level
)
SELECT 
  class_name AS 반,
  수준,
  COUNT(*) AS 학생_수,
  ROUND(AVG(평균_WCPM), 1) AS 그룹평균_WCPM,
  ROUND(AVG(평균_정확도), 1) AS 그룹평균_정확도,
  STRING_AGG(full_name, ', ' ORDER BY 평균_WCPM DESC) AS 학생_명단
FROM student_levels
GROUP BY class_name, 수준
ORDER BY class_name, 
  CASE 수준
    WHEN '상위 (100+)' THEN 1
    WHEN '중상위 (70-99)' THEN 2
    WHEN '중하위 (40-69)' THEN 3
    ELSE 4
  END;

-- 5-2. 집중 지도가 필요한 학생 (학년별 기준 미달)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.grade_level AS 학년,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  CASE 
    WHEN up.grade_level = '1학년' THEN 40
    WHEN up.grade_level = '2학년' THEN 70
    WHEN up.grade_level = '3학년' THEN 90
    WHEN up.grade_level = '4학년' THEN 100
    ELSE 80
  END AS 학년별_목표_WCPM,
  CASE 
    WHEN up.grade_level = '1학년' THEN ROUND(AVG(tr.wcpm) - 40, 1)
    WHEN up.grade_level = '2학년' THEN ROUND(AVG(tr.wcpm) - 70, 1)
    WHEN up.grade_level = '3학년' THEN ROUND(AVG(tr.wcpm) - 90, 1)
    WHEN up.grade_level = '4학년' THEN ROUND(AVG(tr.wcpm) - 100, 1)
    ELSE ROUND(AVG(tr.wcpm) - 80, 1)
  END AS 목표대비_차이
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY tr.user_id, up.full_name, up.class_name, up.grade_level
HAVING 
  (up.grade_level = '1학년' AND AVG(tr.wcpm) < 40) OR
  (up.grade_level = '2학년' AND AVG(tr.wcpm) < 70) OR
  (up.grade_level = '3학년' AND AVG(tr.wcpm) < 90) OR
  (up.grade_level = '4학년' AND AVG(tr.wcpm) < 100)
ORDER BY 목표대비_차이 ASC;

-- ============================================
-- 6. WCPM 분포 분석
-- ============================================

-- 6-1. WCPM 구간별 학생 분포
SELECT 
  CASE 
    WHEN wcpm < 40 THEN '1. 매우 느림 (<40)'
    WHEN wcpm BETWEEN 40 AND 59 THEN '2. 느림 (40-59)'
    WHEN wcpm BETWEEN 60 AND 79 THEN '3. 보통 (60-79)'
    WHEN wcpm BETWEEN 80 AND 99 THEN '4. 빠름 (80-99)'
    ELSE '5. 매우 빠름 (100+)'
  END AS WCPM_구간,
  COUNT(*) AS 학생_수,
  ROUND(AVG(accuracy), 1) AS 평균_정확도
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE test_type = 'ORF'
GROUP BY WCPM_구간
ORDER BY WCPM_구간;

-- 6-2. 정확도 구간별 학생 분포
SELECT 
  CASE 
    WHEN accuracy >= 97 THEN '1. 우수 (97%+)'
    WHEN accuracy BETWEEN 93 AND 96.9 THEN '2. 양호 (93-96%)'
    WHEN accuracy BETWEEN 90 AND 92.9 THEN '3. 보통 (90-92%)'
    ELSE '4. 개선필요 (<90%)'
  END AS 정확도_구간,
  COUNT(*) AS 학생_수,
  ROUND(AVG(wcpm), 1) AS 평균_WCPM
FROM test_results tr
WHERE test_type = 'ORF'
GROUP BY 정확도_구간
ORDER BY 정확도_구간;

-- ============================================
-- 7. 개인별 맞춤 분석
-- ============================================

-- 7-1. 특정 학생의 상세 분석
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
WITH student_stats AS (
  SELECT 
    ROUND(AVG(wcpm), 1) AS 평균_WCPM,
    ROUND(AVG(accuracy), 1) AS 평균_정확도,
    COUNT(*) AS 평가_횟수
  FROM test_results
  WHERE test_type = 'ORF' AND user_id = 'STUDENT-UUID'
),
class_stats AS (
  SELECT 
    ROUND(AVG(tr.wcpm), 1) AS 반평균_WCPM,
    ROUND(AVG(tr.accuracy), 1) AS 반평균_정확도
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'ORF'
    AND up.class_name = (SELECT class_name FROM user_profiles WHERE id = 'STUDENT-UUID')
)
SELECT 
  ss.평균_WCPM,
  ss.평균_정확도,
  ss.평가_횟수,
  cs.반평균_WCPM,
  cs.반평균_정확도,
  ROUND(ss.평균_WCPM - cs.반평균_WCPM, 1) AS WCPM_반평균대비,
  ROUND(ss.평균_정확도 - cs.반평균_정확도, 1) AS 정확도_반평균대비
FROM student_stats ss, class_stats cs;

-- ============================================
-- 8. 성장률 분석
-- ============================================

-- 8-1. 성장률이 높은 학생 (동기 부여용)
WITH growth_calc AS (
  SELECT 
    user_id,
    MIN(wcpm) AS 첫평가_WCPM,
    MAX(wcpm) AS 최근평가_WCPM,
    MAX(wcpm) - MIN(wcpm) AS 증가량,
    COUNT(*) AS 평가횟수
  FROM test_results
  WHERE test_type = 'ORF'
  GROUP BY user_id
  HAVING COUNT(*) >= 2
)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  gc.첫평가_WCPM,
  gc.최근평가_WCPM,
  gc.증가량,
  gc.평가횟수,
  ROUND(gc.증가량::FLOAT / gc.평가횟수, 1) AS 평가당_평균_증가
FROM growth_calc gc
JOIN user_profiles up ON gc.user_id = up.id
ORDER BY 증가량 DESC
LIMIT 20;

-- 8-2. 정체 중인 학생 (추가 지도 필요)
WITH recent_performance AS (
  SELECT 
    user_id,
    wcpm,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM test_results
  WHERE test_type = 'ORF'
),
last_two AS (
  SELECT 
    user_id,
    MAX(CASE WHEN rn = 1 THEN wcpm END) AS 최근_WCPM,
    MAX(CASE WHEN rn = 2 THEN wcpm END) AS 이전_WCPM
  FROM recent_performance
  WHERE rn <= 2
  GROUP BY user_id
  HAVING COUNT(*) = 2
)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  lt.이전_WCPM,
  lt.최근_WCPM,
  lt.최근_WCPM - lt.이전_WCPM AS 변화량,
  '추가 지도 필요' AS 권장사항
FROM last_two lt
JOIN user_profiles up ON lt.user_id = up.id
WHERE lt.최근_WCPM - lt.이전_WCPM <= 0
ORDER BY 변화량 ASC;

-- ============================================
-- 9. 읽기 발달 단계 분류
-- ============================================

-- 9-1. 학생별 읽기 발달 단계
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  ROUND(AVG(tr.wcpm), 1) AS WCPM,
  CASE 
    WHEN AVG(tr.wcpm) < 40 THEN '1단계: 단어별 읽기 (Word-by-word)'
    WHEN AVG(tr.wcpm) BETWEEN 40 AND 69 THEN '2단계: 구문별 읽기 (Phrase reading)'
    WHEN AVG(tr.wcpm) BETWEEN 70 AND 99 THEN '3단계: 유창한 읽기 (Fluent)'
    ELSE '4단계: 표현적 읽기 (Expressive)'
  END AS 발달_단계,
  CASE 
    WHEN AVG(tr.wcpm) < 40 THEN '구문 읽기 연습'
    WHEN AVG(tr.wcpm) BETWEEN 40 AND 69 THEN '반복 읽기로 속도 향상'
    WHEN AVG(tr.wcpm) BETWEEN 70 AND 99 THEN '표현력 추가'
    ELSE '연극, 낭독 활동'
  END AS 권장_활동
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY WCPM DESC;

-- ============================================
-- 10. 종합 리포트 (학부모 상담용)
-- ============================================

-- 10-1. 학생별 종합 리포트
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.grade_level AS 학년,
  COUNT(*) AS 평가_횟수,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(MAX(tr.wcpm), 1) AS 최고_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  -- 학년별 백분위 (추정)
  PERCENT_RANK() OVER (
    PARTITION BY up.grade_level 
    ORDER BY AVG(tr.wcpm)
  ) * 100 AS 학년내_백분위,
  CASE 
    WHEN AVG(tr.wcpm) >= 80 AND AVG(tr.accuracy) >= 95 THEN '✅ 우수: 독립적 읽기 가능'
    WHEN AVG(tr.wcpm) >= 60 AND AVG(tr.accuracy) >= 90 THEN '✅ 양호: 지속적 연습 필요'
    WHEN AVG(tr.wcpm) >= 40 THEN '⚠️ 보통: 반복 읽기 활동 권장'
    ELSE '🔴 개선필요: 집중 지도 필요'
  END AS 종합_평가
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
  AND tr.user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY tr.user_id, up.full_name, up.class_name, up.grade_level;

-- ============================================
-- 사용 가이드
-- ============================================

/*
🎯 빠른 분석 순서:

1. 반별 현황
   → 1-1번 쿼리

2. 학년별 목표 달성도
   → 1-2번 쿼리

3. 학생별 읽기 유형
   → 2-2번 쿼리

4. 그룹 편성
   → 5-1번 쿼리

5. 개인 분석
   → 7-1번 쿼리 (UUID 변경)

6. 성장 추적
   → 4-1번 쿼리 (UUID 변경)

7. 종합 리포트
   → 10-1번 쿼리 (학부모 상담)

📊 CSV 내보내기:
   Results → Download CSV
*/

-- ============================================
-- 교육적 해석 가이드
-- ============================================

/*
🎓 결과 해석:

1. WCPM 높음 (100+), 정확도 높음 (95%+)
   → 우수한 유창성
   → 독립적 읽기 가능
   → 표현 읽기, 연극 활동

2. WCPM 중간 (60-99), 정확도 높음 (95%+)
   → 정확하지만 속도 부족
   → 반복 읽기로 속도 향상
   → 타이머 사용 연습

3. WCPM 높음 (80+), 정확도 낮음 (<93%)
   → 너무 빨리 읽음
   → 정확도 우선 연습
   → "천천히, 정확하게"

4. WCPM 낮음 (<60), 정확도 낮음 (<90%)
   → 기초부터 재학습
   → sight words 복습
   → 1:1 개별 지도

📌 DIBELS 기준:
   3학년: 90 WCPM, 95% 정확도
   4학년: 100 WCPM, 95% 정확도
*/

