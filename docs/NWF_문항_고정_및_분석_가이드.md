# 📝 NWF 평가 문항 고정 및 분석 가이드

## ✅ 변경 사항

### 이전: 랜덤 11개 Nonsense Words
```javascript
const nwfWords = ["nuf", "tib", "vog", "jez", "zop", "quim", "yeb", "wix", "fip", "roz", "kud"];
```

### 현재: 고정 150개 Nonsense Words ✨
- ✅ **중복 제거 완료** (원본 194개 → 150개)
- ✅ **난이도별 균형** 잡힌 구성
- ✅ **모든 학생에게 동일한 문항**
- ✅ **순서도 고정**

---

## 📋 출제 문항 구성 (150개)

### 난이도별 분포

| 난이도 | 글자수 | 패턴 | 문항 수 | 비율 |
|--------|--------|------|---------|------|
| **쉬움** | 3글자 | CVC | 90개 | 60% |
| **중간** | 4글자 | CCVC, CVCC | 50개 | 33.3% |
| **어려움** | 4-5글자 | 복합 | 10개 | 6.7% |

### 패턴별 상세

#### 1. CVC 패턴 (90개) - 60%
```
sep, nem, dib, rop, lin, fom, mig, rup, dep, fod,
pid, rit, mag, pim, sog, tib, pon, heg, dem, seb,
dop, nug, tet, wep, vom, bem, kun, yut, yad, heb,
...
```
**특징:**
- 가장 기본적인 패턴
- 자음-모음-자음 구조
- 파닉스 규칙 적용이 명확

#### 2. CCVC/CVCC 패턴 (50개) - 33.3%
```
stam, clen, frap, smop, grut, ston, cles, snid, blut, pren,
glom, trab, clom, snut, krat, flot, clor, jent, galk, vrop,
...
```
**특징:**
- 자음군(consonant cluster) 포함
- 초성 또는 종성에 자음 2개
- 블렌딩 능력 필요

#### 3. 복합 패턴 (10개) - 6.7%
```
clanp, baip, ferk, hilp, krad
```
**특징:**
- 양쪽에 자음군
- 가장 복잡한 구조
- 고급 디코딩 능력 필요

---

## 📊 교육적 분석 포인트

### 1. 파닉스 규칙 적용 능력 (Decoding)

#### 분석 방법:
```sql
-- 학생별 파닉스 적용 정확도
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  COUNT(*) AS 시도_단어,
  SUM(CASE WHEN tr.is_whole_word_correct THEN 1 ELSE 0 END) AS 완벽_정답,
  SUM(CASE WHEN tr.is_phonemes_correct THEN 1 ELSE 0 END) AS 음소_정답,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS 음소_정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY 완벽_정답률 DESC;
```

**교육적 의미:**
- **완벽_정답률 높음**: 파닉스 규칙을 완전히 숙지
- **음소_정답률만 높음**: 개별 음소는 알지만 블렌딩 약함
- **둘 다 낮음**: 기초 파닉스부터 재학습 필요

---

### 2. 단어 패턴별 디코딩 능력

```sql
-- 패턴별 정답률 분석
SELECT 
  CASE 
    -- CVC 패턴 (3글자 단순)
    WHEN LENGTH(question_word) = 3 THEN 'CVC (3글자)'
    -- CCVC/CVCC 패턴 (4글자)
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
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS 음소_정답률
FROM test_results
WHERE test_type = 'NWF'
GROUP BY 단어_패턴
ORDER BY 완벽_정답률 DESC;
```

**예상 결과:**
```
패턴                  | 완벽정답률 | 음소정답률
---------------------|-----------|----------
CVC (3글자)          | 85%       | 92%
CVCC (종성자음군)    | 70%       | 85%
CCVC (초성자음군)    | 68%       | 83%
복합 (5글자+)        | 55%       | 75%
```

