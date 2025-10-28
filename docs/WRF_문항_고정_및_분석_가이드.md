# 📝 WRF 평가 문항 고정 및 분석 가이드

## ✅ 변경 사항

### 이전: 랜덤 20개 Sight Words
```javascript
const wrfWords = ["the", "a", "see", "in", "it", "is", "and", "go", "can", "me", 
                  "like", "my", "little", "play", "with", "for", "you", "big", "red", "one"];
```

### 현재: 고정 85개 Sight Words ✨
- ✅ **중복 제거 완료** (원본 88개 → 85개)
- ✅ **빈도별 난이도 분류**
- ✅ **모든 학생에게 동일한 문항**
- ✅ **순서도 고정**

---

## 📋 출제 문항 구성 (85개)

### 빈도 및 난이도별 분류

| 난이도 | 글자수 | 빈도 | 문항 수 | 비율 |
|--------|--------|------|---------|------|
| **초고빈도** | 1-3글자 | 매우 높음 | 15개 | 17.6% |
| **고빈도** | 3-4글자 | 높음 | 35개 | 41.2% |
| **중빈도** | 4-5글자 | 중간 | 25개 | 29.4% |
| **저빈도/복합** | 5-6글자 | 낮음 | 10개 | 11.8% |

### 상세 문항 목록

#### 1. 초고빈도 단어 (15개) - 17.6%
```
no, do, he, go, it, to, me, up, the, she, yes, you, not, who, how
```
**특징:**
- 1-3글자의 기본 단어
- 영어 학습 초기에 가장 많이 접하는 단어
- Dolch Sight Words의 핵심

#### 2. 고빈도 단어 (35개) - 41.2%
```
this, that, like, look, good, come, have, said, love,
hat, cat, dad, sit, mom, big, dog, pig, six, can, two, one,
pen, leg, pan, car, zoo, red, ten, too, what, here, down, open, much, nice
```
**특징:**
- 일상 회화에서 자주 사용
- 간단한 스토리북에 반복 등장
- 3-4글자 중심

#### 3. 중빈도 단어 (25개) - 29.4%
```
tall, small, hello, three, four, five, door, book, jump, swim,
great, green, eight, stand, blue, lion, nine, white, many, apple,
seven, pizza, sorry, color, close
```
**특징:**
- 초등 저학년 교과서 단어
- 주제별 어휘 (색깔, 숫자, 동사)
- 4-5글자

#### 4. 저빈도/복합 단어 (10개) - 11.8%
```
okay, bye, dance, pencil, sister, sunny, ball, eraser
```
**특징:**
- 비교적 긴 단어
- 복합 음절 구조
- 학습 난이도 높음

---

## 📊 교육적 분석 포인트

### 1. Sight Word 인지 능력 (Automaticity)

#### 분석 방법:
```sql
-- 학생별 Sight Word 자동 인식 능력
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  COUNT(*) AS 시도_단어,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 정답_수,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  RANK() OVER (ORDER BY AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) DESC) AS 순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY 정답률 DESC;
```

**교육적 의미:**
- **정답률 90%+**: 우수한 sight word 인식
- **정답률 70-89%**: 양호, 추가 연습 필요
- **정답률 <70%**: 집중 지도 필요

---

### 2. 빈도별 단어 인지 능력

```sql
-- 빈도별 정답률 분석
SELECT 
  CASE 
    -- 초고빈도
    WHEN question_word IN ('no', 'do', 'he', 'go', 'it', 'to', 'me', 'up', 
                          'the', 'she', 'yes', 'you', 'not', 'who', 'how') 
      THEN '초고빈도 (1-3글자)'
    -- 고빈도
    WHEN question_word IN ('this', 'that', 'like', 'look', 'good', 'come', 'have', 
                          'said', 'love', 'hat', 'cat', 'dad', 'sit', 'mom', 
                          'big', 'dog', 'pig', 'six', 'can', 'two', 'one', 
                          'pen', 'leg', 'pan', 'car', 'zoo', 'red', 'ten', 
                          'too', 'what', 'here', 'down', 'open', 'much', 'nice') 
      THEN '고빈도 (3-4글자)'
    -- 중빈도
    WHEN question_word IN ('tall', 'small', 'hello', 'three', 'four', 'five', 
                          'door', 'book', 'jump', 'swim', 'great', 'green', 
                          'eight', 'stand', 'blue', 'lion', 'nine', 'white', 
                          'many', 'apple', 'seven', 'pizza', 'sorry', 'color', 'close') 
      THEN '중빈도 (4-5글자)'
    ELSE '저빈도/복합 (5-6글자)'
  END AS 빈도_등급,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY 빈도_등급
ORDER BY 정답률 DESC;
```

