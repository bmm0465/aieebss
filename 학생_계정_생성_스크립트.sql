-- ============================================
-- 학생 계정 일괄 생성 및 교사 매칭 스크립트
-- ============================================
-- 총 112명의 학생
-- - 나루초 3학년 다솜반: 24명 (권해경 선생님)
-- - 우암초 3학년 1반: 18명 (이수민 선생님)
-- - 단재초 4학년 1반: 24명 (이수지 선생님)
-- - 단재초 4학년 2반: 23명 (이수지 선생님)
-- - 단재초 4학년 3반: 22명 (이수지 선생님)
-- ============================================

-- ============================================
-- 1단계: 학생 프로필 생성
-- ============================================

-- 나루초 3학년 다솜반 (24명) - 권해경 선생님
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  (gen_random_uuid(), '고도윤', 'student', '나루초 3학년 다솜반', '1', '3학년'),
  (gen_random_uuid(), '권아정', 'student', '나루초 3학년 다솜반', '2', '3학년'),
  (gen_random_uuid(), '김도현', 'student', '나루초 3학년 다솜반', '3', '3학년'),
  (gen_random_uuid(), '김민주', 'student', '나루초 3학년 다솜반', '4', '3학년'),
  (gen_random_uuid(), '김시원', 'student', '나루초 3학년 다솜반', '5', '3학년'),
  (gen_random_uuid(), '김영환', 'student', '나루초 3학년 다솜반', '6', '3학년'),
  (gen_random_uuid(), '김채윤', 'student', '나루초 3학년 다솜반', '7', '3학년'),
  (gen_random_uuid(), '김채이', 'student', '나루초 3학년 다솜반', '8', '3학년'),
  (gen_random_uuid(), '남궁태양', 'student', '나루초 3학년 다솜반', '9', '3학년'),
  (gen_random_uuid(), '박소언', 'student', '나루초 3학년 다솜반', '10', '3학년'),
  (gen_random_uuid(), '서지후', 'student', '나루초 3학년 다솜반', '11', '3학년'),
  (gen_random_uuid(), '손지훈', 'student', '나루초 3학년 다솜반', '12', '3학년'),
  (gen_random_uuid(), '안이랑', 'student', '나루초 3학년 다솜반', '13', '3학년'),
  (gen_random_uuid(), '안지윤', 'student', '나루초 3학년 다솜반', '14', '3학년'),
  (gen_random_uuid(), '양보결', 'student', '나루초 3학년 다솜반', '15', '3학년'),
  (gen_random_uuid(), '윤원교', 'student', '나루초 3학년 다솜반', '16', '3학년'),
  (gen_random_uuid(), '이서현', 'student', '나루초 3학년 다솜반', '17', '3학년'),
  (gen_random_uuid(), '이은도', 'student', '나루초 3학년 다솜반', '18', '3학년'),
  (gen_random_uuid(), '이하윤', 'student', '나루초 3학년 다솜반', '19', '3학년'),
  (gen_random_uuid(), '이한국', 'student', '나루초 3학년 다솜반', '20', '3학년'),
  (gen_random_uuid(), '전민기', 'student', '나루초 3학년 다솜반', '21', '3학년'),
  (gen_random_uuid(), '주태린', 'student', '나루초 3학년 다솜반', '22', '3학년'),
  (gen_random_uuid(), '최민준', 'student', '나루초 3학년 다솜반', '23', '3학년'),
  (gen_random_uuid(), '하태윤', 'student', '나루초 3학년 다솜반', '24', '3학년');

