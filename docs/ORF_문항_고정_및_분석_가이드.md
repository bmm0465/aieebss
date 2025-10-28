# 📝 ORF 평가 문항 고정 및 분석 가이드

## ✅ 변경 사항

### 이전: 단순 단문 지문
```
A little cat saw a big dog. The dog had a red ball. 
The cat wanted to play. 'Can I play with you?' said the cat. 
The dog said, 'Yes, you can!' They played with the red ball all day.
```
- 단순한 서술문
- 약 40단어

### 현재: 대화형 복합 지문 ✨
- ✅ **5개의 미니 스토리**
- ✅ **대화체 포함** (실제 의사소통 패턴)
- ✅ **난이도 점진적 증가**
- ✅ **약 150단어** (더 풍부한 평가)
- ✅ **모든 학생에게 동일한 지문**

---

## 📋 지문 구성 (150단어)

### 5개 미니 스토리

#### 1️⃣ **Four Dogs** (초급)
```
Hello! How many dogs?
Hi! One, two, three, four. Four dogs!
Okay. Come in.
```
**특징:**
- 숫자 세기
- 간단한 대화
- 짧은 문장
- **단어 수**: 약 15단어

---

#### 2️⃣ **Do You Have a Ball?** (초급)
```
Do you have a ball?
Yes, I do. Here you are.
Thank you.

Catch the ball!
```
**특징:**
- 소유 표현
- 명령문
- 기본 예의
- **단어 수**: 약 15단어

---

#### 3️⃣ **Orange Juice** (초중급)
```
Do you have juice?
Yes, I do. Do you like orange juice?
Yes, I do. I like orange juice.
Here.
Thank you. Bye.
Goodbye.
```
**특징:**
- 선호도 묻기
- 반복 구조
- 인사 표현
- **단어 수**: 약 25단어

---

#### 4️⃣ **At the Desk** (중급)
```
Leo: What are you doing?
Mia: I am drawing a picture.
Leo: Wow. What is it?
Mia: It is a big, yellow sun.
Leo: I like your picture. It is very nice.
Mia: Thank you, Leo.
```
**특징:**
- 현재진행형
- 형용사 사용
- 감정 표현
- 이름 호명
- **단어 수**: 약 35단어

---

#### 5️⃣ **In the Park** (중상급)
```
Ann: What is that?
Ben: This is my new ball.
Ann: Wow, it is a big ball. I like the color.
Ben: Thank you. It is blue.
Ann: Can we play with the ball?
Ben: Yes! Let's play together.
```
**특징:**
- 지시대명사 (this/that)
- 제안하기 (Can we...?)
- 긴 문장
- 복합 구조
- **단어 수**: 약 40단어

---

## 📊 교육적 분석 포인트

### 1. 유창성 (Fluency) - WCPM 측정

#### WCPM (Words Correct Per Minute)
```sql
-- 학생별 ORF 유창성 점수
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  COUNT(*) AS 평가_횟수,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  ROUND(MAX(tr.wcpm), 1) AS 최고_WCPM,
  RANK() OVER (ORDER BY AVG(tr.wcpm) DESC) AS 순위
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY 평균_WCPM DESC;
```

**DIBELS ORF 기준:**
| 학년 | 목표 WCPM | 위험 지표 |
|------|----------|----------|
| 1학년 말 | 40-60 | <30 |
| 2학년 말 | 70-90 | <50 |
| 3학년 말 | 90-110 | <70 |
| 4학년 말 | 100-120 | <80 |

---

### 2. 정확도 (Accuracy) 분석

```sql
-- 반별 정확도 비교
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  ROUND(MIN(tr.accuracy), 1) AS 최저_정확도,
  ROUND(MAX(tr.accuracy), 1) AS 최고_정확도,
  -- 정확도별 분포
  SUM(CASE WHEN tr.accuracy >= 95 THEN 1 ELSE 0 END) AS 우수_95이상,
  SUM(CASE WHEN tr.accuracy BETWEEN 90 AND 94.9 THEN 1 ELSE 0 END) AS 양호_90이상,
  SUM(CASE WHEN tr.accuracy < 90 THEN 1 ELSE 0 END) AS 개선필요_90미만
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY up.class_name
ORDER BY 평균_정확도 DESC;
```

