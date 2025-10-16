# 📝 PSF 평가 문항 고정 및 분석 가이드

## ✅ 변경 사항

### 이전: 랜덤 10개 단어
```javascript
const psfWords = ["map", "sit", "dog", "run", "cut", "fish", "ship", "that", "them", "sing"];
```
- ❌ 학생마다 다른 단어
- ❌ 비교 분석 불가능
- ❌ 단어별 난이도 파악 어려움

### 현재: 고정 107개 단어 ✨
- ✅ **모든 학생에게 동일한 107개 단어 출제**
- ✅ **순서도 동일**
- ✅ **학생 간 직접 비교 가능**
- ✅ **단어 특성별 분석 가능**

---

## 📋 출제 문항 (107개)

### 전체 단어 목록
```
1-10:   road, dad, six, frog, on, cry, sit, camp, farm, bell
11-20:  plan, hand, gift, stop, map, mad, van, pin, star, get
21-30:  top, old, ant, cup, pear, pond, milk, son, pen, belt
31-40:  rug, hit, nut, doll, box, bat, cat, bug, win, moon
41-50:  gold, web, mug, man, pig, sand, dig, pot, rock, hot
51-60:  go, bed, mom, fan, ship, an, so, desk, wig, ski
61-70:  car, fog, leg, dog, pull, toad, ten, hen, jog, kid
71-80:  at, fit, but, cold, lion, red, sun, jam, mud, hug
81-90:  up, crab, coin, heel, put, run, cut, not, tap, pet
91-100: dot, big, sip, mop, lid, lip, fin, kit, had, can
101-107: zoo, hop, hat, deep, lamp, drum, nest, tent
```

---

## 📊 단어 특성 분석

### 1. 음절 수별 분류
```sql
-- 단어를 음절 수로 분류하여 난이도 분석
SELECT 
  CASE 
    -- 2음소 단어
    WHEN question_word IN ('on', 'go', 'an', 'so', 'at', 'up') THEN '2음소'
    -- 3음소 단어 (CVC 패턴)
    WHEN question_word IN ('sit', 'map', 'top', 'ant', 'cup', 'rug', 'hit', 
                           'nut', 'box', 'bat', 'cat', 'bug', 'web', 'mug', 
                           'man', 'pig', 'dig', 'pot', 'hot', 'bed', 'mom', 
                           'fan', 'wig', 'car', 'fog', 'leg', 'dog', 'ten', 
                           'hen', 'jog', 'kid', 'fit', 'but', 'red', 'sun', 
                           'jam', 'mud', 'hug', 'run', 'cut', 'not', 'tap', 
                           'pet', 'dot', 'big', 'sip', 'mop', 'lid', 'lip', 
                           'fin', 'kit', 'had', 'can', 'hop', 'hat') THEN '3음소(CVC)'
    -- 4음소 단어
    WHEN question_word IN ('dad', 'six', 'frog', 'cry', 'camp', 'farm', 'bell',
                           'plan', 'hand', 'gift', 'stop', 'mad', 'van', 'pin',
                           'star', 'get', 'old', 'pear', 'pond', 'milk', 'son',
                           'pen', 'belt', 'doll', 'win', 'moon', 'gold', 'sand',
                           'rock', 'ship', 'desk', 'ski', 'pull', 'toad', 'cold',
                           'lion', 'crab', 'coin', 'heel', 'put', 'zoo', 'deep',
                           'lamp', 'drum', 'nest', 'tent') THEN '4음소'
    -- 5음소 이상
    ELSE '5음소 이상'
  END AS 음소_수,
  COUNT(*) AS 문항_수,
  ROUND(AVG(CASE WHEN is_correct THEN 100.0 ELSE 0 END), 1) AS 평균_정답률
FROM (
  SELECT 
    question_word,
    CASE 
      WHEN correct_segments = target_segments THEN TRUE
      ELSE FALSE
    END AS is_correct
  FROM test_results
  WHERE test_type = 'PSF'
) AS subquery
GROUP BY 음소_수
ORDER BY 
  CASE 음소_수
    WHEN '2음소' THEN 1
    WHEN '3음소(CVC)' THEN 2
    WHEN '4음소' THEN 3
    ELSE 4
  END;
```