-- 우암초 3학년 1반 (18명) - 이수민 선생님
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  (gen_random_uuid(), '권도형', 'student', '우암초 3학년 1반', '1', '3학년'),
  (gen_random_uuid(), '김윤희', 'student', '우암초 3학년 1반', '2', '3학년'),
  (gen_random_uuid(), '노영진', 'student', '우암초 3학년 1반', '3', '3학년'),
  (gen_random_uuid(), '심치우', 'student', '우암초 3학년 1반', '4', '3학년'),
  (gen_random_uuid(), '양진솔', 'student', '우암초 3학년 1반', '5', '3학년'),
  (gen_random_uuid(), '유혜린', 'student', '우암초 3학년 1반', '6', '3학년'),
  (gen_random_uuid(), '이다원', 'student', '우암초 3학년 1반', '7', '3학년'),
  (gen_random_uuid(), '이상준', 'student', '우암초 3학년 1반', '8', '3학년'),
  (gen_random_uuid(), '이서진', 'student', '우암초 3학년 1반', '9', '3학년'),
  (gen_random_uuid(), '이시준', 'student', '우암초 3학년 1반', '10', '3학년'),
  (gen_random_uuid(), '이유준', 'student', '우암초 3학년 1반', '11', '3학년'),
  (gen_random_uuid(), '정태연', 'student', '우암초 3학년 1반', '12', '3학년'),
  (gen_random_uuid(), '지윤호', 'student', '우암초 3학년 1반', '13', '3학년'),
  (gen_random_uuid(), '천승민', 'student', '우암초 3학년 1반', '14', '3학년'),
  (gen_random_uuid(), '한진후', 'student', '우암초 3학년 1반', '15', '3학년'),
  (gen_random_uuid(), '최유나', 'student', '우암초 3학년 1반', '16', '3학년'),
  (gen_random_uuid(), '홍은찬', 'student', '우암초 3학년 1반', '17', '3학년'),
  (gen_random_uuid(), '임진용', 'student', '우암초 3학년 1반', '18', '3학년');

-- 단재초 4학년 1반 (24명) - 이수지 선생님
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  (gen_random_uuid(), '강지안', 'student', '단재초 4학년 1반', '1', '4학년'),
  (gen_random_uuid(), '곽수민', 'student', '단재초 4학년 1반', '2', '4학년'),
  (gen_random_uuid(), '김가연', 'student', '단재초 4학년 1반', '3', '4학년'),
  (gen_random_uuid(), '김범종', 'student', '단재초 4학년 1반', '4', '4학년'),
  (gen_random_uuid(), '김지유', 'student', '단재초 4학년 1반', '5', '4학년'),
  (gen_random_uuid(), '김채하', 'student', '단재초 4학년 1반', '6', '4학년'),
  (gen_random_uuid(), '류하록', 'student', '단재초 4학년 1반', '7', '4학년'),
  (gen_random_uuid(), '민 훈', 'student', '단재초 4학년 1반', '8', '4학년'),
  (gen_random_uuid(), '박서아', 'student', '단재초 4학년 1반', '9', '4학년'),
  (gen_random_uuid(), '박서연', 'student', '단재초 4학년 1반', '10', '4학년'),
  (gen_random_uuid(), '박소은', 'student', '단재초 4학년 1반', '11', '4학년'),
  (gen_random_uuid(), '박준서', 'student', '단재초 4학년 1반', '12', '4학년'),
  (gen_random_uuid(), '배주현', 'student', '단재초 4학년 1반', '13', '4학년'),
  (gen_random_uuid(), '서하랑', 'student', '단재초 4학년 1반', '14', '4학년'),
  (gen_random_uuid(), '이선후', 'student', '단재초 4학년 1반', '15', '4학년'),
  (gen_random_uuid(), '이승빈', 'student', '단재초 4학년 1반', '16', '4학년'),
  (gen_random_uuid(), '이연섭', 'student', '단재초 4학년 1반', '17', '4학년'),
  (gen_random_uuid(), '이영서', 'student', '단재초 4학년 1반', '18', '4학년'),
  (gen_random_uuid(), '임정묵', 'student', '단재초 4학년 1반', '19', '4학년'),
  (gen_random_uuid(), '전은찬', 'student', '단재초 4학년 1반', '20', '4학년'),
  (gen_random_uuid(), '정우성', 'student', '단재초 4학년 1반', '21', '4학년'),
  (gen_random_uuid(), '정우태', 'student', '단재초 4학년 1반', '22', '4학년'),
  (gen_random_uuid(), '홍지호', 'student', '단재초 4학년 1반', '23', '4학년'),
  (gen_random_uuid(), '김민기', 'student', '단재초 4학년 1반', '24', '4학년');