**정확도 기준:**
- **우수**: 97% 이상
- **양호**: 93-96%
- **주의**: 90-92%
- **개입 필요**: 90% 미만

---

### 3. 유창성 vs 정확도 균형

```sql
-- 유창성과 정확도의 균형 분석
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
  END AS 읽기_유형
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY tr.user_id, up.full_name, up.class_name
ORDER BY WCPM DESC;
```

**교육적 조치:**
- **속도형**: 정확도 향상 연습 (천천히, 정확하게)
- **정확형**: 속도 향상 연습 (반복 읽기, 타이머 사용)
- **개선필요**: 기초부터 체계적 지도

---

### 4. 지문 구간별 난이도 분석

```sql
-- 학생들이 어느 부분에서 어려움을 겪는지 분석
-- (향후 구현: 지문을 구간별로 나누어 저장하는 경우)
SELECT 
  up.full_name AS 학생이름,
  tr.wcpm AS WCPM,
  tr.accuracy AS 정확도,
  CASE 
    WHEN tr.wcpm < 40 THEN '초반부터 어려움'
    WHEN tr.accuracy < 85 THEN '후반부 정확도 하락 (피로도)'
    WHEN tr.wcpm >= 80 AND tr.accuracy >= 95 THEN '전체 유창함'
    ELSE '중간 수준'
  END AS 추정_패턴
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
ORDER BY tr.wcpm DESC;
```

---

### 5. 학생별 성장 추적

```sql
-- 특정 학생의 ORF 성장 곡선
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  wcpm AS WCPM,
  accuracy AS 정확도,
  -- 전 평가 대비 WCPM 증가
  wcpm - LAG(wcpm) OVER (ORDER BY DATE(created_at)) AS WCPM_증가,
  -- 전 평가 대비 정확도 변화
  ROUND(accuracy - LAG(accuracy) OVER (ORDER BY DATE(created_at)), 1) AS 정확도_변화
FROM test_results
WHERE test_type = 'ORF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
ORDER BY 평가일;
```

**성장 패턴 해석:**
- WCPM 꾸준히 증가 → 정상적 발달
- WCPM 정체 → 학습 전략 변경 필요
- 정확도 감소 → 속도에 집중한 나머지 정확도 희생

---

### 6. 반별 비교

```sql
-- 반별 ORF 성적 비교
SELECT 
  up.class_name AS 반,
  up.grade_level AS 학년,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  -- 학년별 기대치 대비
  CASE 
    WHEN up.grade_level = '3학년' AND AVG(tr.wcpm) >= 90 THEN '목표 달성'
    WHEN up.grade_level = '4학년' AND AVG(tr.wcpm) >= 100 THEN '목표 달성'
    ELSE '추가 연습 필요'
  END AS 학년별_평가
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY up.class_name, up.grade_level
ORDER BY 평균_WCPM DESC;
```

---

## 🎯 새 지문의 교육적 장점

### 1. 대화체 포함 (Dialogue)
**교육적 효과:**
- 억양과 강세 연습
- 실제 의사소통 패턴 학습
- 등장인물별 목소리 변화

**분석 포인트:**
- 대화 부분의 유창성
- 화자 전환 시 자연스러움
- 감정 표현 능력

---

### 2. 점진적 난이도 증가

| 스토리 | 난이도 | 특징 |
|--------|--------|------|
| Four Dogs | ★☆☆☆ | 숫자, 단순 대화 |
| Do You Have a Ball? | ★☆☆☆ | 소유 표현, 명령문 |
| Orange Juice | ★★☆☆ | 반복 구조, 선호도 |
| At the Desk | ★★★☆ | 현재진행형, 형용사 |
| In the Park | ★★★★ | 복합 문장, 제안하기 |

**교육적 의미:**
- 학생이 어느 수준까지 유창하게 읽는지 파악
- 초급 스토리만 잘 읽음 → 기초 수준
- 고급 스토리도 유창 → 심화 수준

---

### 3. 다양한 문장 유형

**포함된 문법 구조:**
- **의문문**: What are you doing? Do you have...?
- **긍정문**: I have a cookie. It is blue.
- **부정문**: (암묵적)
- **명령문**: Catch the ball! Come in.
- **현재진행형**: I am drawing a picture.
- **조동사**: Can we play...?

