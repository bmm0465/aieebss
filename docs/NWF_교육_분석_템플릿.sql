-- ============================================
-- NWF (Nonsense Word Fluency) 교육 분석 SQL 템플릿
-- ============================================
-- NWF는 파닉스 적용 능력과 자음군 처리 능력을 평가합니다
-- CLS (Correct Letter Sounds): 개별 음소 정답
-- WWR (Whole Words Read): 단어 전체 정답
-- ============================================

-- ============================================
-- 1. 전체 현황 분석
-- ============================================

-- 1-1. 반별 NWF 성적 요약
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  COUNT(*) AS 총_시도_단어,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 평균_WWR,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS 평균_CLS,
  ROUND(
    AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END) - 
    AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 
    1
  ) AS 블렌딩_격차
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY up.class_name
ORDER BY 평균_WWR DESC;

-- 1-2. 가장 어려운 Nonsense Words TOP 20
SELECT 
  question_word AS 단어,
  LENGTH(question_word) AS 글자수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률,
  CASE 
    WHEN question_word ~ '^[bcdfghjklmnpqrstvwxyz]{2}' THEN '초성자음군'
    WHEN question_word ~ '[bcdfghjklmnpqrstvwxyz]{2}$' THEN '종성자음군'
    ELSE '단일자음'
  END AS 특성
FROM test_results
WHERE test_type = 'NWF'
GROUP BY question_word
ORDER BY WWR_정답률 ASC
LIMIT 20;

-- 1-3. 가장 쉬운 단어 TOP 20
SELECT 
  question_word AS 단어,
  LENGTH(question_word) AS 글자수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률
FROM test_results
WHERE test_type = 'NWF'
GROUP BY question_word
ORDER BY WWR_정답률 DESC
LIMIT 20;

-- ============================================
-- 2. 단어 패턴별 분석
-- ============================================

-- 2-1. 패턴별 정답률 (CVC, CCVC, CVCC)
SELECT 
  CASE 
    WHEN LENGTH(question_word) = 3 THEN 'CVC (3글자)'
    WHEN LENGTH(question_word) = 4 AND question_word ~ '^[bcdfghjklmnpqrstvwxyz]{2}' 
      THEN 'CCVC (초성자음군)'
    WHEN LENGTH(question_word) = 4 AND question_word ~ '[bcdfghjklmnpqrstvwxyz]{2}$' 
      THEN 'CVCC (종성자음군)'
    WHEN LENGTH(question_word) = 4 
      THEN 'CVCC/기타 (4글자)'
    ELSE '복합 (5글자+)'
  END AS 단어_패턴,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률
FROM test_results
WHERE test_type = 'NWF'
GROUP BY 단어_패턴
ORDER BY WWR_정답률 DESC;

-- 2-2. 자음군 유형별 정답률
WITH consonant_cluster_analysis AS (
  SELECT 
    question_word,
    is_whole_word_correct,
    is_phonemes_correct,
    CASE 
      -- l-blends
      WHEN question_word ~ '^[bcfgps]l' THEN 'l-blends (bl, cl, fl, gl, pl, sl)'
      -- r-blends
      WHEN question_word ~ '^[bcdfgpt]r' THEN 'r-blends (br, cr, dr, fr, gr, pr, tr)'
      -- s-blends
      WHEN question_word ~ '^s[ckmnptw]' THEN 's-blends (sc, sk, sm, sn, sp, st, sw)'
      -- 종성 자음군
      WHEN question_word ~ '[lmnr][kpt]$' THEN '종성자음군'
      ELSE '자음군 없음 (CVC)'
    END AS 자음군_유형
  FROM test_results
  WHERE test_type = 'NWF'
)
SELECT 
  자음군_유형,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률
FROM consonant_cluster_analysis
GROUP BY 자음군_유형
ORDER BY WWR_정답률 ASC;

-- ============================================
-- 3. 학생별 분석
-- ============================================