-- 단재초 4학년 2반 (23명) - 이수지 선생님
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  (gen_random_uuid(), '남윤석', 'student', '단재초 4학년 2반', '1', '4학년'),
  (gen_random_uuid(), '류영아', 'student', '단재초 4학년 2반', '2', '4학년'),
  (gen_random_uuid(), '박민서', 'student', '단재초 4학년 2반', '3', '4학년'),
  (gen_random_uuid(), '박서아', 'student', '단재초 4학년 2반', '4', '4학년'),
  (gen_random_uuid(), '박세용', 'student', '단재초 4학년 2반', '5', '4학년'),
  (gen_random_uuid(), '박수현', 'student', '단재초 4학년 2반', '6', '4학년'),
  (gen_random_uuid(), '박영환', 'student', '단재초 4학년 2반', '7', '4학년'),
  (gen_random_uuid(), '박주완', 'student', '단재초 4학년 2반', '8', '4학년'),
  (gen_random_uuid(), '박지현', 'student', '단재초 4학년 2반', '9', '4학년'),
  (gen_random_uuid(), '손리아', 'student', '단재초 4학년 2반', '10', '4학년'),
  (gen_random_uuid(), '신이찬', 'student', '단재초 4학년 2반', '11', '4학년'),
  (gen_random_uuid(), '유시윤', 'student', '단재초 4학년 2반', '12', '4학년'),
  (gen_random_uuid(), '유채아', 'student', '단재초 4학년 2반', '13', '4학년'),
  (gen_random_uuid(), '윤서희', 'student', '단재초 4학년 2반', '14', '4학년'),
  (gen_random_uuid(), '이상윤', 'student', '단재초 4학년 2반', '15', '4학년'),
  (gen_random_uuid(), '이선우', 'student', '단재초 4학년 2반', '16', '4학년'),
  (gen_random_uuid(), '이정준', 'student', '단재초 4학년 2반', '17', '4학년'),
  (gen_random_uuid(), '이준후', 'student', '단재초 4학년 2반', '18', '4학년'),
  (gen_random_uuid(), '이효원', 'student', '단재초 4학년 2반', '19', '4학년'),
  (gen_random_uuid(), '장지우', 'student', '단재초 4학년 2반', '20', '4학년'),
  (gen_random_uuid(), '조윤지', 'student', '단재초 4학년 2반', '21', '4학년'),
  (gen_random_uuid(), '조주원', 'student', '단재초 4학년 2반', '22', '4학년'),
  (gen_random_uuid(), '한민기', 'student', '단재초 4학년 2반', '23', '4학년');

-- 단재초 4학년 3반 (22명) - 이수지 선생님
INSERT INTO user_profiles (id, full_name, role, class_name, student_number, grade_level)
VALUES 
  (gen_random_uuid(), '강지우', 'student', '단재초 4학년 3반', '1', '4학년'),
  (gen_random_uuid(), '구본준', 'student', '단재초 4학년 3반', '2', '4학년'),
  (gen_random_uuid(), '권준서', 'student', '단재초 4학년 3반', '3', '4학년'),
  (gen_random_uuid(), '김승후', 'student', '단재초 4학년 3반', '4', '4학년'),
  (gen_random_uuid(), '김시우', 'student', '단재초 4학년 3반', '5', '4학년'),
  (gen_random_uuid(), '김준우', 'student', '단재초 4학년 3반', '6', '4학년'),
  (gen_random_uuid(), '노하연', 'student', '단재초 4학년 3반', '7', '4학년'),
  (gen_random_uuid(), '라윤서', 'student', '단재초 4학년 3반', '8', '4학년'),
  (gen_random_uuid(), '류다은', 'student', '단재초 4학년 3반', '9', '4학년'),
  (gen_random_uuid(), '민채원', 'student', '단재초 4학년 3반', '10', '4학년'),
  (gen_random_uuid(), '박영민', 'student', '단재초 4학년 3반', '11', '4학년'),
  (gen_random_uuid(), '박지현', 'student', '단재초 4학년 3반', '12', '4학년'),
  (gen_random_uuid(), '서준혁', 'student', '단재초 4학년 3반', '13', '4학년'),
  (gen_random_uuid(), '성수현', 'student', '단재초 4학년 3반', '14', '4학년'),
  (gen_random_uuid(), '오승준', 'student', '단재초 4학년 3반', '15', '4학년'),
  (gen_random_uuid(), '이봄', 'student', '단재초 4학년 3반', '16', '4학년'),
  (gen_random_uuid(), '이승민', 'student', '단재초 4학년 3반', '17', '4학년'),
  (gen_random_uuid(), '이승재', 'student', '단재초 4학년 3반', '18', '4학년'),
  (gen_random_uuid(), '최서원', 'student', '단재초 4학년 3반', '19', '4학년'),
  (gen_random_uuid(), '최지원', 'student', '단재초 4학년 3반', '20', '4학년'),
  (gen_random_uuid(), '허윤서', 'student', '단재초 4학년 3반', '21', '4학년'),
  (gen_random_uuid(), '홍유비', 'student', '단재초 4학년 3반', '22', '4학년');