**분석:**
- 어떤 문장 유형에서 실수가 많은지
- 복잡한 구조에서 유창성이 떨어지는지

---

### 4. 주제별 어휘

**포함된 주제:**
- **숫자**: one, two, three, four
- **색깔**: yellow, blue
- **일상 물건**: ball, cookie, picture, desk
- **장소**: desk, park
- **동작**: drawing, play, catch
- **예의**: please, thank you, hello, goodbye

**활용:**
- 주제별 어휘 노출 확인
- 실생활 어휘 사용 능력

---

## 📊 분석 가능한 데이터

### 1. WCPM (Words Correct Per Minute)

```sql
-- 학생별 WCPM 분포
SELECT 
  CASE 
    WHEN wcpm < 40 THEN '1. 매우 느림 (<40)'
    WHEN wcpm BETWEEN 40 AND 59 THEN '2. 느림 (40-59)'
    WHEN wcpm BETWEEN 60 AND 79 THEN '3. 보통 (60-79)'
    WHEN wcpm BETWEEN 80 AND 99 THEN '4. 빠름 (80-99)'
    ELSE '5. 매우 빠름 (100+)'
  END AS 속도_구간,
  COUNT(*) AS 학생_수,
  ROUND(AVG(accuracy), 1) AS 평균_정확도
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE test_type = 'ORF'
GROUP BY 속도_구간
ORDER BY 속도_구간;
```

---

### 2. 정확도 분석

```sql
-- 정확도별 학생 분포
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
```

---

### 3. 개인별 상세 분석

```sql
-- 특정 학생의 ORF 기록
-- ⚠️ STUDENT-UUID를 실제 UUID로 변경하세요
SELECT 
  DATE(created_at) AS 평가일,
  wcpm AS WCPM,
  accuracy AS 정확도,
  -- 유창성과 정확도의 곱 (종합 점수)
  ROUND(wcpm * accuracy / 100, 1) AS 종합_점수,
  CASE 
    WHEN wcpm >= 80 AND accuracy >= 95 THEN '이상적'
    WHEN wcpm >= 80 THEN '속도 우선'
    WHEN accuracy >= 95 THEN '정확도 우선'
    ELSE '개선 필요'
  END AS 읽기_스타일
FROM test_results
WHERE test_type = 'ORF'
  AND user_id = 'STUDENT-UUID'  -- 여기에 학생 UUID 입력
ORDER BY 평가일;
```

---

### 4. 반별 비교

```sql
-- 반별 ORF 성적 요약
SELECT 
  up.class_name AS 반,
  COUNT(DISTINCT tr.user_id) AS 학생_수,
  ROUND(AVG(tr.wcpm), 1) AS 평균_WCPM,
  ROUND(AVG(tr.accuracy), 1) AS 평균_정확도,
  ROUND(MIN(tr.wcpm), 1) AS 최저_WCPM,
  ROUND(MAX(tr.wcpm), 1) AS 최고_WCPM,
  ROUND(STDDEV(tr.wcpm), 1) AS WCPM_표준편차
FROM test_results tr
JOIN user_profiles up ON tr.user_id = up.id
WHERE tr.test_type = 'ORF'
GROUP BY up.class_name
ORDER BY 평균_WCPM DESC;
```

**표준편차 해석:**
- 표준편차 큼 → 학생 간 편차 큼 → 수준별 그룹 필요
- 표준편차 작음 → 학생 수준 비슷 → 일괄 지도 가능

---

### 5. 성장 곡선 분석