-- 3-1. 학생별 NWF 종합 성적
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  up.student_number AS 번호,
  COUNT(*) AS 시도_단어,
  SUM(CASE WHEN tr.is_whole_word_correct THEN 1 ELSE 0 END) AS WWR_점수,
  SUM(CASE WHEN tr.is_phonemes_correct THEN 1 ELSE 0 END) AS CLS_점수,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률,
  ROUND(
    AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END) - 
    AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 
    1
  ) AS 블렌딩_격차,
  RANK() OVER (ORDER BY AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END) DESC) AS 전체_순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY tr.user_id, up.full_name, up.class_name, up.student_number
ORDER BY WWR_정답률 DESC;

-- 3-2. 특정 학생의 약점 단어 및 패턴
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  tr.question_word AS 단어,
  LENGTH(tr.question_word) AS 글자수,
  tr.is_whole_word_correct AS 완벽정답,
  tr.is_phonemes_correct AS 음소정답,
  CASE 
    WHEN LENGTH(tr.question_word) = 3 THEN 'CVC'
    WHEN tr.question_word ~ '^[bcfgps]l' THEN 'l-blends'
    WHEN tr.question_word ~ '^[bcdfgpt]r' THEN 'r-blends'
    WHEN tr.question_word ~ '^s[ckmnptw]' THEN 's-blends'
    WHEN tr.question_word ~ '[lmnr][kpt]$' THEN '종성자음군'
    ELSE '복합'
  END AS 패턴,
  tr.created_at
FROM test_results tr
WHERE tr.test_type = 'NWF'
  AND tr.user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
  AND tr.is_whole_word_correct = FALSE
ORDER BY tr.created_at DESC
LIMIT 30;

-- 3-3. 특정 학생의 패턴별 강약점
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  CASE 
    WHEN LENGTH(question_word) = 3 THEN 'CVC (3글자)'
    WHEN question_word ~ '^[bcfgps]l' THEN 'l-blends'
    WHEN question_word ~ '^[bcdfgpt]r' THEN 'r-blends'
    WHEN question_word ~ '^s[ckmnptw]' THEN 's-blends'
    WHEN question_word ~ '[lmnr][kpt]$' THEN '종성자음군'
    ELSE '복합패턴'
  END AS 패턴_유형,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률
FROM test_results
WHERE test_type = 'NWF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY 패턴_유형
ORDER BY WWR_정답률 ASC;

-- ============================================
-- 4. 블렌딩 능력 분석 (중요!)
-- ============================================

-- 4-1. 블렌딩 격차가 큰 학생 (개별 지도 필요)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률,
  ROUND(
    AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END) - 
    AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 
    1
  ) AS 블렌딩_격차
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY tr.user_id, up.full_name, up.class_name
HAVING AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END) - 
       AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END) > 15
ORDER BY 블렌딩_격차 DESC;

-- 4-2. 반별 블렌딩 능력 비교
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 평균_WWR,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS 평균_CLS,
  ROUND(
    AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END) - 
    AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 
    1
  ) AS 평균_블렌딩_격차
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY up.class_name
ORDER BY 평균_WWR DESC;

-- ============================================
-- 5. 자음군 능력 심화 분석
-- ============================================