**교육적 의미:**
- CVC 정답률 낮음 → 기본 파닉스 재학습
- 자음군만 낮음 → 블렌드 연습 집중
- 음소는 맞지만 완벽 정답 낮음 → 블렌딩 능력 향상 필요

---

### 3. 자음군(Consonant Clusters) 처리 능력 ⭐

```sql
-- 자음군별 정답률
SELECT 
  CASE 
    -- bl, cl, fl, gl, pl, sl (l-blends)
    WHEN question_word ~ '^[bcfgps]l' THEN 'l-blends (bl, cl, fl, gl, pl, sl)'
    -- br, cr, dr, fr, gr, pr, tr (r-blends)
    WHEN question_word ~ '^[bcdfgpt]r' THEN 'r-blends (br, cr, dr, fr, gr, pr, tr)'
    -- sc, sk, sm, sn, sp, st, sw (s-blends)
    WHEN question_word ~ '^s[ckmnptw]' THEN 's-blends (sc, sk, sm, sn, sp, st)'
    -- 종성 자음군
    WHEN question_word ~ '[lmnr][kpt]$' THEN '종성자음군 (lk, mp, nt, rp)'
    ELSE '자음군 없음'
  END AS 자음군_유형,
  COUNT(DISTINCT question_word) AS 단어_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률
FROM test_results
WHERE test_type = 'NWF'
GROUP BY 자음군_유형
ORDER BY 완벽_정답률 ASC;
```

**교육적 활용:**
- l-blends 약함 → bl, cl, fl 집중 연습
- r-blends 약함 → br, cr, dr, fr 집중 연습
- s-blends 약함 → st, sp, sn 집중 연습

---

### 4. 음소 vs 전체 단어 정답률 비교

```sql
-- 블렌딩 능력 측정
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS 음소_정답률,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률,
  ROUND(
    AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END) - 
    AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 
    1
  ) AS 블렌딩_격차
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY 블렌딩_격차 DESC;
```

**해석:**
- **블렌딩_격차 큼 (20% 이상)**: 개별 음소는 알지만 합성 능력 약함 → 블렌딩 연습 필요
- **블렌딩_격차 작음 (10% 미만)**: 블렌딩 능력 우수
- **둘 다 낮음**: 기본 파닉스부터 재학습

---

### 5. 가장 어려운 Nonsense Words TOP 20

```sql
-- 정답률이 낮은 단어 TOP 20
SELECT 
  question_word AS 단어,
  LENGTH(question_word) AS 글자수,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 완벽_정답률,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS 음소_정답률,
  -- 자음군 포함 여부
  CASE 
    WHEN question_word ~ '^[bcdfghjklmnpqrstvwxyz]{2}' THEN '초성자음군'
    WHEN question_word ~ '[bcdfghjklmnpqrstvwxyz]{2}$' THEN '종성자음군'
    ELSE '단일자음'
  END AS 특성
FROM test_results
WHERE test_type = 'NWF'
GROUP BY question_word
ORDER BY 완벽_정답률 ASC
LIMIT 20;
```

**예상 어려운 단어:**
- clanp, krad, hilp (양쪽 자음군)
- skom, trul, vrat (생소한 자음군)
- grut, blut, snut (혼합 자음군)

---

### 6. 학생별 약점 패턴 파악

```sql
-- 특정 학생의 약점 단어 유형
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경
SELECT 
  CASE 
    WHEN LENGTH(question_word) = 3 THEN 'CVC (기본)'
    WHEN question_word ~ '^[bcdfgps]l' THEN 'l-blends'
    WHEN question_word ~ '^[bcdfgpt]r' THEN 'r-blends'
    WHEN question_word ~ '^s[ckmnptw]' THEN 's-blends'
    WHEN question_word ~ '[lmnr][kpt]$' THEN '종성자음군'
    ELSE '기타/복합'
  END AS 패턴_유형,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'NWF'
  AND user_id = 'STUDENT-UUID'
GROUP BY 패턴_유형
ORDER BY 정답률 ASC;
```