```sql
-- 학생별 성장 추이 (최소 2회 이상 평가)
WITH growth_analysis AS (
  SELECT 
    user_id,
    DATE(created_at) AS 평가일,
    wcpm,
    accuracy,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS 평가차수
  FROM test_results
  WHERE test_type = 'ORF'
)
SELECT 
  up.full_name AS 학생이름,
  up.class_name AS 반,
  MAX(CASE WHEN ga.평가차수 = 1 THEN ga.wcpm END) AS 첫평가_WCPM,
  MAX(CASE WHEN ga.평가차수 = (SELECT MAX(평가차수) FROM growth_analysis WHERE user_id = ga.user_id) 
       THEN ga.wcpm END) AS 최근평가_WCPM,
  MAX(CASE WHEN ga.평가차수 = (SELECT MAX(평가차수) FROM growth_analysis WHERE user_id = ga.user_id) 
       THEN ga.wcpm END) - 
  MAX(CASE WHEN ga.평가차수 = 1 THEN ga.wcpm END) AS WCPM_증가량,
  COUNT(DISTINCT ga.평가차수) AS 평가_횟수
FROM growth_analysis ga
JOIN user_profiles up ON ga.user_id = up.id
GROUP BY ga.user_id, up.full_name, up.class_name
HAVING COUNT(DISTINCT ga.평가차수) >= 2
ORDER BY WCPM_증가량 DESC;
```

---

## 🎓 교육적 활용

### 1. 읽기 유창성 발달 단계

#### 1단계: 단어별 읽기 (Word-by-word)
- WCPM: <40
- 특징: 단어 하나씩 끊어 읽음
- 조치: 구문 읽기 연습 (phrase reading)

#### 2단계: 구문별 읽기 (Phrase reading)
- WCPM: 40-70
- 특징: 2-3단어씩 묶어 읽음
- 조치: 표현력 향상 연습

#### 3단계: 유창한 읽기 (Fluent reading)
- WCPM: 70-100
- 특징: 자연스러운 흐름
- 조치: 표현 읽기, 독립 읽기

#### 4단계: 표현적 읽기 (Expressive reading)
- WCPM: 100+
- 특징: 감정, 억양 표현
- 조치: 연극, 발표 활동

---

### 2. 대화체 읽기 능력

새 지문은 **대화가 많아서** 다음을 평가할 수 있습니다:

```sql
-- 대화체 읽기 능력 (정성적 평가를 위한 메모)
-- 교사가 직접 듣고 평가:
-- 1. 화자 구분이 명확한가?
-- 2. 대화의 억양이 자연스러운가?
-- 3. 감정 표현이 있는가?
```

**평가 기준:**
- ✅ Leo, Mia, Ann, Ben 화자 구분 명확
- ✅ 물음표에서 억양 상승
- ✅ 감탄사(Wow, Thank you)에 감정 표현

---

### 3. 수준별 맞춤 지도

```sql
-- ORF 능력별 그룹핑
WITH student_levels AS (
  SELECT 
    tr.user_id,
    up.full_name,
    up.class_name,
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
  GROUP BY tr.user_id, up.full_name, up.class_name
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
```

---

## 💡 지문 특성별 분석 아이디어

### 1. 스토리별 난이도 (향후 구현 가능)

지문을 5개 스토리로 나누어 저장한다면:

```
학생별 스토리 완료도:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Story1  Story2  Story3  Story4  Story5
김민수        ●      ●       ●       ●       ○
이영희        ●      ●       ●       ○       ×
박철수        ●      ●       ○       ×       ×

● = 완료  ○ = 일부  × = 미완료
```

### 2. 문장 유형별 유창성

```
의문문 읽기: 85%
긍정문 읽기: 92%
명령문 읽기: 88%

→ 의문문 억양 연습 필요
```

### 3. 대화 파트 vs 서술 파트

```
대화 파트 (Story 1-3): 90 WCPM
서술 파트 (Story 4-5): 75 WCPM

→ 서술문 읽기 연습 필요
```

---

## 🎨 시각화 아이디어

### 1. WCPM 성장 그래프
```
WCPM
120 │
100 │              ╱
 80 │          ╱
 60 │      ╱
 40 │  ╱
 20 │╱
    └─────────────────────
    1차  2차  3차  4차  5차
```

### 2. 유창성 vs 정확도 산점도
```
정확도
100%│    ●●●
 95%│  ●  ●  ●
 90%│ ●     ●
 85%│●
    └─────────────────
    40  60  80  100  WCPM

이상적 영역: 우상단 (빠르고 정확)
```

### 3. 반별 비교 레이더 차트
```
         WCPM
          │
평균정확도 ┼ 최고WCPM
          │
      학생수 
```

---

## 📚 지문 분석