**예상 결과:**
```
빈도_등급              | 정답률
----------------------|--------
초고빈도 (1-3글자)     | 92%
고빈도 (3-4글자)       | 85%
중빈도 (4-5글자)       | 75%
저빈도/복합 (5-6글자)  | 68%
```

**교육적 의미:**
- 초고빈도가 낮으면 → 기본 sight words부터 시작
- 고빈도는 높지만 중빈도 낮음 → 어휘 확장 필요
- 전반적으로 낮음 → 반복 노출 부족

---

### 3. 단어 길이별 인지 능력

```sql
-- 단어 길이별 정답률
SELECT 
  LENGTH(question_word) AS 단어_길이,
  COUNT(DISTINCT question_word) AS 단어_수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY LENGTH(question_word)
ORDER BY 단어_길이;
```

**교육적 의미:**
- 짧은 단어만 잘함 → 긴 단어 읽기 연습
- 길이 상관없이 고르게 낮음 → 전반적 어휘 부족

---

### 4. 주제별 어휘 인지도

```sql
-- 주제별 단어 정답률
SELECT 
  CASE 
    -- 숫자
    WHEN question_word IN ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten') 
      THEN '숫자'
    -- 색깔
    WHEN question_word IN ('red', 'blue', 'green', 'white') 
      THEN '색깔'
    -- 동물
    WHEN question_word IN ('cat', 'dog', 'pig', 'lion', 'zoo') 
      THEN '동물'
    -- 동작
    WHEN question_word IN ('sit', 'jump', 'swim', 'dance', 'stand', 'look', 'open', 'close') 
      THEN '동작 (동사)'
    -- 가족/사람
    WHEN question_word IN ('dad', 'mom', 'sister', 'he', 'she', 'you', 'me', 'who') 
      THEN '사람/가족'
    -- 일상 물건
    WHEN question_word IN ('hat', 'pen', 'door', 'book', 'ball', 'car', 'pencil', 'eraser', 'apple', 'pizza') 
      THEN '일상 물건'
    ELSE '기능어/기타'
  END AS 주제,
  COUNT(DISTINCT question_word) AS 단어_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
GROUP BY 주제
ORDER BY 정답률 ASC;
```

**교육적 활용:**
- 숫자 단어가 약하면 → 수 개념과 연계 학습
- 동물 단어가 약하면 → 그림책으로 어휘 확장
- 동작 단어가 약하면 → TPR 활동 (몸으로 표현)

---

### 5. 가장 많이 틀리는 Sight Words TOP 15

```sql
-- 정답률이 낮은 단어 TOP 15
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
LIMIT 15;
```

**예상 어려운 단어:**
- pencil (6글자, 발음 복잡)
- sister (6글자, 이중 's')
- eraser (6글자, 복합 모음)
- color (5글자, 스펠링 불규칙)
- seven (5글자, v 발음)

---

### 6. 학생별 약점 어휘 분석

```sql
-- 특정 학생이 자주 틀리는 단어
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  tr.question_word AS 단어,
  LENGTH(tr.question_word) AS 길이,
  COUNT(*) AS 시도_횟수,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 맞춘_횟수,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  CASE 
    WHEN tr.question_word IN ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten') THEN '숫자'
    WHEN tr.question_word IN ('red', 'blue', 'green', 'white') THEN '색깔'
    WHEN tr.question_word IN ('cat', 'dog', 'pig', 'lion') THEN '동물'
    ELSE '기타'
  END AS 주제
FROM test_results tr
WHERE tr.test_type = 'WRF'
  AND tr.user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
  AND tr.is_correct = FALSE
GROUP BY tr.question_word
ORDER BY 시도_횟수 DESC, 정답률 ASC
LIMIT 20;
```

**맞춤형 학습:**
- 틀린 단어를 플래시카드로 만들기
- 매일 5-10개씩 반복 학습
- 문장 속에서 사용하기