**맞춤형 학습 계획:**
- l-blends 약함 → blut, clom, flot 집중 연습
- r-blends 약함 → frap, grut, trab 집중 연습
- s-blends 약함 → stam, smop, snid 집중 연습

---

### 7. CLS (Correct Letter Sounds) 분석

NWF는 전체 단어뿐 아니라 **개별 음소(CLS)** 도 중요합니다.

```sql
-- 학생별 CLS 점수 계산
-- 참고: is_phonemes_correct는 개별 음소 정답 여부
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  COUNT(*) AS 시도_단어,
  -- CLS 점수 (개별 음소를 맞춘 개수)
  SUM(CASE WHEN is_phonemes_correct THEN 1 ELSE 0 END) AS CLS_점수,
  -- WWR 점수 (단어 전체를 맞춘 개수)
  SUM(CASE WHEN is_whole_word_correct THEN 1 ELSE 0 END) AS WWR_점수,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS_정답률,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR_정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY CLS_정답률 DESC;
```

**DIBELS NWF 기준:**
- **CLS (Correct Letter Sounds)**: 개별 음소 정답 개수
- **WWR (Whole Words Read)**: 단어 전체 정답 개수
- **목표**: CLS 50+ 또는 WWR 15+ (1분 기준)

---

### 8. 반별 파닉스 능력 비교

```sql
-- 반별 NWF 성적 요약
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  COUNT(*) AS 총_시도,
  ROUND(AVG(CASE WHEN tr.is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 평균_WWR,
  ROUND(AVG(CASE WHEN tr.is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS 평균_CLS,
  -- 블렌딩 능력 (WWR과 CLS의 차이)
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
```

**활용:**
- 블렌딩_격차가 큰 반 → 블렌딩 활동 강화
- WWR이 낮은 반 → 전반적인 파닉스 재교육

---

### 9. 특정 자음군별 성취도

```sql
-- 자음군별 상세 분석
WITH consonant_cluster_words AS (
  SELECT 
    question_word,
    is_whole_word_correct,
    CASE 
      WHEN question_word LIKE 'bl%' THEN 'bl'
      WHEN question_word LIKE 'cl%' THEN 'cl'
      WHEN question_word LIKE 'fl%' THEN 'fl'
      WHEN question_word LIKE 'gl%' THEN 'gl'
      WHEN question_word LIKE 'pl%' THEN 'pl'
      WHEN question_word LIKE 'br%' THEN 'br'
      WHEN question_word LIKE 'cr%' THEN 'cr'
      WHEN question_word LIKE 'dr%' THEN 'dr'
      WHEN question_word LIKE 'fr%' THEN 'fr'
      WHEN question_word LIKE 'gr%' THEN 'gr'
      WHEN question_word LIKE 'pr%' THEN 'pr'
      WHEN question_word LIKE 'tr%' THEN 'tr'
      WHEN question_word LIKE 'st%' THEN 'st'
      WHEN question_word LIKE 'sm%' THEN 'sm'
      WHEN question_word LIKE 'sn%' THEN 'sn'
      WHEN question_word LIKE 'sp%' THEN 'sp'
      WHEN question_word LIKE 'sk%' THEN 'sk'
      ELSE NULL
    END AS 자음군
  FROM test_results
  WHERE test_type = 'NWF'
)
SELECT 
  자음군,
  COUNT(*) AS 시도_수,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM consonant_cluster_words
WHERE 자음군 IS NOT NULL
GROUP BY 자음군
ORDER BY 정답률 ASC;
```

**활용:**
- st-blends 약함 → stam, ston 집중 연습
- fr-blends 약함 → frap, fral, frem 집중 연습

---

### 10. 개인별 성장 추적

```sql
-- 특정 학생의 재평가 시 향상도
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경
SELECT 
  DATE(created_at) AS 평가일,
  COUNT(*) AS 시도_단어,
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
  AND user_id = 'STUDENT-UUID'
GROUP BY DATE(created_at)
ORDER BY 평가일;
```