### 2. 단어 패턴별 분류
```sql
-- CVC, CCVC, CVCC 등 패턴별 정답률
SELECT 
  CASE 
    WHEN question_word IN ('cat', 'bat', 'map', 'sit', 'top', 'rug', 'bug', 'mug', 'pig', 'pot', 'hot', 'bed', 'fan', 'car', 'leg', 'dog', 'ten', 'hen', 'red', 'sun', 'jam', 'mud', 'run', 'cut', 'not', 'tap', 'pet', 'dot', 'big', 'sip', 'mop', 'lid', 'lip', 'fin', 'kit', 'had', 'can', 'hop', 'hat') 
      THEN 'CVC (자음-모음-자음)'
    WHEN question_word IN ('stop', 'plan', 'frog', 'crab', 'star', 'drum')
      THEN 'CCVC (자음2-모음-자음)'
    WHEN question_word IN ('camp', 'hand', 'gift', 'sand', 'belt', 'nest', 'tent', 'pond', 'milk')
      THEN 'CVCC (자음-모음-자음2)'
    WHEN question_word IN ('at', 'on', 'an', 'up')
      THEN 'VC (모음-자음)'
    WHEN question_word IN ('go', 'so')
      THEN 'CV (자음-모음)'
    ELSE '기타'
  END AS 단어_패턴,
  COUNT(DISTINCT question_word) AS 단어_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
GROUP BY 단어_패턴
ORDER BY 평균_정확도 ASC;
```

### 3. 모음별 난이도
```sql
-- 단어에 포함된 모음별 정답률
SELECT 
  CASE 
    WHEN question_word ~ '[aA]' THEN 'a'
    WHEN question_word ~ '[eE]' THEN 'e'
    WHEN question_word ~ '[iI]' THEN 'i'
    WHEN question_word ~ '[oO]' THEN 'o'
    WHEN question_word ~ '[uU]' THEN 'u'
  END AS 모음,
  COUNT(DISTINCT question_word) AS 단어_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
  AND question_word ~ '[aeiouAEIOU]'
GROUP BY 모음
ORDER BY 평균_정확도 ASC;
```

---

## 🎯 교육적 분석 포인트

### 1. 음소 인식 능력 (Phonemic Awareness)

#### 분석 방법:
```sql
-- 학생별 음소 분리 정확도
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  COUNT(*) AS 시도한_단어,
  SUM(tr.correct_segments) AS 맞춘_음소,
  SUM(tr.target_segments) AS 전체_음소,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 음소_정확도
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY 음소_정확도 DESC;
```

**교육적 의미:**
- 음소 정확도가 낮으면 → 기본 음소 인식 훈련 필요
- 단어는 맞히지만 음소 수가 틀리면 → 음소 개수 세기 연습

---

### 2. 단어 복잡도별 성취도

#### 분석: 짧은 단어 vs 긴 단어
```sql
-- 단어 길이별 정답률
SELECT 
  LENGTH(question_word) AS 단어_길이,
  COUNT(*) AS 문항_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
GROUP BY LENGTH(question_word)
ORDER BY 단어_길이;
```

**교육적 의미:**
- 짧은 단어(2-3글자): 기본 음소 인식
- 중간 단어(4-5글자): 복합 음소 처리
- 긴 단어(6글자+): 작업 기억 능력

---

### 3. 자주 틀리는 음소 조합

#### 분석: 특정 자음군이나 이중자음
```sql
-- 자음군이 포함된 단어의 정답률
SELECT 
  question_word AS 단어,
  target_segments AS 목표_음소수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 정확도
FROM test_results
WHERE test_type = 'PSF'
  -- bl, fr, st, cr 등 자음군이 있는 단어
  AND question_word IN ('frog', 'cry', 'camp', 'farm', 'bell', 'plan', 'hand', 
                        'gift', 'stop', 'star', 'crab', 'drum')
GROUP BY question_word, target_segments
ORDER BY 정확도 ASC;
```