-- 5-1. 자음군 유형별 상세 정답률
SELECT 
  CASE 
    -- l-blends 세부
    WHEN question_word LIKE 'bl%' THEN 'bl-blend'
    WHEN question_word LIKE 'cl%' THEN 'cl-blend'
    WHEN question_word LIKE 'fl%' THEN 'fl-blend'
    WHEN question_word LIKE 'gl%' THEN 'gl-blend'
    WHEN question_word LIKE 'pl%' THEN 'pl-blend'
    -- r-blends 세부
    WHEN question_word LIKE 'br%' THEN 'br-blend'
    WHEN question_word LIKE 'cr%' THEN 'cr-blend'
    WHEN question_word LIKE 'dr%' THEN 'dr-blend'
    WHEN question_word LIKE 'fr%' THEN 'fr-blend'
    WHEN question_word LIKE 'gr%' THEN 'gr-blend'
    WHEN question_word LIKE 'pr%' THEN 'pr-blend'
    WHEN question_word LIKE 'tr%' THEN 'tr-blend'
    -- s-blends 세부
    WHEN question_word LIKE 'st%' THEN 'st-blend'
    WHEN question_word LIKE 'sm%' THEN 'sm-blend'
    WHEN question_word LIKE 'sn%' THEN 'sn-blend'
    WHEN question_word LIKE 'sp%' THEN 'sp-blend'
    WHEN question_word LIKE 'sk%' THEN 'sk-blend'
    ELSE 'CVC/기타'
  END AS 자음군_세부,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'NWF'
  AND LENGTH(question_word) >= 4
GROUP BY 자음군_세부
ORDER BY 정답률 ASC;

-- 5-2. 특정 반의 자음군별 능력
-- ⚠️ 반 이름을 실제 반 이름으로 변경하세요
SELECT 
  CASE 
    WHEN question_word ~ '^[bcfgps]l' THEN 'l-blends'
    WHEN question_word ~ '^[bcdfgpt]r' THEN 'r-blends'
    WHEN question_word ~ '^s[ckmnptw]' THEN 's-blends'
    WHEN question_word ~ '[lmnr][kpt]$' THEN '종성자음군'
    ELSE 'CVC'
  END AS 자음군_유형,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
  AND up.class_name = '나루초 3학년 다솜반'  -- 여기에 반 이름 입력
GROUP BY 자음군_유형
ORDER BY 정답률 ASC;

-- ============================================
-- 6. 수준별 그룹핑 (맞춤형 학습 그룹 편성)
-- ============================================

-- 6-1. NWF 능력별 학생 분류
WITH student_levels AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
    ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR,
    ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS,
    CASE 
      WHEN AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END) >= 85 THEN '상위 (85%+)'
      WHEN AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END) >= 70 THEN '중상위 (70-84%)'
      WHEN AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END) >= 55 THEN '중하위 (55-69%)'
      ELSE '하위 (55% 미만)'
    END AS 수준
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'NWF'
  GROUP BY tr.user_id, up.full_name, up.class_name
)
SELECT 
  class_name AS 반,
  수준,
  COUNT(*) AS 학생_수,
  ROUND(AVG(WWR), 1) AS 평균_WWR,
  ROUND(AVG(CLS), 1) AS 평균_CLS,
  STRING_AGG(full_name, ', ') AS 학생_명단
FROM student_levels
GROUP BY class_name, 수준
ORDER BY class_name, 
  CASE 수준
    WHEN '상위 (85%+)' THEN 1
    WHEN '중상위 (70-84%)' THEN 2
    WHEN '중하위 (55-69%)' THEN 3
    ELSE 4
  END;

-- 6-2. 블렌딩 지도가 필요한 학생 (CLS는 높지만 WWR이 낮음)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR,
  ROUND(
    AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END) - 
    AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 
    1
  ) AS 블렌딩_격차
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY tr.user_id, up.full_name, up.class_name
HAVING AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END) >= 75
  AND AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END) < 60
ORDER BY 블렌딩_격차 DESC;

-- ============================================
-- 7. 개인별 맞춤 학습 추천
-- ============================================

