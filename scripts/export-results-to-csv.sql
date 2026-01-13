-- Supabase SQL Editor에서 실행하여 CSV로 내보내기
-- 각 학교별, 교시별로 데이터를 추출하는 쿼리

-- ============================================================
-- 각 교시별로 별도 파일 생성용 쿼리
-- ============================================================

-- 1교시만 추출 (p1_alphabet) - 모든 학교 학생 포함
WITH latest_sessions AS (
  SELECT 
    user_id,
    test_type,
    DATE_TRUNC('day', created_at) as session_date,
    DATE_PART('hour', created_at) as session_hour,
    MAX(created_at) as latest_session_time
  FROM test_results
  WHERE created_at IS NOT NULL
    AND test_type = 'p1_alphabet'
  GROUP BY user_id, test_type, DATE_TRUNC('day', created_at), DATE_PART('hour', created_at)
),
most_recent_sessions AS (
  SELECT DISTINCT ON (user_id, test_type)
    user_id,
    test_type,
    session_date,
    session_hour
  FROM latest_sessions
  ORDER BY user_id, test_type, latest_session_time DESC
)
SELECT 
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END AS 학교,
  up.grade_level AS 학년,
  up.class_name AS 반,
  up.student_number AS 번호,
  up.full_name AS 이름,
  COUNT(tr.id) AS "풀이한(발화한) 문제의 개수",
  SUM(CASE WHEN tr.is_correct = true THEN 1 ELSE 0 END) AS "맞힌 문제의 개수",
  CASE 
    WHEN COUNT(tr.id) > 0 THEN 
      ROUND((SUM(CASE WHEN tr.is_correct = true THEN 1 ELSE 0 END)::DECIMAL / COUNT(tr.id)::DECIMAL) * 100, 0)
    ELSE 0
  END AS "정답률(%)",
  COALESCE(MAX(tr.time_taken), 0) AS "평가 시간(초)"
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
INNER JOIN test_results tr ON up.id = tr.user_id
INNER JOIN most_recent_sessions mrs ON 
  tr.user_id = mrs.user_id 
  AND tr.test_type = mrs.test_type
  AND DATE_TRUNC('day', tr.created_at) = mrs.session_date
  AND DATE_PART('hour', tr.created_at) = mrs.session_hour
WHERE up.role = 'student'
  AND tr.test_type = 'p1_alphabet'
GROUP BY 
  up.id,
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END,
  up.grade_level,
  up.class_name,
  up.student_number,
  up.full_name
ORDER BY 
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END,
  up.grade_level,
  up.class_name,
  up.student_number;

-- ============================================================
-- 기존 쿼리들 (아래 참고)
-- ============================================================

-- 1. 전체 데이터 조회 (모든 학교, 모든 교시) - 각 교시별 가장 최근 평가 결과만
WITH latest_sessions AS (
  -- 각 학생별, 교시별로 가장 최근 세션 찾기
  SELECT 
    user_id,
    test_type,
    DATE_TRUNC('day', created_at) as session_date,
    DATE_PART('hour', created_at) as session_hour,
    MAX(created_at) as latest_session_time
  FROM test_results
  WHERE created_at IS NOT NULL
  GROUP BY user_id, test_type, DATE_TRUNC('day', created_at), DATE_PART('hour', created_at)
),
most_recent_sessions AS (
  -- 각 학생별, 교시별로 가장 최근 세션만 선택
  SELECT DISTINCT ON (user_id, test_type)
    user_id,
    test_type,
    session_date,
    session_hour
  FROM latest_sessions
  ORDER BY user_id, test_type, latest_session_time DESC
)
SELECT 
  -- 학교 정보 (이메일 도메인에서 추출)
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END AS 학교,
  up.grade_level AS 학년,
  up.class_name AS 반,
  up.student_number AS 번호,
  up.full_name AS 이름,
  tr.test_type AS 교시,
  COUNT(tr.id) AS "풀이한(발화한) 문제의 개수",
  SUM(CASE WHEN tr.is_correct = true THEN 1 ELSE 0 END) AS "맞힌 문제의 개수",
  CASE 
    WHEN COUNT(tr.id) > 0 THEN 
      ROUND((SUM(CASE WHEN tr.is_correct = true THEN 1 ELSE 0 END)::DECIMAL / COUNT(tr.id)::DECIMAL) * 100, 0)
    ELSE 0
  END AS "정답률(%)",
  -- 평가 시간 계산 (최근 세션의 최대 time_taken)
  COALESCE(MAX(tr.time_taken), 0) AS "평가 시간(초)"
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
INNER JOIN test_results tr ON up.id = tr.user_id
INNER JOIN most_recent_sessions mrs ON 
  tr.user_id = mrs.user_id 
  AND tr.test_type = mrs.test_type
  AND DATE_TRUNC('day', tr.created_at) = mrs.session_date
  AND DATE_PART('hour', tr.created_at) = mrs.session_hour
WHERE up.role = 'student'
GROUP BY 
  up.id,
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END,
  up.grade_level,
  up.class_name,
  up.student_number,
  up.full_name,
  tr.test_type