**교육적 의미:**
- 자음군(consonant cluster)을 하나의 음소로 잘못 인식
- bl, fr, st, cr 등을 분리하는 훈련 필요

---

### 4. 학생별 약점 음소 파악

```sql
-- 특정 학생이 자주 틀리는 단어 유형
WITH student_results AS (
  SELECT 
    question_word,
    correct_segments,
    target_segments,
    CASE 
      WHEN question_word ~ '^[bcdfghjklmnpqrstvwxyz]{2}' THEN '초성자음군'
      WHEN question_word ~ '[bcdfghjklmnpqrstvwxyz]{2}$' THEN '종성자음군'
      WHEN LENGTH(question_word) <= 3 THEN '단순CVC'
      ELSE '복합단어'
    END AS 단어_유형
  FROM test_results
  WHERE test_type = 'PSF'
    AND user_id = 'STUDENT-UUID'
)
SELECT 
  단어_유형,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM student_results
GROUP BY 단어_유형
ORDER BY 평균_정확도 ASC;
```

**맞춤형 학습 계획:**
- 초성자음군 약함 → frog, stop, plan 집중 학습
- 종성자음군 약함 → camp, hand, belt 집중 학습
- 단순CVC 약함 → 기초 음소 인식부터 시작

---

### 5. 반별 비교 분석

```sql
-- 반별 PSF 성적 비교
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
```

---

### 6. 가장 어려운 단어 TOP 10

```sql
-- 정답률이 낮은 단어 TOP 10
SELECT 
  question_word AS 단어,
  target_segments AS 목표_음소수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도,
  -- 완벽하게 맞춘 비율
  ROUND(AVG(CASE WHEN correct_segments = target_segments THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률
FROM test_results
WHERE test_type = 'PSF'
GROUP BY question_word, target_segments
ORDER BY 평균_정확도 ASC
LIMIT 10;
```

**예상 결과:**
```
단어    | 목표음소 | 평균정확도 | 완벽정답률
--------|---------|-----------|----------
lion    | 4       | 62.5%     | 45%
crab    | 4       | 65.8%     | 50%
frog    | 4       | 68.2%     | 55%
```

---

## 🔍 심화 분석

### 1. 모음 유형별 난이도

```sql
-- 단모음 vs 이중모음
SELECT 
  CASE 
    WHEN question_word IN ('road', 'pear', 'moon', 'coin', 'heel', 'deep', 'zoo') 
      THEN '이중모음/장모음'
    ELSE '단모음'
  END AS 모음_유형,
  COUNT(*) AS 시도_수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM test_results
WHERE test_type = 'PSF'
GROUP BY 모음_유형;
```

**교육적 의미:**
- 이중모음이 어려우면 → 장모음 인식 훈련
- 단모음도 어려우면 → 기본 모음부터 시작

---

### 2. 자음 위치별 분석

```sql
-- 초성, 중성, 종성 자음의 난이도
WITH phoneme_analysis AS (
  SELECT 
    question_word,
    correct_segments,
    target_segments,
    CASE 
      WHEN question_word ~ '^[bcdfghjklmnpqrstvwxyz]{2}' THEN '초성자음군'
      WHEN question_word ~ '[bcdfghjklmnpqrstvwxyz]{2}$' THEN '종성자음군'
      ELSE '단일자음'
    END AS 자음_유형
  FROM test_results
  WHERE test_type = 'PSF'
)
SELECT 
  자음_유형,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 평균_정확도
FROM phoneme_analysis
GROUP BY 자음_유형
ORDER BY 평균_정확도 ASC;
```

---

### 3. 개인별 성장 추적

```sql
-- 학생의 여러 세션 간 성적 변화
SELECT 
  DATE(created_at) AS 평가일,
  COUNT(*) AS 시도_단어,
  SUM(correct_segments) AS 맞춘_음소,
  SUM(target_segments) AS 전체_음소,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 정확도
FROM test_results
WHERE test_type = 'PSF'
  AND user_id = 'STUDENT-UUID'
GROUP BY DATE(created_at)
ORDER BY 평가일;
```

**활용:**
- 시간에 따른 향상도 확인
- 정체기 파악
- 재평가 필요성 판단