-- 7-1. 특정 학생에게 추천할 연습 단어
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
WITH student_weak_patterns AS (
  SELECT 
    CASE 
      WHEN question_word ~ '^[bcfgps]l' THEN 'l-blends'
      WHEN question_word ~ '^[bcdfgpt]r' THEN 'r-blends'
      WHEN question_word ~ '^s[ckmnptw]' THEN 's-blends'
      WHEN LENGTH(question_word) = 3 THEN 'CVC'
      ELSE '복합'
    END AS 패턴,
    is_whole_word_correct
  FROM test_results
  WHERE test_type = 'NWF'
    AND user_id = 'STUDENT-UUID'
),
weak_patterns AS (
  SELECT 패턴
  FROM student_weak_patterns
  GROUP BY 패턴
  HAVING AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END) < 70
)
SELECT 
  tr.question_word AS 추천_연습_단어,
  CASE 
    WHEN tr.question_word ~ '^[bcfgps]l' THEN 'l-blends'
    WHEN tr.question_word ~ '^[bcdfgpt]r' THEN 'r-blends'
    WHEN tr.question_word ~ '^s[ckmnptw]' THEN 's-blends'
    WHEN LENGTH(tr.question_word) = 3 THEN 'CVC'
    ELSE '복합'
  END AS 패턴
FROM test_results tr
WHERE tr.test_type = 'NWF'
  AND tr.user_id = 'STUDENT-UUID'
  AND tr.is_whole_word_correct = FALSE
GROUP BY tr.question_word
ORDER BY COUNT(*) DESC
LIMIT 15;

-- ============================================
-- 8. 성장 추적
-- ============================================

-- 8-1. 특정 학생의 평가일별 성적 변화
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  COUNT(*) AS 시도_단어,
  SUM(CASE WHEN is_whole_word_correct THEN 1 ELSE 0 END) AS WWR_점수,
  SUM(CASE WHEN is_phonemes_correct THEN 1 ELSE 0 END) AS CLS_점수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률,
  -- 전 평가 대비 향상도
  ROUND(
    AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END) - 
    LAG(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END)) 
    OVER (ORDER BY DATE(created_at)), 
    1
  ) AS WWR_향상도
FROM test_results
WHERE test_type = 'NWF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY DATE(created_at)
ORDER BY 평가일;

-- 8-2. 반 전체의 주간 성장 추이
SELECT 
  up.class_name AS 반,
  DATE_TRUNC('week', tr.created_at) AS 주차,
  COUNT(DISTINCT tr.user_id) AS 평가한_학생,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 평균_WWR,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS 평균_CLS
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY up.class_name, DATE_TRUNC('week', tr.created_at)
ORDER BY 반, 주차;

-- ============================================
-- 9. 특수 분석: 디코딩 전략
-- ============================================