---

### 7. 반별 Sight Word 숙지도 비교

```sql
-- 반별 WRF 성적 비교
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  COUNT(*) AS 총_시도,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 평균_정답률,
  ROUND(MIN(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 최저,
  ROUND(MAX(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 최고,
  -- 빈도별 세부 정답률
  ROUND(AVG(CASE 
    WHEN tr.question_word IN ('no', 'do', 'he', 'go', 'it', 'to', 'me', 'up', 'the', 'she', 'yes', 'you', 'not', 'who', 'how') 
      AND tr.is_correct THEN 100.0 
    WHEN tr.question_word IN ('no', 'do', 'he', 'go', 'it', 'to', 'me', 'up', 'the', 'she', 'yes', 'you', 'not', 'who', 'how') 
      THEN 0 
  END), 1) AS 초고빈도_정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
GROUP BY up.class_name
ORDER BY 평균_정답률 DESC;
```

---

### 8. 불규칙 철자 단어 분석

```sql
-- 파닉스 규칙과 다른 불규칙 철자 단어 정답률
SELECT 
  question_word AS 단어,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  '불규칙 철자' AS 특성
FROM test_results
WHERE test_type = 'WRF'
  -- 불규칙 철자 단어들
  AND question_word IN ('the', 'said', 'have', 'love', 'come', 'one', 'two', 
                        'what', 'who', 'color', 'bye', 'okay')
GROUP BY question_word
ORDER BY 정답률 ASC;
```

**교육적 의미:**
- 이 단어들은 파닉스로 읽을 수 없음
- 시각적 기억(visual memory)에 의존
- 반복 노출과 암기 필요

---

### 9. 수준별 학생 그룹핑

```sql
-- WRF 능력별 학생 분류
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
```

---

### 10. 개인별 성장 추적

```sql
-- 특정 학생의 재평가 시 향상도
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  COUNT(*) AS 시도_단어,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 정답_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  -- 전 평가 대비 향상도
  ROUND(
    AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END) - 
    LAG(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END)) 
    OVER (ORDER BY DATE(created_at)), 
    1
  ) AS 향상도
FROM test_results
WHERE test_type = 'WRF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
GROUP BY DATE(created_at)
ORDER BY 평가일;
```

---

## 🎓 교육적 권장 활용

### 1. 진단 평가 (Diagnostic Assessment)

**단계별 진단:**
1. **초고빈도 단어** (<90%) → 기초 그룹
2. **고빈도 단어** (<75%) → 중급 그룹
3. **중빈도 이상** (75%+) → 심화 그룹

### 2. 맞춤형 플래시카드 세트

```sql
-- 학생별 플래시카드 추천
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  question_word AS 단어,
  CASE 
    WHEN question_word IN ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten') THEN '숫자'
    WHEN question_word IN ('red', 'blue', 'green', 'white') THEN '색깔'
    WHEN question_word IN ('cat', 'dog', 'pig', 'lion') THEN '동물'
    WHEN question_word IN ('sit', 'jump', 'swim', 'dance', 'stand') THEN '동작'
    ELSE '기본'
  END AS 주제
FROM test_results
WHERE test_type = 'WRF'
  AND user_id = 'STUDENT-UUID'
  AND is_correct = FALSE
GROUP BY question_word
ORDER BY COUNT(*) DESC
LIMIT 15;
```

**활용:**
→ 틀린 단어 15개를 플래시카드로 만들어 매일 복습

---

### 3. 주제별 어휘 학습

**숫자 (10개):**
```
one, two, three, four, five, six, seven, eight, nine, ten
```
활동: 숫자 놀이, 카운팅 게임

**색깔 (4개):**
```
red, blue, green, white
```
활동: 색깔 찾기, 색칠하기

**동물 (5개):**
```
cat, dog, pig, lion, zoo
```
활동: 동물 그림책, 역할놀이

**동작 (8개):**
```
sit, jump, swim, dance, stand, look, open, close
```
활동: TPR (Total Physical Response), 동작 게임

---

### 4. 단계별 학습 계획

#### 1단계: 기초 Sight Words (초고빈도)
**목표 단어:**
```
no, do, he, go, it, to, me, up, the, she, yes, you, not, who, how
```