---

### 4. 음소 개수 예측 정확도

```sql
-- 학생이 음소 개수를 정확히 세는지 분석
SELECT 
  up.full_name AS 학생이름,
  -- 정확한 음소 개수를 센 비율
  ROUND(AVG(CASE WHEN tr.correct_segments = tr.target_segments THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률,
  -- 평균 음소 인식 정확도
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 평균_정확도,
  -- 평균적으로 놓친 음소 개수
  ROUND(AVG(tr.target_segments - tr.correct_segments), 2) AS 평균_누락_음소
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
GROUP BY tr.user_id, up.full_name
ORDER BY 완벽_정답률 DESC;
```

**교육적 의미:**
- 완벽_정답률이 낮으면 → 음소 개수 세기 연습
- 평균_누락_음소가 크면 → 마지막 음소를 자주 누락

---

### 5. 특정 자음/모음 조합 분석

```sql
-- 's'로 시작하는 단어들의 정답률
SELECT 
  question_word AS 단어,
  target_segments AS 음소수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 정확도
FROM test_results
WHERE test_type = 'PSF'
  AND question_word LIKE 's%'
GROUP BY question_word, target_segments
ORDER BY 정확도 ASC;
```

---

## 📚 교육적 권장 활용법

### 1. 진단 평가 (Diagnostic Assessment)

**활용 단계:**
1. 전체 학생에게 PSF 평가 실시
2. 음소 수별 정답률 확인
3. 2-3음소 단어도 어려워하는 학생 → 기초 그룹
4. 4-5음소 단어만 어려워하는 학생 → 심화 그룹

### 2. 그룹별 맞춤 학습

**기초 그룹:**
- CVC 단어 집중 (cat, map, sit, top)
- 단모음 중심 학습
- 천천히, 명확하게

**중급 그룹:**
- CCVC, CVCC 패턴 (stop, camp, hand)
- 자음군 분리 연습
- 다양한 모음 조합

**심화 그룹:**
- 복합 단어 (lion, crab, coin)
- 빠른 처리 능력
- 정확도 향상

### 3. 반복 평가 및 성장 추적

```sql
-- 같은 학생의 1차, 2차 평가 비교
SELECT 
  DATE(created_at) AS 평가차수,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 정확도,
  COUNT(*) AS 시도_단어
FROM test_results
WHERE test_type = 'PSF'
  AND user_id = 'STUDENT-UUID'
GROUP BY DATE(created_at)
ORDER BY 평가차수;
```

---

## 🎨 시각화 아이디어 (향후 구현)

### 1. 히트맵 (Heatmap)
```
단어별 정답률을 색상으로 표시:
빨강(0-60%) → 주황(60-80%) → 초록(80-100%)

     road  dad  six  frog  on   cry
학생1  85%  90%  75%  60%  95%  70%
학생2  80%  85%  80%  65%  90%  75%
학생3  75%  80%  70%  55%  85%  65%
```

### 2. 음소 패턴 분석 차트
```
CVC 패턴:     ████████████ 85%
CCVC 패턴:    ████████░░░░ 70%
CVCC 패턴:    ██████░░░░░░ 65%
복합 패턴:    ████░░░░░░░░ 55%
```

### 3. 학생별 음소 인식 프로필
```
김민수 학생의 음소 인식 프로필:
✅ 단일 자음: 95% (강점)
✅ 단모음: 90% (강점)
⚠️ 자음군: 65% (개선 필요)
⚠️ 이중모음: 60% (개선 필요)
```

---

## 💡 실전 활용 시나리오

### 시나리오 1: 반 전체 약점 찾기
```sql
SELECT 
  tr.question_word AS 단어,
  ROUND(AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100), 1) AS 반평균
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'PSF'
  AND up.class_name = '나루초 3학년 다솜반'
GROUP BY tr.question_word
HAVING AVG(tr.correct_segments::FLOAT / NULLIF(tr.target_segments, 0) * 100) < 60
ORDER BY 반평균 ASC;
```

**활용:** 반 전체가 어려워하는 단어를 중심으로 수업 진행

