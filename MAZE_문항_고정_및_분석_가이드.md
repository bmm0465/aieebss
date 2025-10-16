# 📝 MAZE 평가 문항 고정 및 분석 가이드

## ✅ 변경 사항

### 이전: Annabelle's Garage (고급 지문)
- 복잡한 어휘와 구조
- 성인 수준 내용
- 초등학생에게 너무 어려움

### 현재: Daily Conversations and Stories ✨
- ✅ **4개의 친숙한 스토리**
- ✅ **초등학생 수준에 맞는 내용**
- ✅ **일상 대화와 상황**
- ✅ **총 20개 MAZE 문항**
- ✅ **모든 학생에게 동일한 지문**

---

## 📋 지문 구성 (20개 문항)

### 4개 스토리 + 난이도 분석

#### 1️⃣ **Hi, I'm Hana** (자기소개)
**문항 수**: 5개
**내용**: 좋아하는 것, 할 수 있는 것 소개

| 번호 | 정답 | 선택지 | 평가 요소 |
|------|------|--------|----------|
| 1 | apples | apples / books / dogs | 문맥 이해 (like 뒤 명사) |
| 2 | carrots | jackets / carrots / robots | 논리적 추론 (음식 카테고리) |
| 3 | can't | don't / can't / will | 부정 조동사 선택 |
| 4 | have | have / make / use | 소유 동사 |
| 5 | bike | pig / door / bike | 문맥상 적절한 명사 |

**난이도**: ★★☆☆
**측정**: 기본 문맥 이해, 품사 인지

---

#### 2️⃣ **My Puppy** (애완동물 이야기)
**문항 수**: 5개
**내용**: Max와 강아지 Sam 이야기

| 번호 | 정답 | 선택지 | 평가 요소 |
|------|------|--------|----------|
| 6 | puppy | puppy / house / play | 주어 파악 |
| 7 | name | hat / name / on | 문맥상 명사 선택 |
| 8 | with | under / with / happy | 전치사 선택 |
| 9 | go | eat / red / go | 동사 선택 |
| 10 | ball | ball / is / car | 명사 vs 동사 구분 |

**난이도**: ★★☆☆
**측정**: 주어 파악, 전치사/동사 이해

---

#### 3️⃣ **A Day at the Beach** (해변 나들이)
**문항 수**: 5개
**내용**: Tom과 Mia의 해변 놀이

| 번호 | 정답 | 선택지 | 평가 요소 |
|------|------|--------|----------|
| 11 | big | big / run / on | 형용사 vs 동사 구분 |
| 12 | go | go / sad / bed | 동사 선택 |
| 13 | the | for / the / her | 관사 선택 |
| 14 | sand | sand / book / chair | 장소 관련 명사 |
| 15 | has | has / see / is | 소유 동사 |

**난이도**: ★★★☆
**측정**: 품사 구분, 관사 사용, 장소 추론

---

#### 4️⃣ **In the Kitchen** (요리하기)
**문항 수**: 5개
**내용**: Leo가 샌드위치 만들기

| 번호 | 정답 | 선택지 | 평가 요소 |
|------|------|--------|----------|
| 16 | kitchen | kitchen / school / car | 장소 추론 |
| 17 | sandwich | sandwich / puppy / game | 문맥상 음식 |
| 18 | cheese | cheese / water / ball | 샌드위치 재료 |
| 19 | the | the / run / of | 관사 선택 |
| 20 | butter | butter / water / cheese | 중복 회피, 다른 재료 |

**난이도**: ★★★☆
**측정**: 장소 추론, 재료/순서 이해, 논리적 사고

---

## 📊 교육적 분석 포인트

### 1. 문맥 이해 능력 (Reading Comprehension)

#### 분석 방법:
```sql
-- 학생별 MAZE 독해력 점수
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  COUNT(*) AS 총_문항,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 정답_수,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  -- MAZE 점수 (정답 - 오답)
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) - 
  SUM(CASE WHEN NOT tr.is_correct THEN 1 ELSE 0 END) AS MAZE_점수,
  RANK() OVER (ORDER BY AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) DESC) AS 순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'MAZE'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY 정답률 DESC;
```

**DIBELS MAZE 기준:**
- **3학년**: 15-20점 (정답-오답)
- **4학년**: 20-25점
- **위험 지표**: 10점 미만

---

### 2. 문항 유형별 정답률