---

## 🎯 수준별 학습 그룹 편성

### 학생 그룹핑 기준

```sql
-- NWF 능력별 학생 분류
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
```

---

## 💡 교육 권장 활동

### 상위 그룹 (85%+)
**목표 단어:**
- 복합 패턴: clanp, krad, hilp, ferk
- 긴 단어: 5-6글자 nonsense words

**활동:**
- 빠른 디코딩 연습
- 다양한 자음군 조합
- 실제 단어와 연계

### 중상위 그룹 (70-84%)
**목표 단어:**
- CCVC: stam, clen, frap, smop, grut
- CVCC: clom, trab, jent, galk

**활동:**
- 자음군 블렌딩 연습
- 속도 향상 훈련
- 패턴 인식 게임

### 중하위 그룹 (55-69%)
**목표 단어:**
- 단순 CCVC: ston, pren, glom
- CVC 복습: sep, nem, dib, rop

**활동:**
- 기본 자음군 연습
- 천천히 정확하게
- 반복 학습

### 하위 그룹 (55% 미만)
**목표 단어:**
- CVC만 집중: sep, nem, dib, rop, lin, fom

**활동:**
- 기본 파닉스 재학습
- 1:1 개별 지도
- 음소-자소 대응 복습

---

## 📚 문항 구성 상세

### CVC 단어 예시 (90개)
```
쉬운 편: sep, nem, lin, fom, mig, rup, pid, mag, pim, sog
중간: tet, wep, vom, kun, yut, pom, gid, kom, wog, lan
```

### CCVC/CVCC 단어 예시 (50개)
```
l-blends: blut, clom, flot, glom, plap, clut
r-blends: frap, grut, trab, krat, pren, drem, trul
s-blends: stam, smop, ston, snid, snut, sker, smot, snib
종성자음군: jent, galk, tolt, larm, morl, hilp, clanp
```

### 복합 단어 예시 (10개)
```
고난도: clanp, krad, hilp, ferk, baip
```

---

## 🎨 시각화 아이디어

### 1. 자음군 마스터리 맵
```
학생별 자음군 능력:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          bl  cl  fl  pl  br  cr  dr  fr  gr  st  sm  sn
김민수    ●   ●   ●   ●   ●   ○   ○   ●   ●   ●   ●   ○
이영희    ●   ●   ○   ●   ○   ○   ●   ●   ○   ●   ●   ●
박철수    ○   ○   ○   ○   ○   ○   ○   ○   ○   ●   ○   ○

● = 80% 이상  ○ = 80% 미만
```

### 2. 패턴별 정답률 차트
```
CVC (기본)     ████████████████ 88%
l-blends       ████████████░░░░ 75%
r-blends       ███████████░░░░░ 72%
s-blends       ██████████░░░░░░ 68%
종성자음군     █████████░░░░░░░ 65%
복합패턴       ██████░░░░░░░░░░ 52%
```

### 3. 개인 파닉스 프로필
```
김민수 학생 파닉스 능력:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
개별 음소 인식:  ████████████ 92%
단어 블렌딩:     ██████████░░ 78%
CVC 패턴:        ████████████ 90%
자음군 처리:     ████████░░░░ 70%

💡 추천: r-blends 집중 학습 (frap, grut, trab)
```

---

## 📈 DIBELS NWF 평가 기준

### 일반적 기준 (학년별)
| 학년 | CLS 목표 | WWR 목표 |
|------|----------|----------|
| 1학년 중반 | 25-35 | 5-10 |
| 1학년 말 | 40-50 | 10-15 |
| 2학년 초 | 50-60 | 15-20 |

### 위험 지표
- CLS < 15 → 조기 개입 필요
- WWR < 3 → 기본 파닉스 재학습

---

## 🎓 교육적 권장 활용