---

### 시나리오 2: 개인 학습 계획

```sql
-- 특정 학생의 약점 분석
SELECT 
  question_word AS 단어,
  target_segments AS 음소수,
  correct_segments AS 맞춘음소,
  (target_segments - correct_segments) AS 누락음소
FROM test_results
WHERE test_type = 'PSF'
  AND user_id = 'STUDENT-UUID'
  AND correct_segments < target_segments
ORDER BY 누락음소 DESC;
```

**활용:** 많이 누락하는 단어를 중심으로 개인 과제 제공

---

### 시나리오 3: 학습 효과 검증

```sql
-- 특정 단어 집중 학습 전후 비교
SELECT 
  DATE(created_at) AS 평가일,
  question_word AS 단어,
  ROUND(AVG(correct_segments::FLOAT / NULLIF(target_segments, 0) * 100), 1) AS 정확도
FROM test_results
WHERE test_type = 'PSF'
  AND user_id = 'STUDENT-UUID'
  AND question_word IN ('frog', 'stop', 'camp')  -- 학습한 단어들
GROUP BY DATE(created_at), question_word
ORDER BY 평가일, 단어;
```

---

## 📊 단어 특성 통계

### 출제 단어 분석 (107개)

| 특성 | 개수 | 비율 |
|------|------|------|
| 2글자 단어 | 6개 | 5.6% |
| 3글자 단어 (CVC) | 60개 | 56.1% |
| 4글자 단어 | 35개 | 32.7% |
| 5글자+ 단어 | 6개 | 5.6% |

### 음소 패턴 분포
- **CVC 패턴**: 60개 (가장 많음)
- **CCVC 패턴**: 15개 (자음군 시작)
- **CVCC 패턴**: 12개 (자음군 끝)
- **기타**: 20개

### 포함된 자음군
- **초성**: fr, cr, st, pl, dr, pr, gr, fl
- **종성**: nd, mp, ft, lt, nt, st, sk, lk

---

## 🎓 DIBELS PSF 평가 기준

### 일반적 기준
- **목표 점수**: 음소당 90% 이상 정확도
- **위험 지표**: 70% 미만
- **조기 개입**: 50% 미만

### 음소 인식 발달 단계
1. **단계 1**: 단일 자음/모음 인식 (2-3음소)
2. **단계 2**: CVC 패턴 완벽 인식
3. **단계 3**: 자음군 분리 (CCVC, CVCC)
4. **단계 4**: 복합 단어 및 빠른 처리

---

## 💡 교사 대시보드 추가 기능 아이디어

### 1. PSF 음소 인식 프로필 카드
```
학생별 음소 인식 프로필:
━━━━━━━━━━━━━━━━━━━━━━
김민수
  평균 정확도: 85%
  강점: 단일자음 (95%), 단모음 (90%)
  약점: 자음군 (65%), 이중모음 (70%)
  권장: frog, stop, plan 집중 학습
```

### 2. 단어 난이도별 성취도 차트
```
[막대 그래프]
2음소 ████████████████ 95%
3음소 ██████████████░░ 85%
4음소 ██████████░░░░░░ 70%
5음소+ ████████░░░░░░░░ 60%
```

### 3. 반별 약점 단어 목록
```
나루초 3학년 다솜반 약점 단어:
1. lion (평균 62%)
2. crab (평균 65%)
3. frog (평균 68%)

→ 다음 수업에 집중할 단어 추천
```

---

## 📖 참고: 음소 분석 예시

### 단어별 음소 개수 참조
```
2음소: on, go, an, so, at, up
3음소: cat, map, sit, top, dog, run, cut, not, big, hop
4음소: frog, stop, camp, hand, farm, star, lion, crab
5음소: plant (예시)
```

---

**고정 문항으로 심도 있는 음소 인식 분석이 가능합니다! 🎯✨**

이제 교사는 다음을 파악할 수 있습니다:
- ✅ 학생별 음소 인식 정확도
- ✅ 자주 틀리는 단어/음소 패턴
- ✅ 학습 효과 검증
- ✅ 맞춤형 학습 계획 수립