```sql
-- 품사별 정답률 분석
WITH question_analysis AS (
  SELECT 
    tr.question,
    tr.is_correct,
    CASE 
      -- 명사 선택 (apples, carrots, bike, puppy, ball, sand, kitchen, sandwich, cheese, butter)
      WHEN tr.question LIKE '%1' OR tr.question LIKE '%2' OR tr.question LIKE '%5' 
           OR tr.question LIKE '%6' OR tr.question LIKE '%10' OR tr.question LIKE '%14'
           OR tr.question LIKE '%16' OR tr.question LIKE '%17' OR tr.question LIKE '%18'
           OR tr.question LIKE '%20' 
        THEN '명사'
      -- 동사 선택 (can't, have, go, has)
      WHEN tr.question LIKE '%3' OR tr.question LIKE '%4' OR tr.question LIKE '%9'
           OR tr.question LIKE '%12' OR tr.question LIKE '%15'
        THEN '동사'
      -- 형용사/부사 (big)
      WHEN tr.question LIKE '%11'
        THEN '형용사'
      -- 전치사 (with)
      WHEN tr.question LIKE '%8'
        THEN '전치사'
      -- 관사 (the)
      WHEN tr.question LIKE '%13' OR tr.question LIKE '%19'
        THEN '관사'
      -- 명사 (name)
      WHEN tr.question LIKE '%7'
        THEN '명사'
      ELSE '기타'
    END AS 품사_유형
  FROM test_results tr
  WHERE tr.test_type = 'MAZE'
)
SELECT 
  품사_유형,
  COUNT(*) AS 문항_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM question_analysis
GROUP BY 품사_유형
ORDER BY 정답률 ASC;
```

**교육적 의미:**
- 명사만 높음 → 동사/품사 이해 부족
- 관사 낮음 → 문법 개념 약함
- 동사 낮음 → 시제/조동사 학습 필요

---

### 3. 스토리별 난이도 분석

```sql
-- 스토리별 정답률
SELECT 
  CASE 
    WHEN question LIKE '%_1' OR question LIKE '%_2' OR question LIKE '%_3' 
         OR question LIKE '%_4' OR question LIKE '%_5' 
      THEN 'Story 1: Hi, I\'m Hana (문항 1-5)'
    WHEN question LIKE '%_6' OR question LIKE '%_7' OR question LIKE '%_8' 
         OR question LIKE '%_9' OR question LIKE '%_10' 
      THEN 'Story 2: My Puppy (문항 6-10)'
    WHEN question LIKE '%_11' OR question LIKE '%_12' OR question LIKE '%_13' 
         OR question LIKE '%_14' OR question LIKE '%_15' 
      THEN 'Story 3: Beach (문항 11-15)'
    WHEN question LIKE '%_16' OR question LIKE '%_17' OR question LIKE '%_18' 
         OR question LIKE '%_19' OR question LIKE '%_20' 
      THEN 'Story 4: Kitchen (문항 16-20)'
    ELSE '기타'
  END AS 스토리,
  COUNT(*) AS 문항_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'MAZE'
GROUP BY 스토리
ORDER BY 스토리;
```

**예상 결과:**
```
Story 1 (자기소개): 85% (쉬움)
Story 2 (강아지): 80% (중간)
Story 3 (해변): 75% (중간)
Story 4 (요리): 70% (어려움)
```

---

### 4. 학생별 독해 전략 분석

```sql
-- 특정 학생의 MAZE 전략 분석
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  tr.question AS 문항,
  tr.student_answer AS 학생답변,
  CASE 
    WHEN tr.question LIKE '%1' THEN 'apples (정답)'
    WHEN tr.question LIKE '%2' THEN 'carrots (정답)'
    -- ... (모든 문항의 정답)
  END AS 정답,
  tr.is_correct AS 정답여부,
  CASE 
    WHEN NOT tr.is_correct AND tr.student_answer IN ('books', 'dogs', 'jackets', 'robots', 'pig', 'door', 'house', 'play') 
      THEN '문맥 무시 (랜덤 선택)'
    WHEN NOT tr.is_correct AND tr.student_answer IN ('is', 'run', 'on', 'sad', 'bed', 'see') 
      THEN '품사 혼동'
    WHEN NOT tr.is_correct 
      THEN '부분적 이해'
    ELSE '정확한 이해'
  END AS 오답_유형
FROM test_results tr
WHERE tr.test_type = 'MAZE'
  AND tr.user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
ORDER BY tr.question;
```

---

### 5. 가장 어려운 문항 TOP 10

