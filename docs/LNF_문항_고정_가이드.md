# 📝 LNF 평가 문항 고정 가이드

## ✅ 변경 사항

### 이전: 랜덤 문항
- 각 학생마다 다른 알파벳이 무작위로 출제
- 학생 간 비교 어려움
- 틀린 알파벳 분석 불가능

### 현재: 고정 문항 ✨
- **모든 학생에게 동일한 200개 문항 출제**
- 학생 간 직접 비교 가능
- 자주 틀리는 알파벳 분석 가능
- 문항 순서도 동일

---

## 📋 출제 문항 (200개)

### 전체 문항 목록
```
1-10:   t n f y I R D G Y V
11-20:  r b P L Z i c A O J
21-30:  p T x K a v M U Q h
31-40:  g N j X s C H q o m
41-50:  S B z e u E F V d k
51-60:  R U X h y O q t m S
61-70:  x K e c T G Z r g P
71-80:  L Q s k N J i p A D
81-90:  Y a f I H V n v E F
91-100: V d b M j o u C B z
101-110: e h c v T P D L K V
111-120: s g M G X i f I B z
121-130: u A H Y o k R j Z d
131-140: b N F Q r S O q t p
141-151: C x J a m e E U Z n y
152-161: E F V n b H z i p S
162-171: O Y o c I U X d g N
172-181: j Q h v M K a f A B
182-192: J t m c C D V r k P G
193-200: V s y R L e u T x q
```

### 문항 통계
- **총 문항 수**: 200개
- **대문자**: 81개 (40.5%)
- **소문자**: 119개 (59.5%)

---

## 📊 분석 가능한 데이터

### 1. 알파벳별 정답률
```sql
-- 알파벳별 정답률 분석
SELECT 
  question AS 알파벳,
  COUNT(*) AS 총_시도,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 정답_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'LNF'
GROUP BY question
ORDER BY 정답률 ASC, 총_시도 DESC;
```

**결과 예시:**
```
알파벳 | 총_시도 | 정답_수 | 정답률
-------|--------|--------|-------
Z      | 224    | 145    | 64.7%
Q      | 224    | 156    | 69.6%
X      | 448    | 325    | 72.5%
```

### 2. 학생별 성적 비교
```sql
-- 학생별 성적 순위
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  COUNT(*) AS 시도한_문항,
  SUM(CASE WHEN tr.is_correct THEN 1 ELSE 0 END) AS 맞은_개수,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률,
  RANK() OVER (ORDER BY AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) DESC) AS 순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'LNF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY 정답률 DESC;
```

### 3. 반별 평균 비교
```sql
-- 반별 성적 비교
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  COUNT(*) AS 총_시도,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 평균_정답률,
  MIN(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) AS 최저,
  MAX(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) AS 최고
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'LNF'
GROUP BY up.class_name
ORDER BY 평균_정답률 DESC;
```

### 4. 대문자 vs 소문자 정답률
```sql
-- 대문자/소문자별 정답률
SELECT 
  CASE 
    WHEN question = UPPER(question) THEN '대문자'
    ELSE '소문자'
  END AS 문자_유형,
  COUNT(*) AS 총_시도,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS 정답_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'LNF'
GROUP BY 
  CASE 
    WHEN question = UPPER(question) THEN '대문자'
    ELSE '소문자'
  END;
```

### 5. 문항 순서별 정답률 (피로도 분석)
```sql
-- 문항 순서별 정답률 (시간 경과에 따른 피로도 분석)
WITH numbered_results AS (
  SELECT 
    question,
    is_correct,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS 문항_순서
  FROM test_results
  WHERE test_type = 'LNF'
)
SELECT 
  CASE 
    WHEN 문항_순서 BETWEEN 1 AND 10 THEN '1-10번'
    WHEN 문항_순서 BETWEEN 11 AND 20 THEN '11-20번'
    WHEN 문항_순서 BETWEEN 21 AND 30 THEN '21-30번'
    ELSE '31번 이상'
  END AS 구간,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM numbered_results
GROUP BY 
  CASE 
    WHEN 문항_순서 BETWEEN 1 AND 10 THEN '1-10번'
    WHEN 문항_순서 BETWEEN 11 AND 20 THEN '11-20번'
    WHEN 문항_순서 BETWEEN 21 AND 30 THEN '21-30번'
    ELSE '31번 이상'
  END
ORDER BY 구간;
```

### 6. 가장 많이 틀린 알파벳 TOP 10
```sql
-- 오답이 많은 알파벳 TOP 10
SELECT 
  question AS 알파벳,
  COUNT(*) AS 총_시도,
  SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) AS 오답_수,
  ROUND(AVG(CASE WHEN NOT is_correct THEN 100.0 ELSE 0 END), 1) AS 오답률
FROM test_results
WHERE test_type = 'LNF'
GROUP BY question
ORDER BY 오답_수 DESC
LIMIT 10;
```

---

## 🎯 교육적 활용