### 단어 수 통계
- **총 단어**: 약 150단어
- **유니크 단어**: 약 70개
- **평균 문장 길이**: 6-8단어
- **대화 비율**: 약 70%
- **서술 비율**: 약 30%

### 어휘 수준
- **Dolch Words**: 80% 이상
- **새 어휘**: drawing, picture, color, park 등
- **반복 단어**: 
  - "ball" 6회
  - "yes" 5회
  - "thank you" 4회

### 문법 복잡도
- **단문**: 60%
- **중문**: 30%
- **복문**: 10%

---

## 🎯 교육 권장 활동

### 상위 그룹 (100+ WCPM)
**활동:**
- 연극 대본 읽기
- 라디오 DJ 놀이
- 감정 표현 읽기
- 낭독 녹음 프로젝트

**목표:**
- 표현력 향상
- 청중 앞 발표

---

### 중상위 그룹 (70-99 WCPM)
**활동:**
- 파트너 읽기 (짝과 번갈아)
- 반복 읽기 (같은 지문 3-5회)
- 타이머 챌린지
- 리더스 북 읽기

**목표:**
- 속도 향상 (100+ 목표)
- 정확도 유지

---

### 중하위 그룹 (40-69 WCPM)
**활동:**
- 교사 따라 읽기 (echo reading)
- 구문 단위 연습
- 음성 녹음 듣기
- 슬로우 리딩

**목표:**
- 기본 유창성 확보
- 70 WCPM 달성

---

### 하위 그룹 (<40 WCPM)
**활동:**
- 1:1 개별 지도
- 단어 인지 연습 (WRF 복습)
- 짧은 문장 반복 읽기
- 손가락으로 따라가며 읽기

**목표:**
- 기초 유창성
- 40 WCPM 달성

---

## 📊 예상 분석 결과

### WCPM 분포 (예상)
- **100+ WCPM**: 10-15% (상위)
- **70-99 WCPM**: 40-50% (중상위)
- **40-69 WCPM**: 30-40% (중하위)
- **<40 WCPM**: 5-10% (하위)

### 스토리별 완료율 (예상)
- **Story 1-2**: 95% 완료
- **Story 3**: 85% 완료
- **Story 4**: 70% 완료
- **Story 5**: 60% 완료

---

## 💡 실전 활용

### 시나리오 1: 학부모 상담
```
김민수 학생 ORF 결과:

WCPM: 85점 (3학년 기준: 양호)
정확도: 94% (우수)

읽기 스타일: 속도형
- 빠르게 읽지만 가끔 단어 건너뜀
- 권장: 정확도 향상 연습

다음 목표:
- WCPM 유지하면서 정확도 97% 이상
```

### 시나리오 2: 반 전체 수업
```
나루초 3학년 다솜반 분석:
- 평균 WCPM: 78점
- 평균 정확도: 92%

→ 다음 주 수업: 구문 읽기 연습
→ 활동: 짝과 대화 읽기
→ 목표: 반 평균 85 WCPM 달성
```

### 시나리오 3: 개별 학습 계획
```
박철수 학생 (WCPM 45):
- 현재: 단어별 읽기 단계
- 약점: Story 4-5에서 멈춤 많음
- 계획:
  Week 1-2: Story 1-2 완벽 숙지 (반복 10회)
  Week 3-4: Story 3-4 연습 (5회)
  Week 5: 재평가 (목표 60 WCPM)
```

---

## 🔍 심화 분석 (향후)

### 1. 실수 유형 분석
- 생략 (omission)
- 대체 (substitution)
- 삽입 (insertion)
- 자가 수정 (self-correction)

### 2. 프로소디 (Prosody) 평가
- 억양 (intonation)
- 강세 (stress)
- 속도 변화 (pacing)
- 표현력 (expression)

### 3. 이해도와 연계
- ORF 점수와 MAZE 점수 상관관계
- 빠르게 읽지만 이해도 낮은 학생 식별

---

**새로운 대화형 지문으로 더 풍부한 유창성 평가가 가능합니다! 📖✨**

주요 개선점:
- ✅ 150단어로 더 긴 평가
- ✅ 대화체로 실제적 읽기
- ✅ 점진적 난이도 증가
- ✅ 다양한 문법 구조
- ✅ 주제별 어휘 포함