**활동:**
- 매일 3-5개씩 플래시카드
- 문장 만들기 연습
- 반복 읽기 (5회 이상)

**목표:** 100% 자동 인식

---

#### 2단계: 핵심 Sight Words (고빈도)
**목표 단어:**
```
this, that, like, look, good, come, have, said, love,
hat, cat, dad, sit, mom, big, dog, pig, six, can, two, one
```

**활동:**
- 주제별 그룹화 학습
- 간단한 문장 읽기
- 게임으로 강화

**목표:** 90% 이상 인식

---

#### 3단계: 확장 Sight Words (중빈도)
**목표 단어:**
```
tall, small, hello, three, four, five, door, book, jump, swim,
great, green, eight, stand, blue, lion, nine, white, many, apple
```

**활동:**
- 스토리북 읽기
- 문맥 속에서 학습
- 쓰기와 연계

**목표:** 80% 이상 인식

---

#### 4단계: 심화 Sight Words (저빈도)
**목표 단어:**
```
okay, bye, dance, pencil, sister, sunny, ball, eraser
```

**활동:**
- 일기 쓰기
- 독립적 읽기
- 창의적 문장 만들기

**목표:** 75% 이상 인식

---

## 📈 DIBELS WRF 평가 기준

### 학년별 목표
| 학년 | 목표 (1분당) | 위험 지표 |
|------|-------------|----------|
| 1학년 말 | 20-30 words | <15 words |
| 2학년 초 | 30-40 words | <20 words |
| 3학년 초 | 40-50 words | <30 words |

### 정확도 목표
- **우수**: 95% 이상
- **양호**: 85-94%
- **주의**: 70-84%
- **개입 필요**: 70% 미만

---

## 🔍 심화 분석

### 1. 반복 오답 단어 분석

```sql
-- 여러 번 틀리는 단어 (학습 효과 낮음)
SELECT 
  up.full_name AS 학생,
  tr.question_word AS 단어,
  COUNT(*) AS 틀린_횟수,
  MAX(tr.created_at) AS 마지막_시도
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF'
  AND tr.is_correct = FALSE
GROUP BY tr.user_id, up.full_name, tr.question_word
HAVING COUNT(*) >= 2
ORDER BY up.full_name, 틀린_횟수 DESC;
```

**조치:**
- 반복 오답 단어 → 특별 관리 필요
- 다양한 학습 방법 시도 (시각, 청각, 운동감각)

---

### 2. 빠른 인지 vs 느린 인지

```sql
-- 문항 순서별 정답률 (피로도/집중도 효과)
WITH numbered_attempts AS (
  SELECT 
    user_id,
    question_word,
    is_correct,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS 순서
  FROM test_results
  WHERE test_type = 'WRF'
)
SELECT 
  CASE 
    WHEN 순서 BETWEEN 1 AND 10 THEN '1-10번 (초반)'
    WHEN 순서 BETWEEN 11 AND 20 THEN '11-20번 (중반)'
    WHEN 순서 BETWEEN 21 AND 30 THEN '21-30번 (후반)'
    ELSE '31번 이후'
  END AS 구간,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM numbered_attempts
GROUP BY 구간
ORDER BY 구간;
```

---

## 💡 교육적 권장 활동

### 상위 그룹 (90%+)
**목표:**
- 긴 단어 마스터 (pencil, eraser, sister)
- 독립적 읽기 시작
- 문맥 속 어휘 학습

**활동:**
- 레벨별 리더스 읽기
- 단어장 만들기
- 창의적 글쓰기

---

### 중상위 그룹 (75-89%)
**목표:**
- 고빈도 단어 완벽히 숙지
- 중빈도 단어 확장
- 읽기 속도 향상

**활동:**
- 빙고 게임
- 단어 찾기 경주
- 짝과 플래시카드

---

### 중하위 그룹 (60-74%)
**목표:**
- 초고빈도 단어 완벽 숙지
- 고빈도 단어 70% 이상

**활동:**
- 매일 플래시카드 5분
- 단어 쓰기 연습
- 문장 따라 읽기

---

### 하위 그룹 (60% 미만)
**목표:**
- 초고빈도 15개 완벽 숙지

**활동:**
- 1:1 개별 지도
- 멀티센서리 접근 (보기, 듣기, 쓰기, 말하기)
- 매일 3개씩 집중 학습