ORDER BY 
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END,
  up.grade_level,
  up.class_name,
  up.student_number,
  tr.test_type;

-- 2. 특정 학교별 데이터 조회 (예: 'danjae' 학교) - 각 교시별 가장 최근 평가 결과만
WITH latest_sessions AS (
  SELECT 
    user_id,
    test_type,
    DATE_TRUNC('day', created_at) as session_date,
    DATE_PART('hour', created_at) as session_hour,
    MAX(created_at) as latest_session_time
  FROM test_results
  WHERE created_at IS NOT NULL
  GROUP BY user_id, test_type, DATE_TRUNC('day', created_at), DATE_PART('hour', created_at)
),
most_recent_sessions AS (
  SELECT DISTINCT ON (user_id, test_type)
    user_id,
    test_type,
    session_date,
    session_hour
  FROM latest_sessions
  ORDER BY user_id, test_type, latest_session_time DESC
)
SELECT 
  up.grade_level AS 학년,
  up.class_name AS 반,
  up.student_number AS 번호,
  up.full_name AS 이름,
  tr.test_type AS 교시,
  COUNT(tr.id) AS "풀이한(발화한) 문제의 개수",
  SUM(CASE WHEN tr.is_correct = true THEN 1 ELSE 0 END) AS "맞힌 문제의 개수",
  CASE 
    WHEN COUNT(tr.id) > 0 THEN 
      ROUND((SUM(CASE WHEN tr.is_correct = true THEN 1 ELSE 0 END)::DECIMAL / COUNT(tr.id)::DECIMAL) * 100, 0)
    ELSE 0
  END AS "정답률(%)",
  -- 평가 시간 계산 (최근 세션의 최대 time_taken)
  COALESCE(MAX(tr.time_taken), 0) AS "평가 시간(초)"
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
INNER JOIN test_results tr ON up.id = tr.user_id
INNER JOIN most_recent_sessions mrs ON 
  tr.user_id = mrs.user_id 
  AND tr.test_type = mrs.test_type
  AND DATE_TRUNC('day', tr.created_at) = mrs.session_date
  AND DATE_PART('hour', tr.created_at) = mrs.session_hour
WHERE up.role = 'student'
  AND SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1) = 'danjae'  -- 학교명 변경
GROUP BY 
  up.id,
  up.grade_level,
  up.class_name,
  up.student_number,
  up.full_name,
  tr.test_type
ORDER BY 
  up.grade_level,
  up.class_name,
  up.student_number,
  tr.test_type;

-- 3. 특정 교시별 데이터 조회 (예: 'p2_segmental_phoneme') - 가장 최근 평가 결과만
WITH latest_sessions AS (
  SELECT 
    user_id,
    test_type,
    DATE_TRUNC('day', created_at) as session_date,
    DATE_PART('hour', created_at) as session_hour,
    MAX(created_at) as latest_session_time
  FROM test_results
  WHERE created_at IS NOT NULL
    AND test_type = 'p2_segmental_phoneme'  -- 교시 변경
  GROUP BY user_id, test_type, DATE_TRUNC('day', created_at), DATE_PART('hour', created_at)
),
most_recent_sessions AS (
  SELECT DISTINCT ON (user_id, test_type)
    user_id,
    test_type,
    session_date,
    session_hour
  FROM latest_sessions
  ORDER BY user_id, test_type, latest_session_time DESC
)
SELECT 
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END AS 학교,
  up.grade_level AS 학년,
  up.class_name AS 반,
  up.student_number AS 번호,
  up.full_name AS 이름,
  COUNT(tr.id) AS "풀이한(발화한) 문제의 개수",
  SUM(CASE WHEN tr.is_correct = true THEN 1 ELSE 0 END) AS "맞힌 문제의 개수",
  CASE 
    WHEN COUNT(tr.id) > 0 THEN 
      ROUND((SUM(CASE WHEN tr.is_correct = true THEN 1 ELSE 0 END)::DECIMAL / COUNT(tr.id)::DECIMAL) * 100, 0)
    ELSE 0
  END AS "정답률(%)",
  -- 평가 시간 계산 (최근 세션의 최대 time_taken)
  COALESCE(MAX(tr.time_taken), 0) AS "평가 시간(초)"
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
INNER JOIN test_results tr ON up.id = tr.user_id
INNER JOIN most_recent_sessions mrs ON 
  tr.user_id = mrs.user_id 
  AND tr.test_type = mrs.test_type
  AND DATE_TRUNC('day', tr.created_at) = mrs.session_date
  AND DATE_PART('hour', tr.created_at) = mrs.session_hour
WHERE up.role = 'student'
  AND tr.test_type = 'p2_segmental_phoneme'  -- 교시 변경
GROUP BY 
  up.id,
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END,
  up.grade_level,
  up.class_name,
  up.student_number,
  up.full_name,
  tr.test_type
ORDER BY 
  CASE 
    WHEN au.email LIKE '%@%' THEN 
      SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
    ELSE '미지정'
  END,
  up.grade_level,
  up.class_name,
  up.student_number;
