# Supabase에서 직접 데이터 추출 가이드

3개 학교의 각 교시별 데이터를 Supabase에서 직접 다운로드하는 방법입니다.

## 방법 1: Supabase SQL Editor 사용 (가장 간단)

### 1단계: Supabase 대시보드 접속
1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2단계: SQL 쿼리 실행
`scripts/export-results-to-csv.sql` 파일의 쿼리를 복사하여 실행:

#### 전체 데이터 추출 (모든 학교, 모든 교시)
```sql
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
  tr.test_type AS 교시,
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
LEFT JOIN test_results tr ON up.id = tr.user_id
WHERE up.role = 'student'
  AND tr.id IS NOT NULL
GROUP BY 
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
```

#### 특정 학교 데이터 추출
위 쿼리에 다음 조건 추가:
```sql
WHERE up.role = 'student'
  AND tr.id IS NOT NULL
  AND SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1) = 'danjae'  -- 학교명 변경
```

#### 특정 교시 데이터 추출
위 쿼리에 다음 조건 추가:
```sql
WHERE up.role = 'student'
  AND tr.id IS NOT NULL
  AND tr.test_type = 'p2_segmental_phoneme'  -- 교시 변경
```

### 3단계: 결과 다운로드
1. 쿼리 실행 후 결과가 표시됨
2. 결과 테이블 우측 상단의 **Download** 버튼 클릭
3. **CSV** 또는 **Excel** 형식 선택하여 다운로드

---

## 방법 2: TypeScript 스크립트 사용 (엑셀 파일 자동 생성)

### 1단계: 환경 변수 확인
`.env.local` 파일에 다음이 설정되어 있는지 확인:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2단계: 스크립트 실행

#### 모든 학교, 모든 교시
```bash
npx tsx scripts/export-results-to-excel.ts
```

#### 특정 학교, 모든 교시
```bash
npx tsx scripts/export-results-to-excel.ts danjae
```

#### 특정 학교, 특정 교시
```bash
npx tsx scripts/export-results-to-excel.ts danjae p2_segmental_phoneme
```

#### 모든 학교, 특정 교시
```bash
npx tsx scripts/export-results-to-excel.ts "" p2_segmental_phoneme
```

### 3단계: 파일 확인
생성된 엑셀 파일은 `exports/` 디렉토리에 저장됩니다:
- 파일명 형식: `학생평가결과_{학교명}_{교시}_{날짜}.xlsx`
- 예: `학생평가결과_danjae_2교시_20250113.xlsx`

---

## 교시 코드 매핑

| 교시 코드 | 교시명 |
|---------|--------|
| `p1_alphabet` | 1교시: 알파벳 인식 |
| `p2_segmental_phoneme` | 2교시: 단어를 듣고 올바른 단어 또는 알파벳 고르기 |
| `p3_suprasegmental_phoneme` | 3교시: 초절분절음소 인식 |
| `p4_fluency` | 4교시: 유창성 |
| `p5_vocabulary` | 5교시: 어휘 |
| `p6_comprehension` | 6교시: 이해력 |

---

## 학교명 확인 방법

Supabase SQL Editor에서 다음 쿼리로 학교 목록 확인:
```sql
SELECT DISTINCT
  SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1) AS 학교명,
  COUNT(DISTINCT up.id) AS 학생수
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.role = 'student'
GROUP BY SPLIT_PART(SPLIT_PART(au.email, '@', 2), '.', 1)
ORDER BY 학교명;
```

---

## 문제 해결

### SQL 쿼리 오류
- `auth.users` 테이블 접근 권한이 필요합니다
- Supabase SQL Editor에서는 자동으로 권한이 부여됩니다

### 스크립트 실행 오류
- `SUPABASE_SERVICE_ROLE_KEY`가 올바르게 설정되었는지 확인
- `tsx`가 설치되어 있는지 확인: `npm install -D tsx`

### 데이터가 없음
- `user_profiles` 테이블에 학생 데이터가 있는지 확인
- `test_results` 테이블에 테스트 결과가 있는지 확인