### 1. 진단 평가 (Diagnostic)
```
전체 학생 NWF 평가 실시
→ CVC 정답률 확인
→ 70% 미만 학생: 기초 그룹
→ 70-85%: 중급 그룹
→ 85% 이상: 심화 그룹
```

### 2. 맞춤형 단어 목록 제공
```sql
-- 학생별 약점 단어 추출
SELECT question_word
FROM test_results
WHERE test_type = 'NWF'
  AND user_id = 'STUDENT-UUID'
  AND is_whole_word_correct = FALSE
ORDER BY created_at DESC
LIMIT 20;
```
→ 가정 학습용 단어 목록

### 3. 반복 평가 및 향상도 측정
```
1차 평가: CVC 70%, 자음군 50%
↓ (2주 집중 학습)
2차 평가: CVC 85%, 자음군 70%
→ 15-20%p 향상 확인
```

---

## 📊 예상 분석 결과

### 패턴별 예상 정답률
1. **CVC (3글자)**: 80-90% (가장 높음)
2. **l-blends**: 70-80%
3. **r-blends**: 70-80%
4. **s-blends**: 65-75%
5. **종성자음군**: 60-70%
6. **복합 패턴**: 50-60% (가장 낮음)

### 자주 틀릴 것으로 예상되는 단어
- **5글자 복합**: clanp, krad, hilp
- **생소한 조합**: skom, trul, vrat
- **양쪽 자음군**: trab, crum, frin

### 쉬운 단어
- **기본 CVC**: sep, nem, lin, fom, mig
- **친숙한 패턴**: stam, ston (st는 친숙)

---

## 🔧 SQL 쿼리 치트시트

### 빠른 분석 쿼리

#### 1. 어려운 단어 TOP 10
```sql
SELECT question_word, 
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results
WHERE test_type = 'NWF'
GROUP BY question_word
ORDER BY 정답률 ASC LIMIT 10;
```

#### 2. 학생별 성적
```sql
SELECT up.full_name,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS WWR,
  ROUND(AVG(CASE WHEN is_phonemes_correct THEN 100.0 ELSE 0 END), 1) AS CLS
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
GROUP BY up.full_name
ORDER BY WWR DESC;
```

#### 3. 자음군별 반 평균
```sql
SELECT 
  SUBSTRING(question_word, 1, 2) AS 초성,
  ROUND(AVG(CASE WHEN is_whole_word_correct THEN 100.0 ELSE 0 END), 1) AS 정답률
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'NWF'
  AND up.class_name = '나루초 3학년 다솜반'
  AND LENGTH(question_word) = 4
GROUP BY SUBSTRING(question_word, 1, 2)
ORDER BY 정답률 ASC;
```

---

## 💡 실전 팁

### 학부모 상담 자료
```
김민수 학생 NWF 평가 결과:

전체 정답률: 78%
개별 음소: 90% ✅ (우수)
단어 블렌딩: 78% (양호)

강점: CVC 패턴 완벽 숙지
약점: r-blends (fr, gr, tr)

권장 학습:
- 가정에서 연습: frap, grut, trab, drem
- 목표: 다음 평가에서 85% 이상
```

### 수업 계획
```
다음 주 파닉스 수업:
- 주제: r-blends 마스터
- 목표 단어: frap, grut, trab, krat, pren, drem
- 활동: 블렌딩 카드 게임, 읽기 릴레이
- 평가: 미니 퀴즈로 확인
```

---

**이제 NWF 평가를 통해 학생들의 파닉스 적용 능력과 자음군 처리 능력을 정밀하게 분석할 수 있습니다! 🎯📚**

주요 분석 포인트:
- ✅ CVC vs 자음군 정답률 비교
- ✅ 개별 음소 vs 블렌딩 능력
- ✅ 자음군 유형별 강약점
- ✅ 개인별 맞춤 학습 계획
- ✅ 반별 교육 전략 수립