-- 9-1. 음소는 맞지만 블렌딩 실패하는 단어
SELECT 
  question_word AS 단어,
  COUNT(*) AS 시도_수,
  -- 음소는 맞췄지만 완벽 정답은 아닌 비율
  ROUND(AVG(CASE WHEN is_phonemes_correct AND NOT is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 블렌딩_실패율
FROM test_results
WHERE test_type = 'NWF'
GROUP BY question_word
HAVING AVG(CASE WHEN is_phonemes_correct AND NOT is_whole_word_correct THEN 100.0 ELSE 0 END) > 20
ORDER BY 블렌딩_실패율 DESC
LIMIT 15;

-- 9-2. CVC는 잘하지만 자음군은 못하는 학생
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  -- CVC 정답률
  ROUND(AVG(CASE 
    WHEN LENGTH(tr.question_word) = 3 AND tr.is_whole_word_correct THEN 100.0 
    WHEN LENGTH(tr.question_word) = 3 THEN 0 
  END), 1) AS CVC_정답률,
  -- 자음군 정답률
  ROUND(AVG(CASE 
    WHEN LENGTH(tr.question_word) >= 4 AND tr.is_whole_word_correct THEN 100.0 
    WHEN LENGTH(tr.question_word) >= 4 THEN 0 
  END), 1) AS 자음군_정답률,
  -- 격차
  ROUND(AVG(CASE 
    WHEN LENGTH(tr.question_word) = 3 AND tr.is_whole_word_correct THEN 100.0 
    WHEN LENGTH(tr.question_word) = 3 THEN 0 
  END) - AVG(CASE 
    WHEN LENGTH(tr.question_word) >= 4 AND tr.is_whole_word_correct THEN 100.0 
    WHEN LENGTH(tr.question_word) >= 4 THEN 0 
  END), 1) AS CVC_자음군_격차
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY tr.user_id, up.full_name, up.class_name
HAVING AVG(CASE 
    WHEN LENGTH(tr.question_word) = 3 AND tr.is_whole_word_correct THEN 100.0 
    WHEN LENGTH(tr.question_word) = 3 THEN 0 
  END) - AVG(CASE 
    WHEN LENGTH(tr.question_word) >= 4 AND tr.is_whole_word_correct THEN 100.0 
    WHEN LENGTH(tr.question_word) >= 4 THEN 0 
  END) > 25
ORDER BY CVC_자음군_격차 DESC;

-- ============================================
-- 10. 실시간 진도 모니터링
-- ============================================

-- 10-1. 학생별 60초 내 완료한 단어 수
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  DATE(tr.created_at) AS 평가일,
  COUNT(*) AS 완료한_단어_수,
  SUM(CASE WHEN tr.is_whole_word_correct THEN 1 ELSE 0 END) AS 맞춘_단어_수,
  -- 1분당 정확 단어 수 (WCPM과 유사)
  ROUND(SUM(CASE WHEN tr.is_whole_word_correct THEN 1 ELSE 0 END) * 1.0, 1) AS WWR_점수
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY tr.user_id, up.full_name, up.class_name, DATE(tr.created_at)
ORDER BY WWR_점수 DESC;

-- 10-2. 평균 단어당 소요 시간 추정
-- (60초 내 몇 개 완료했는지로 역산)
SELECT 
  up.class_name AS 반,
  ROUND(AVG(단어수), 1) AS 평균_완료_단어수,
  ROUND(60.0 / AVG(단어수), 1) AS 단어당_평균_초
FROM (
  SELECT 
    up.class_name,
    tr.user_id,
    DATE(tr.created_at) AS 평가일,
    COUNT(*) AS 단어수
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'NWF'
  GROUP BY up.class_name, tr.user_id, DATE(tr.created_at)
) AS subquery
GROUP BY class_name
ORDER BY 평균_완료_단어수 DESC;

-- ============================================
-- 사용 가이드
-- ============================================

/*
🎯 빠른 분석 순서:

1. 반별 현황 확인
   → 1-1번 쿼리

2. 어려운 단어 파악
   → 1-2번 쿼리

3. 블렌딩 능력 확인
   → 4-1번, 4-2번 쿼리

4. 자음군 능력 확인
   → 5-1번, 5-2번 쿼리

5. 그룹 편성
   → 6-1번 쿼리

6. 개인별 약점 파악
   → 3-2번, 3-3번 쿼리 (UUID 변경)

7. 맞춤형 학습 계획
   → 7-1번 쿼리

📊 결과 내보내기:
   Results → Download CSV → Excel 분석
*/

-- ============================================
-- 교육적 해석 가이드
-- ============================================

/*
🎓 결과 해석:

1. WWR > 85%, CLS > 90%
   → 우수한 파닉스 능력
   → 심화 학습 (복합 패턴, 긴 단어)

2. WWR 70-85%, CLS 80-90%
   → 양호한 파닉스 능력
   → 자음군 연습 강화

3. CLS > 75%, WWR < 60% (격차 15% 이상)
   → 음소는 알지만 블렌딩 약함
   → 블렌딩 활동 집중 (카드 합치기, 빠른 읽기)

4. CLS < 70%, WWR < 55%
   → 기본 파닉스 재학습
   → CVC 패턴부터 다시 시작
   → 1:1 개별 지도 필요

5. 자음군 정답률 < 60%
   → 자음군 집중 연습
   → 특정 blend 패턴 선택 학습
*/