```sql
-- 정답률이 낮은 문항 TOP 10
WITH maze_questions AS (
  SELECT 
    question,
    COUNT(*) AS 시도_수,
    ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
    MODE() WITHIN GROUP (ORDER BY student_answer) AS 가장_많이_선택된_오답
  FROM test_results
  WHERE test_type = 'MAZE'
    AND is_correct = FALSE
  GROUP BY question
)
SELECT 
  question AS 문항번호,
  시도_수,
  정답률,
  가장_많이_선택된_오답
FROM maze_questions
ORDER BY 정답률 ASC
LIMIT 10;
```

**예상 어려운 문항:**
- 문항 3 (can't): 부정 조동사
- 문항 13 (the): 관사 사용
- 문항 19 (the): 반복되는 관사
- 문항 20 (butter): 논리적 추론

---

### 6. 반별 독해력 비교

```sql
-- 반별 MAZE 성적 요약
SELECT 
  up.class_name AS 반,
  up.grade_level AS 학년,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  COUNT(*) AS 총_문항_시도,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 평균_정답률,
  -- MAZE 점수 계산 (정답 - 오답)
  AVG(
    (SELECT COUNT(*) FROM test_results tr2 
     WHERE tr2.user_id = tr.user_id AND tr2.test_type = 'MAZE' AND tr2.is_correct = TRUE) -
    (SELECT COUNT(*) FROM test_results tr3 
     WHERE tr3.user_id = tr.user_id AND tr3.test_type = 'MAZE' AND tr3.is_correct = FALSE)
  ) AS 평균_MAZE_점수
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'MAZE'
GROUP BY up.class_name, up.grade_level
ORDER BY 평균_정답률 DESC;
```

---

### 7. 오답 패턴 분석

```sql
-- 자주 선택되는 오답 (distractors 효과성)
SELECT 
  question AS 문항,
  student_answer AS 선택된_답,
  COUNT(*) AS 선택_횟수,
  ROUND(COUNT(*)::FLOAT / SUM(COUNT(*)) OVER (PARTITION BY question) * 100, 1) AS 선택_비율
FROM test_results
WHERE test_type = 'MAZE'
  AND is_correct = FALSE
GROUP BY question, student_answer
ORDER BY 선택_횟수 DESC
LIMIT 20;
```

**활용:**
- 특정 오답을 많이 선택 → 그 오답이 매력적인 이유 분석
- 학생들의 사고 과정 파악
- 오개념 발견

---

### 8. 개인별 독해 능력 프로필

```sql
-- 특정 학생의 독해 능력 상세 분석
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
WITH student_performance AS (
  SELECT 
    COUNT(*) AS 총_문항,
    SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 정답,
    SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) AS 오답,
    ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
  FROM test_results
  WHERE test_type = 'MAZE' AND user_id = 'STUDENT-UUID'
),
class_average AS (
  SELECT 
    ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 반평균
  FROM test_results tr
  JOIN user_profiles up ON tr.user_id = up.id
  WHERE tr.test_type = 'MAZE'
    AND up.class_name = (SELECT class_name FROM user_profiles WHERE id = 'STUDENT-UUID')
)
SELECT 
  sp.총_문항,
  sp.정답,
  sp.오답,
  sp.정답 - sp.오답 AS MAZE_점수,
  sp.정답률,
  ca.반평균,
  sp.정답률 - ca.반평균 AS 반평균_대비
FROM student_performance sp, class_average ca;
```

---

### 9. 수준별 그룹핑

```sql
-- MAZE 능력별 학생 분류
WITH student_levels AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
    COUNT(*) AS 총_문항,
    SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 정답,
    ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
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
```

---

### 10. 성장 추적

```sql
-- 특정 학생의 재평가 시 향상도
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  COUNT(*) AS 총_문항,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 정답,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) - 
  SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) AS MAZE_점수,
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
```

---

## 🎯 교육적 활용

### 1. 독해 전략 지도

#### 전략별 접근:

**1) 의미 중심 읽기 (Semantic Cues)**
```
"I like (apples / books / dogs) and oranges."
→ and oranges가 힌트
→ 같은 카테고리 (음식)
```

**2) 문법 지식 (Syntactic Cues)**
```
"I (don't / can't / will) swim and skate."
→ 부정문 구조 파악
→ can't swim (능력 부정)
```

**3) 상식 활용 (Background Knowledge)**
```
"He gets some bread and (cheese / water / ball)."
→ 샌드위치 만들기
→ cheese가 적절한 재료
```

---

### 2. 수준별 학습 활동