### 1. 개인 맞춤 학습
```sql
-- 특정 학생이 틀린 알파벳 목록
SELECT 
  tr.question AS 틀린_알파벳,
  COUNT(*) AS 틀린_횟수,
  tr.error_type AS 오류_유형
FROM test_results tr
WHERE tr.test_type = 'LNF'
  AND tr.user_id = 'STUDENT-UUID'
  AND tr.is_correct = FALSE
GROUP BY tr.question, tr.error_type
ORDER BY 틀린_횟수 DESC;
```

### 2. 반별 약점 알파벳
```sql
-- 반 전체가 어려워하는 알파벳
SELECT 
  tr.question AS 알파벳,
  up.class_name AS 반,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'LNF'
  AND up.class_name = '나루초 3학년 다솜반'
GROUP BY tr.question, up.class_name
HAVING AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) < 70
ORDER BY 정답률 ASC;
```

### 3. 혼동하기 쉬운 알파벳 쌍
```sql
-- 비슷한 알파벳끼리 정답률 비교
SELECT 
  question AS 알파벳,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'LNF'
  AND question IN ('b', 'd', 'p', 'q')  -- 혼동하기 쉬운 알파벳
GROUP BY question
ORDER BY 정답률 ASC;
```

---

## 📈 교사 대시보드 활용

### 추가 가능한 기능 (향후)

1. **알파벳별 정답률 히트맵**
   - 어떤 알파벳이 어려운지 시각화
   - 빨강: 낮은 정답률, 초록: 높은 정답률

2. **학생별 약점 알파벳 표시**
   - 각 학생의 프로필에 자주 틀린 알파벳 표시
   - 맞춤형 학습 계획 수립

3. **시간대별 성적 분석**
   - 아침/점심/오후 시간대별 정답률 비교
   - 최적의 평가 시간 찾기

4. **진도율 추적**
   - 몇 번째 문항까지 완료했는지 표시
   - 60초 안에 평균 몇 문항 완료하는지 분석

---

## 🔍 데이터 검증

### 문항 일관성 확인
```sql
-- 모든 학생이 같은 순서로 문항을 받았는지 확인
WITH first_10_per_student AS (
  SELECT 
    user_id,
    question,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS 순서
  FROM test_results
  WHERE test_type = 'LNF'
)
SELECT 
  순서,
  question AS 문항,
  COUNT(DISTINCT user_id) AS 학생_수
FROM first_10_per_student
WHERE 순서 <= 10
GROUP BY 순서, question
ORDER BY 순서, 학생_수 DESC;
```

**예상 결과:**
```
순서 | 문항 | 학생_수
-----|------|--------
1    | t    | 112
2    | n    | 112
3    | f    | 112
...
```
→ 모든 학생이 같은 순서로 문항을 받았음을 확인

---

## ⚠️ 주의사항

### 1. 문항 변경 시
- 문항을 변경하면 이전 데이터와 비교 불가
- 변경 날짜를 기록하여 데이터 구분 필요
- 또는 별도의 버전 관리 필요

### 2. 데이터 해석
- 1번 문항은 정답률이 높을 수 있음 (연습 효과)
- 마지막 문항은 정답률이 낮을 수 있음 (시간 부족, 피로도)
- 평균 정답률만 보지 말고 문항 위치도 고려

### 3. 학생 비교
- 같은 날짜에 평가한 학생끼리 비교
- 다른 날짜는 환경 변수 고려 필요
- 개인차를 인정하고 성장 중심 평가

---

## 💡 실전 활용 예시

### 시나리오 1: 반 전체 약점 찾기
```sql
-- 나루초 3학년 다솜반의 약점 알파벳
SELECT 
  tr.question AS 알파벳,
  ROUND(AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'LNF'
  AND up.class_name = '나루초 3학년 다솜반'
GROUP BY tr.question
HAVING AVG(CASE WHEN tr.is_correct THEN 100.0 ELSE 0 END) < 60
ORDER BY 정답률 ASC;
```

**결과 활용:**
→ 정답률이 낮은 알파벳을 중심으로 추가 학습 계획 수립

### 시나리오 2: 개인 성장 추적
```sql
-- 특정 학생의 재평가 시 개선도 확인
SELECT 
  tr.question AS 알파벳,
  tr.created_at::date AS 평가일,
  tr.is_correct AS 정답여부
FROM test_results tr
WHERE tr.test_type = 'LNF'
  AND tr.user_id = 'STUDENT-UUID'
  AND tr.question IN ('Z', 'Q', 'X')  -- 이전에 틀렸던 알파벳
ORDER BY tr.question, tr.created_at;
```

---

## 📚 참고 자료

### 일반적인 알파벳 난이도
- **쉬운 알파벳**: A, O, I (모음, 단순한 형태)
- **중간 난이도**: T, L, S (자주 사용)
- **어려운 알파벳**: Q, Z, X (드물게 사용)
- **혼동 쌍**: b-d, p-q, m-n

### DIBELS LNF 기준
- **1분당 목표**: 40-60개 (학년별 차이)
- **정확도 목표**: 80% 이상
- **조기 경보**: 20개 미만

---

**고정 문항으로 더 나은 교육 분석이 가능합니다! 📊✨**