---

## 🎨 시각화 아이디어

### 1. Sight Word 숙지도 맵
```
학생별 빈도별 숙지도:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          초고빈도  고빈도  중빈도  저빈도
김민수       ●       ●      ●      ○
이영희       ●       ●      ○      ○
박철수       ●       ○      ○      ×

● = 90%+  ○ = 75-89%  × = 75% 미만
```

### 2. 주제별 어휘 습득도
```
김민수 학생 주제별 어휘:
━━━━━━━━━━━━━━━━━━━━━━
숫자    ████████████ 100%
색깔    ██████████░░  85%
동물    ████████████  95%
동작    ████████░░░░  70%
물건    ██████░░░░░░  60%

💡 개선 필요: 동작 단어, 물건 단어
```

### 3. 학습 진행도 체크리스트
```
✅ 초고빈도 (15개): 15/15 완료
✅ 고빈도 (35개): 32/35 (91%)
⬜ 중빈도 (25개): 18/25 (72%)
⬜ 저빈도 (10개): 5/10 (50%)

다음 목표: 중빈도 단어 80% 달성
```

---

## 📚 Dolch Sight Words 연계

제공된 단어 중 Dolch Sight Words 포함:

### Pre-Primer (유치원)
```
no, do, he, go, it, the, yes, you, not, that, she, like, 
good, look, big, can, two, one, down, up, red, come
```

### Primer (1학년)
```
this, what, who, said, to, have, four, three, open, many
```

### Grade 1
```
how, too, white, seven, five, nine, green, blue
```

---

## 🎯 실전 활용 시나리오

### 시나리오 1: 반 전체 약점 단어
```sql
SELECT question_word, 
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'WRF' 
  AND up.class_name = '나루초 3학년 다솜반'
GROUP BY question_word
HAVING AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END) < 70
ORDER BY 정답률 ASC;
```

**결과 활용:**
→ 다음 주 단어 학습 목록

---

### 시나리오 2: 개인 플래시카드
```sql
-- 김민수 학생 틀린 단어
SELECT question_word
FROM test_results
WHERE test_type = 'WRF'
  AND user_id = 'STUDENT-UUID'
  AND is_correct = FALSE
GROUP BY question_word
ORDER BY COUNT(*) DESC
LIMIT 20;
```

**결과 활용:**
→ 가정 학습용 플래시카드 제작

---

### 시나리오 3: 학습 효과 검증
```sql
-- 특정 단어 집중 학습 전후 비교
SELECT 
  DATE(created_at) AS 평가일,
  question_word AS 단어,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'WRF'
  AND user_id = 'STUDENT-UUID'
  AND question_word IN ('pencil', 'sister', 'eraser')  -- 학습한 단어
GROUP BY DATE(created_at), question_word
ORDER BY 평가일, 단어;
```

---

## 📊 문항 통계

### 출제 단어 (85개)
- **초고빈도**: 15개 (Dolch Pre-Primer 중심)
- **고빈도**: 35개 (일상 회화)
- **중빈도**: 25개 (교과서 어휘)
- **저빈도**: 10개 (심화 어휘)

### 주제별 분포
- **숫자**: 10개
- **색깔**: 4개
- **동물**: 5개
- **동작**: 8개
- **사람/가족**: 8개
- **물건**: 10개
- **기능어**: 30개 (the, this, that, what 등)

---

## 💡 Sight Words 학습 원리

### 1. 자동성 (Automaticity)
- 즉각적 인식 (0.5초 이내)
- 디코딩 없이 바로 읽기
- 유창성의 기초

### 2. 반복 노출
- 최소 20-30회 노출 필요
- 다양한 맥락에서 접하기
- 읽기, 쓰기, 듣기 통합

### 3. 의미 연결
- 그림과 함께 학습
- 문장 속에서 사용
- 실생활 연계

---

**이제 WRF 평가로 학생들의 Sight Word 숙지도를 정확하게 측정하고, 맞춤형 어휘 학습 계획을 수립할 수 있습니다! 📚✨**

주요 분석:
- ✅ 빈도별 어휘 숙지도
- ✅ 주제별 어휘 강약점
- ✅ 불규칙 철자 단어 인지
- ✅ 개인별 플래시카드 추천
- ✅ 수준별 그룹 학습 계획