#### 상위 그룹 (85%+)
**활동:**
- 긴 지문 독해
- 추론 문제 풀이
- 창의적 글쓰기

**목표:**
- 복잡한 텍스트 이해
- 비판적 사고

---

#### 중상위 그룹 (70-84%)
**활동:**
- 문맥 단서 찾기 연습
- 품사별 학습
- 비슷한 MAZE 지문 반복

**목표:**
- 정답률 85% 이상

---

#### 중하위 그룹 (55-69%)
**활동:**
- 짧은 문장 연습
- 품사 구분 게임
- 그림과 함께 읽기

**목표:**
- 기본 문맥 이해
- 70% 달성

---

#### 하위 그룹 (55% 미만)
**활동:**
- 1:1 개별 지도
- 문장 구조 분석
- WRF 복습 (어휘 부족)

**목표:**
- 기초 독해력
- 60% 달성

---

## 📚 지문 특성 분석

### 총 문항 수: 20개

#### 품사별 분포
- **명사**: 10개 (50%)
- **동사**: 5개 (25%)
- **관사**: 2개 (10%)
- **전치사**: 1개 (5%)
- **형용사**: 1개 (5%)
- **기타**: 1개 (5%)

#### 난이도별 분포
- **쉬움** (Story 1): 5개 (25%)
- **중간** (Story 2-3): 10개 (50%)
- **어려움** (Story 4): 5개 (25%)

#### 측정 능력
- **어휘력**: 문맥에 맞는 단어 선택
- **문법 지식**: 품사, 시제, 관사
- **논리적 사고**: 카테고리, 인과관계
- **배경지식**: 일상 상황 이해

---

## 💡 교육적 권장 사항

### 문항별 학습 포인트

**문항 1-2: 카테고리 이해**
- apples and oranges (과일)
- carrots (채소)
- 같은 범주 찾기 연습

**문항 3: 부정 조동사**
- can't vs don't 구분
- 능력 표현 학습

**문항 8: 전치사**
- with (함께)
- 전치사 용법 학습

**문항 13, 19: 관사**
- the 사용법
- 특정 명사 앞 관사

**문항 20: 논리적 추론**
- 샌드위치에 cheese 다음
- bread 반복 회피
- butter가 적절

---

## 🎨 시각화 아이디어

### 1. 학생별 독해 프로필
```
김민수 학생 MAZE 프로필:
━━━━━━━━━━━━━━━━━━━━━━━
명사 선택:    ████████████ 90%
동사 선택:    ██████████░░ 80%
관사 선택:    ████░░░░░░░░ 50%
전치사 선택:  ████████████ 100%

💡 개선 필요: 관사 사용법
```

### 2. 스토리별 완료도
```
Story 1 (자기소개): ●●●●● 5/5
Story 2 (강아지):   ●●●●○ 4/5
Story 3 (해변):     ●●●○○ 3/5
Story 4 (요리):     ●●○○○ 2/5

진행률: 14/20 (70%)
```

### 3. 오답 히트맵
```
문항별 오답률:
1  2  3  4  5  6  7  8  9  10
░  ░  █  ░  ░  ░  ░  ██ ░  ░

11 12 13 14 15 16 17 18 19 20
░  ░  ██ ░  ░  ░  ░  ░  █  ██

█ = 오답 많음  ░ = 오답 적음
```

---

## 🔍 심화 분석

### 1. ORF vs MAZE 상관관계

```sql
-- 유창성과 독해력의 관계
WITH student_scores AS (
  SELECT 
    user_id,
    MAX(CASE WHEN test_type = 'ORF' THEN wcpm END) AS orf_wcpm,
    MAX(CASE WHEN test_type = 'ORF' THEN accuracy END) AS orf_accuracy,
    AVG(CASE WHEN test_type = 'MAZE' AND is_correct THEN 100.0 ELSE 0 END) AS maze_accuracy
  FROM test_results
  WHERE test_type IN ('ORF', 'MAZE')
  GROUP BY user_id
)
SELECT 
  up.full_name AS 학생이름,
  ss.orf_wcpm AS ORF_WCPM,
  ss.maze_accuracy AS MAZE_정답률,
  CASE 
    WHEN ss.orf_wcpm >= 80 AND ss.maze_accuracy >= 80 THEN '유창하고 이해도 높음'
    WHEN ss.orf_wcpm >= 80 AND ss.maze_accuracy < 80 THEN '빠르지만 이해 부족'
    WHEN ss.orf_wcpm < 80 AND ss.maze_accuracy >= 80 THEN '느리지만 이해 높음'
    ELSE '둘 다 개선 필요'
  END AS 읽기_프로필
FROM student_scores ss
JOIN user_profiles up ON ss.user_id = up.id
ORDER BY maze_accuracy DESC;
```