-- ============================================
-- 2단계: 교사에게 학생 배정
-- ============================================

-- 권해경 선생님 (14ea1f09-1c7f-43eb-95cf-1b491dd876a4)에게 나루초 3학년 다솜반 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
SELECT 
  '14ea1f09-1c7f-43eb-95cf-1b491dd876a4',
  id,
  class_name
FROM user_profiles
WHERE role = 'student' AND class_name = '나루초 3학년 다솜반'
ON CONFLICT (teacher_id, student_id) DO NOTHING;

-- 이수민 선생님 (fe2e88ce-bc53-4c37-825b-4bff261ef1a9)에게 우암초 3학년 1반 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
SELECT 
  'fe2e88ce-bc53-4c37-825b-4bff261ef1a9',
  id,
  class_name
FROM user_profiles
WHERE role = 'student' AND class_name = '우암초 3학년 1반'
ON CONFLICT (teacher_id, student_id) DO NOTHING;

-- 이수지 선생님 (3c9db811-8b08-48bc-8f0e-d515fa045d51)에게 단재초 4학년 1,2,3반 배정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
SELECT 
  '3c9db811-8b08-48bc-8f0e-d515fa045d51',
  id,
  class_name
FROM user_profiles
WHERE role = 'student' 
  AND class_name IN ('단재초 4학년 1반', '단재초 4학년 2반', '단재초 4학년 3반')
ON CONFLICT (teacher_id, student_id) DO NOTHING;

-- ============================================
-- 3단계: 결과 확인
-- ============================================

-- 등록된 학생 수 확인
SELECT 
  class_name,
  COUNT(*) as student_count
FROM user_profiles
WHERE role = 'student'
  AND class_name IN (
    '나루초 3학년 다솜반',
    '우암초 3학년 1반',
    '단재초 4학년 1반',
    '단재초 4학년 2반',
    '단재초 4학년 3반'
  )
GROUP BY class_name
ORDER BY class_name;

-- 교사별 담당 학생 수 확인
SELECT 
  up_teacher.full_name AS teacher_name,
  tsa.class_name,
  COUNT(tsa.student_id) AS student_count
FROM teacher_student_assignments tsa
JOIN user_profiles up_teacher ON tsa.teacher_id = up_teacher.id
WHERE tsa.teacher_id IN (
  '14ea1f09-1c7f-43eb-95cf-1b491dd876a4',  -- 권해경
  'fe2e88ce-bc53-4c37-825b-4bff261ef1a9',  -- 이수민
  '3c9db811-8b08-48bc-8f0e-d515fa045d51'   -- 이수지
)
GROUP BY up_teacher.full_name, tsa.class_name
ORDER BY up_teacher.full_name, tsa.class_name;

-- 전체 요약
SELECT 
  '총 학생 수' AS category,
  COUNT(*) AS count
FROM user_profiles
WHERE role = 'student'
  AND class_name IN (
    '나루초 3학년 다솜반',
    '우암초 3학년 1반',
    '단재초 4학년 1반',
    '단재초 4학년 2반',
    '단재초 4학년 3반'
  );

