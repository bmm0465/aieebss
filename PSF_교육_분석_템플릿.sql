-- ============================================
-- PSF (음소 분리) 교육 분석 SQL 템플릿
-- ============================================
-- 사용법: Supabase SQL Editor에서 실행
-- ============================================

-- ============================================
-- 1. 전체 현황 분석
-- ============================================

-- 1-1. 반별 PSF 성적 요약
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  COUNT(*) AS 시도한_단어,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 평균_정확도,
  ROUND(MIN(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 최저,
  ROUND(MAX(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 최고
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
GROUP BY up.class_name
ORDER BY 평균_정확도 DESC;

-- 1-2. 가장 어려운 단어 TOP 20
SELECT 
  question_word AS 단어,
  target_segments AS 음소수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도,
  ROUND(AVG(CASE WHEN correct_segments = target_segments THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률
FROM test_results
WHERE test_type = 'PSF'
GROUP BY question_word, target_segments
ORDER BY 평균_정확도 ASC
LIMIT 20;

-- 1-3. 가장 쉬운 단어 TOP 20
SELECT 
  question_word AS 단어,
  target_segments AS 음소수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도,
  ROUND(AVG(CASE WHEN correct_segments = target_segments THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률
FROM test_results
WHERE test_type = 'PSF'
GROUP BY question_word, target_segments
ORDER BY 평균_정확도 DESC
LIMIT 20;

-- ============================================
-- 2. 단어 특성별 분석
-- ============================================

-- 2-1. 단어 길이별 정답률
SELECT 
  LENGTH(question_word) AS 단어길이,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
GROUP BY LENGTH(question_word)
ORDER BY 단어길이;

-- 2-2. 음소 개수별 정답률
SELECT 
  target_segments AS 음소개수,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
GROUP BY target_segments
ORDER BY 음소개수;

-- 2-3. 자음군이 있는 단어 vs 없는 단어
SELECT 
  CASE 
    WHEN question_word IN ('frog', 'cry', 'camp', 'farm', 'bell', 'plan', 'hand', 
                          'gift', 'stop', 'star', 'belt', 'sand', 'desk', 'ski',
                          'toad', 'cold', 'crab', 'coin', 'deep', 'lamp', 'drum',
                          'nest', 'tent') 
      THEN '자음군 포함'
    ELSE '자음군 없음'
  END AS 단어_유형,
  COUNT(DISTINCT question_word) AS 단어_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
GROUP BY 단어_유형
ORDER BY 평균_정확도 DESC;

-- ============================================
-- 3. 학생별 분석
-- ============================================

-- 3-1. 학생별 PSF 성적 순위
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.student_number AS 번호,
  COUNT(*) AS 시도_단어,
  SUM(tr.correct_segments) AS 맞춘_음소,
  SUM(tr.target_segments) AS 전체_음소,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 음소_정확도,
  ROUND(AVG(CASE WHEN tr.correct_segments = tr.target_segments THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률,
  RANK() OVER (ORDER BY AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100) DESC) AS 전체_순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
GROUP BY tr.user_id, up.full_name, up.class_name, up.student_number
ORDER BY 음소_정확도 DESC;

-- 3-2. 특정 학생의 약점 단어 (개인 학습 계획용)
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  tr.question_word AS 단어,
  tr.target_segments AS 목표_음소,
  ROUND(AVG(tr.correct_segments), 1) AS 평균_맞춘_음소,
  ROUND(AVG(tr.target_segments - tr.correct_segments), 1) AS 평균_누락_음소,
  COUNT(*) AS 시도_횟수,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 정확도
FROM test_results tr
WHERE tr.test_type = 'PSF'
  AND tr.user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
  AND tr.correct_segments < tr.target_segments
GROUP BY tr.question_word, tr.target_segments
ORDER BY 정확도 ASC, 평균_누락_음소 DESC
LIMIT 20;

-- 3-3. 학생의 음소 패턴별 강약점
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  CASE 
    WHEN tr.question_word IN ('on', 'go', 'an', 'so', 'at', 'up') THEN '2음소'
    WHEN LENGTH(tr.question_word) = 3 THEN '3글자(주로3음소)'
    WHEN LENGTH(tr.question_word) = 4 THEN '4글자'
    ELSE '5글자이상'
  END AS 단어_길이,
  COUNT(*) AS 시도_수,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 정확도
FROM test_results tr
WHERE tr.test_type = 'PSF'
  AND tr.user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY 단어_길이
ORDER BY 정확도 ASC;

-- ============================================
-- 4. 반별 약점 분석
-- ============================================

-- 4-1. 특정 반이 어려워하는 단어 (맞춤형 수업 계획용)
-- ⚠️ 반 이름을 실제 반 이름으로 변경하세요
SELECT 
  tr.question_word AS 단어,
  tr.target_segments AS 음소수,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 반평균_정확도
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
  AND up.class_name = '나루초 3학년 다솜반'  -- 여기에 반 이름 입력
GROUP BY tr.question_word, tr.target_segments
HAVING AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100) < 70
ORDER BY 반평균_정확도 ASC;

-- 4-2. 반별 자음군 처리 능력 비교
SELECT 
  up.class_name AS 반,
  CASE 
    WHEN tr.question_word IN ('frog', 'cry', 'camp', 'farm', 'bell', 'plan', 'hand', 
                              'gift', 'stop', 'star', 'belt', 'sand', 'desk', 'ski',
                              'toad', 'cold', 'crab', 'coin', 'deep', 'lamp', 'drum',
                              'nest', 'tent') 
      THEN '자음군_포함'
    ELSE '자음군_없음'
  END AS 단어_유형,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
GROUP BY up.class_name, 단어_유형
ORDER BY up.class_name, 단어_유형;

-- ============================================
-- 5. 성장 추적 (시계열 분석)
-- ============================================

-- 5-1. 특정 학생의 평가일별 성적 변화
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  COUNT(*) AS 시도_단어,
  SUM(correct_segments) AS 맞춘_음소,
  SUM(target_segments) AS 전체_음소,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 정확도,
  -- 전 평가 대비 향상도
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100) - 
    LAG(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100)) 
    OVER (ORDER BY DATE(created_at)), 1) AS 향상도
FROM test_results
WHERE test_type = 'PSF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY DATE(created_at)
ORDER BY 평가일;

-- 5-2. 반 전체의 월별 성장 추이
SELECT 
  up.class_name AS 반,
  DATE_TRUNC('week', tr.created_at) AS 주차,
  COUNT(DISTINCT tr.user_id) AS 평가한_학생,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
GROUP BY up.class_name, DATE_TRUNC('week', tr.created_at)
ORDER BY 반, 주차;

-- ============================================
-- 6. 특수 패턴 분석
-- ============================================

-- 6-1. 모음별 단어 정답률
SELECT 
  CASE 
    WHEN question_word ~ 'a' AND NOT question_word ~ '[eiou]' THEN 'a 단모음'
    WHEN question_word ~ 'e' AND NOT question_word ~ '[aiou]' THEN 'e 단모음'
    WHEN question_word ~ 'i' AND NOT question_word ~ '[aeou]' THEN 'i 단모음'
    WHEN question_word ~ 'o' AND NOT question_word ~ '[aeiu]' THEN 'o 단모음'
    WHEN question_word ~ 'u' AND NOT question_word ~ '[aeio]' THEN 'u 단모음'
    WHEN question_word IN ('road', 'pear', 'moon', 'coin', 'heel', 'deep') THEN '이중모음/장모음'
    ELSE '기타'
  END AS 모음_유형,
  COUNT(DISTINCT question_word) AS 단어_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
GROUP BY 모음_유형
ORDER BY 평균_정확도 ASC;

-- 6-2. 자음군 위치별 난이도 (초성 vs 종성)
SELECT 
  CASE 
    WHEN question_word IN ('frog', 'cry', 'plan', 'star', 'crab', 'drum') THEN '초성자음군 (fr, cr, pl, st, dr)'
    WHEN question_word IN ('camp', 'hand', 'gift', 'stop', 'belt', 'sand', 'desk', 
                          'cold', 'nest', 'tent', 'lamp') THEN '종성자음군 (mp, nd, ft, lt, st, ld)'
    ELSE '자음군 없음'
  END AS 자음군_유형,
  COUNT(DISTINCT question_word) AS 단어_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
GROUP BY 자음군_유형
ORDER BY 평균_정확도 ASC;

-- ============================================
-- 7. 개인별 상세 분석 (학부모 상담용)
-- ============================================

-- 7-1. 특정 학생의 종합 리포트
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
WITH student_stats AS (
  SELECT 
    COUNT(*) AS 총_시도,
    SUM(correct_segments) AS 맞춘_음소,
    SUM(target_segments) AS 전체_음소,
    ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도,
    ROUND(AVG(CASE WHEN correct_segments = target_segments THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률
  FROM test_results
  WHERE test_type = 'PSF' AND user_id = 'STUDENT-UUID'
),
class_average AS (
  SELECT 
    ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 반평균
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'PSF' 
    AND up.class_name = (SELECT class_name FROM user_profiles WHERE id = 'STUDENT-UUID')
)
SELECT 
  ss.*,
  ca.반평균,
  (ss.평균_정확도 - ca.반평균) AS 반평균대비
FROM student_stats ss, class_average ca;

-- 7-2. 특정 학생이 가장 어려워하는 단어 유형
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  CASE 
    WHEN LENGTH(question_word) = 2 THEN '2글자'
    WHEN LENGTH(question_word) = 3 THEN '3글자(CVC)'
    WHEN LENGTH(question_word) = 4 THEN '4글자'
    ELSE '5글자+'
  END AS 단어_길이,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 정확도,
  ROUND(AVG(target_segments - correct_segments), 2) AS 평균_누락_음소
FROM test_results
WHERE test_type = 'PSF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY 단어_길이
ORDER BY 정확도 ASC;

-- ============================================
-- 8. 교육적 그룹핑 (수준별 학습 그룹 편성)
-- ============================================

-- 8-1. PSF 능력별 학생 그룹핑
WITH student_levels AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
    ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 평균_정확도,
    CASE 
      WHEN AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100) >= 90 THEN '상위 (90%+)'
      WHEN AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100) >= 75 THEN '중상위 (75-89%)'
      WHEN AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100) >= 60 THEN '중하위 (60-74%)'
      ELSE '하위 (60% 미만)'
    END AS 수준
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'PSF'
  GROUP BY tr.user_id, up.full_name, up.class_name
)
SELECT 
  class_name AS 반,
  수준,
  COUNT(*) AS 학생_수,
  STRING_AGG(full_name, ', ') AS 학생_명단
FROM student_levels
GROUP BY class_name, 수준
ORDER BY class_name, 
  CASE 수준
    WHEN '상위 (90%+)' THEN 1
    WHEN '중상위 (75-89%)' THEN 2
    WHEN '중하위 (60-74%)' THEN 3
    ELSE 4
  END;

-- 8-2. 집중 지도가 필요한 학생 목록 (60% 미만)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.student_number AS 번호,
  COUNT(*) AS 시도_단어,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 평균_정확도,
  -- 가장 어려워하는 단어 3개
  STRING_AGG(
    CASE 
      WHEN tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) < 0.5 
      THEN tr.question_word 
    END, 
    ', '
  ) AS 약점_단어
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
GROUP BY tr.user_id, up.full_name, up.class_name, up.student_number
HAVING AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100) < 60
ORDER BY 평균_정확도 ASC;

-- ============================================
-- 9. 시간대별 분석 (피로도 효과)
-- ============================================

-- 9-1. 문항 순서별 정답률 (앞 vs 뒤)
WITH numbered_attempts AS (
  SELECT 
    question_word,
    correct_segments,
    target_segments,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS 문항_순서
  FROM test_results
  WHERE test_type = 'PSF'
)
SELECT 
  CASE 
    WHEN 문항_순서 BETWEEN 1 AND 10 THEN '1-10번 (초반)'
    WHEN 문항_순서 BETWEEN 11 AND 20 THEN '11-20번 (중반)'
    WHEN 문항_순서 BETWEEN 21 AND 30 THEN '21-30번 (후반)'
    ELSE '31번 이후'
  END AS 문항_구간,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM numbered_attempts
GROUP BY 문항_구간
ORDER BY 문항_구간;

-- ============================================
-- 10. 맞춤형 학습 추천 (AI 기반)
-- ============================================

-- 10-1. 학생별 추천 학습 단어 생성
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
WITH student_weak_words AS (
  SELECT 
    question_word,
    ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 정확도
  FROM test_results
  WHERE test_type = 'PSF'
    AND user_id = 'STUDENT-UUID'
  GROUP BY question_word
  HAVING AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100) < 75
  ORDER BY 정확도 ASC
  LIMIT 10
)
SELECT 
  '이 학생에게 추천하는 학습 단어:' AS 추천,
  STRING_AGG(question_word, ', ' ORDER BY 정확도) AS 단어_목록
FROM student_weak_words;

-- ============================================
-- 사용 가이드
-- ============================================

/*
🎯 빠른 사용법:

1. 반별 현황 확인:
   → 1-1번 쿼리 실행

2. 어려운 단어 파악:
   → 1-2번 쿼리 실행

3. 개인 분석:
   → 3-2번 쿼리에서 STUDENT-UUID 변경 후 실행

4. 학습 그룹 편성:
   → 8-1번 쿼리 실행

5. 맞춤형 과제 제공:
   → 10-1번 쿼리에서 STUDENT-UUID 변경 후 실행

📊 결과는 CSV로 내보내기 가능:
   Supabase SQL Editor → Results → Download CSV
*/