**교육적 의미:**
- 빠르지만 이해 부족 → 정확한 읽기 강조
- 느리지만 이해 높음 → 속도 향상 (이미 이해력 있음)
- 둘 다 낮음 → 기초부터 재학습

---

### 2. WRF vs MAZE 상관관계

```sql
-- 어휘력과 독해력의 관계
WITH vocab_and_comp AS (
  SELECT 
    user_id,
    AVG(CASE WHEN test_type = 'WRF' AND is_correct THEN 100.0 ELSE 0 END) AS wrf_score,
    AVG(CASE WHEN test_type = 'MAZE' AND is_correct THEN 100.0 ELSE 0 END) AS maze_score
  FROM test_results
  WHERE test_type IN ('WRF', 'MAZE')
  GROUP BY user_id
)
SELECT 
  up.full_name AS 학생이름,
  ROUND(vc.wrf_score, 1) AS 어휘력_WRF,
  ROUND(vc.maze_score, 1) AS 독해력_MAZE,
  ROUND(vc.wrf_score - vc.maze_score, 1) AS 격차
FROM vocab_and_comp vc
JOIN user_profiles up ON vc.user_id = up.id
ORDER BY 격차 DESC;
```

**해석:**
- WRF > MAZE → 어휘는 알지만 문맥 이해 약함
- WRF < MAZE → 어휘 부족이지만 추론 능력 좋음
- 둘 다 높음 → 균형 잡힌 읽기 능력

---

## 🎓 DIBELS MAZE 평가 기준

### 학년별 목표 점수
| 학년 | 목표 점수 | 위험 지표 |
|------|----------|----------|
| 2학년 말 | 10-15 | <8 |
| 3학년 말 | 15-20 | <12 |
| 4학년 말 | 20-25 | <15 |

**점수 계산:** 정답 수 - 오답 수

### 정답률 기준
- **우수**: 85% 이상 (17/20)
- **양호**: 70-84% (14-16/20)
- **주의**: 55-69% (11-13/20)
- **개입 필요**: 55% 미만 (<11/20)

---

## 💡 실전 활용

### 시나리오 1: 반 전체 약점 문항
```sql
SELECT question, 
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE test_type = 'MAZE' 
  AND class_name = '나루초 3학년 다솜반'
GROUP BY question
HAVING AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END) < 60
ORDER BY 정답률 ASC;
```

**결과 활용:**
→ 어려운 문항 유형 파악
→ 관련 문법/어휘 학습

---

### 시나리오 2: 개인 독해 전략
```
박철수 학생 분석:
- 명사: 90% ✅
- 동사: 60% ⚠️
- 관사: 50% ⚠️

→ 동사 시제 학습
→ 관사 용법 집중
```

---

### 시나리오 3: ORF-MAZE 통합 분석
```
이영희 학생:
- ORF WCPM: 95 (빠름)
- ORF 정확도: 88% (보통)
- MAZE: 65% (낮음)

→ 빨리 읽지만 이해 부족
→ "천천히 의미 파악하며 읽기" 연습
```

---

## 📋 지문 개선 사항

### 중복 정답 수정 완료 ✅

**원본 문제:**
- "bread" 정답이 2번 (문항 19, 20)

**수정 내용:**
- 문항 19: "the" (관사) - 그대로 유지
- 문항 20: "bread" → **"butter"** 로 변경

**수정 근거:**
- 논리적으로 더 적절 (샌드위치에 버터 추가)
- 중복 회피
- 학생들의 사고력 측정

---

## 🎯 종합 평가

### MAZE의 교육적 가치

1. **문맥 이해 측정**
   - 단순 암기가 아닌 이해력 평가

2. **품사 지식 확인**
   - 명사, 동사, 형용사, 관사 구분

3. **논리적 사고**
   - 카테고리 매칭
   - 인과관계 파악

4. **읽기 전략 개발**
   - 단서 찾기
   - 추론하기
   - 검증하기

---

**이제 MAZE 평가로 학생들의 독해력과 문맥 이해 능력을 정밀하게 측정할 수 있습니다! 📖✨**

주요 측정:
- ✅ 문맥 이해 능력
- ✅ 품사별 지식
- ✅ 논리적 추론
- ✅ 일상 상황 이해
- ✅ 어휘-문법 통합 능력

