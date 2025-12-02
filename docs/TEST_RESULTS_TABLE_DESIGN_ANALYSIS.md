# 테스트 결과 테이블 구조 설계 분석

## 📊 현재 구조 분석

### 현재 상황
- **단일 테이블 방식**: `test_results` 테이블 하나에 6가지 테스트 타입(LNF, PSF, NWF, WRF, ORF, MAZE) 결과를 모두 저장
- **테이블 구조**: 20개의 컬럼 중 대부분이 NULLABLE
- **데이터 분포**: 1,084개의 레코드

### 각 테스트 타입별 사용 필드

| 테스트 타입 | 사용하는 필드 | 미사용 필드 |
|------------|--------------|------------|
| **LNF** | `test_type`, `user_id`, `is_correct`, `question`, `student_answer`, `correct_answer`, `audio_url`, `transcription_results`, `created_at` | `is_phonemes_correct`, `is_whole_word_correct`, `target_phoneme_count`, `wcpm`, `accuracy`, `time_taken`, `error_details`, `error_type`, `correct_segments`, `target_segments`, `correct_letter_sounds` |
| **PSF** | `test_type`, `user_id`, `is_correct`, `question`, `student_answer`, `correct_answer`, `audio_url`, `transcription_results`, `created_at` | `is_phonemes_correct`, `is_whole_word_correct`, `target_phoneme_count`, `wcpm`, `accuracy`, `time_taken`, `error_details`, `error_type`, `correct_segments`, `target_segments`, `correct_letter_sounds` |
| **NWF** | `test_type`, `user_id`, `is_whole_word_correct`, `correct_letter_sounds`, `question`, `student_answer`, `correct_answer`, `audio_url`, `transcription_results`, `created_at` | `is_correct`, `is_phonemes_correct`, `target_phoneme_count`, `wcpm`, `accuracy`, `time_taken`, `error_details`, `error_type`, `correct_segments`, `target_segments` |
| **WRF** | `test_type`, `user_id`, `is_correct`, `question`, `student_answer`, `correct_answer`, `audio_url`, `transcription_results`, `created_at` | `is_phonemes_correct`, `is_whole_word_correct`, `target_phoneme_count`, `wcpm`, `accuracy`, `time_taken`, `error_details`, `error_type`, `correct_segments`, `target_segments`, `correct_letter_sounds` |
| **ORF** | `test_type`, `user_id`, `wcpm`, `accuracy`, `question`, `student_answer`, `correct_answer`, `audio_url`, `transcription_results`, `created_at` | `is_correct`, `is_phonemes_correct`, `is_whole_word_correct`, `target_phoneme_count`, `time_taken`, `error_details`, `error_type`, `correct_segments`, `target_segments`, `correct_letter_sounds` |
| **MAZE** | `test_type`, `user_id`, `is_correct`, `question`, `student_answer`, `correct_answer`, `audio_url`, `transcription_results`, `created_at` | `is_phonemes_correct`, `is_whole_word_correct`, `target_phoneme_count`, `wcpm`, `accuracy`, `time_taken`, `error_details`, `error_type`, `correct_segments`, `target_segments`, `correct_letter_sounds` |

**관찰:**
- 각 테스트 타입마다 사용하는 필드가 다름
- 많은 필드가 특정 테스트 타입에만 사용됨
- NULL 값이 많아 저장 공간 낭비 가능성

---

## 🔄 방식 1: 단일 테이블 (현재 구조)

### 구조 예시
```sql
CREATE TABLE test_results (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL,
  test_type TEXT NOT NULL,  -- 'LNF', 'PSF', 'NWF', 'WRF', 'ORF', 'MAZE'
  -- 공통 필드
  question TEXT,
  student_answer TEXT,
  correct_answer TEXT,
  audio_url TEXT,
  transcription_results JSONB,
  created_at TIMESTAMPTZ,
  -- 타입별 특화 필드 (대부분 NULLABLE)
  is_correct BOOLEAN,
  is_phonemes_correct BOOLEAN,
  is_whole_word_correct BOOLEAN,
  wcpm INTEGER,
  accuracy DOUBLE PRECISION,
  correct_letter_sounds INTEGER,
  -- ... 기타 필드
);
```

### ✅ 장점

#### 1. **단순한 쿼리**
```sql
-- 모든 테스트 결과를 한 번에 조회
SELECT * FROM test_results WHERE user_id = '...';

-- 특정 테스트 타입만 필터링
SELECT * FROM test_results WHERE user_id = '...' AND test_type = 'ORF';
```

#### 2. **통합 분석 용이**
```sql
-- 모든 테스트 타입의 통계를 한 번에 계산
SELECT 
  test_type,
  COUNT(*) as total,
  AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) as accuracy
FROM test_results
WHERE user_id = '...'
GROUP BY test_type;
```

#### 3. **세션 관리 간편**
```sql
-- 같은 세션의 모든 테스트 결과 조회
SELECT * FROM test_results WHERE session_id = '...';
```

#### 4. **트랜잭션 관리 용이**
- 하나의 테이블이므로 트랜잭션 경계가 명확
- 여러 테스트 결과를 한 번에 저장/수정 가능

#### 5. **인덱스 관리 단순**
```sql
-- 하나의 인덱스로 모든 테스트 타입 커버
CREATE INDEX idx_test_results_user_type ON test_results(user_id, test_type);
```

#### 6. **RLS 정책 단순**
- 하나의 정책으로 모든 테스트 타입 보안 관리

#### 7. **마이그레이션 용이**
- 테이블 구조 변경 시 한 곳만 수정

### ❌ 단점

#### 1. **스키마 복잡도 증가**
- 20개 이상의 컬럼으로 인한 인지 부하
- 어떤 필드가 어떤 테스트 타입에 사용되는지 명확하지 않음

#### 2. **데이터 무결성 제약 어려움**
```sql
-- ORF 테스트는 wcpm이 필수인데, 이를 강제할 수 없음
-- CHECK 제약조건으로 가능하지만 복잡함
ALTER TABLE test_results 
ADD CONSTRAINT chk_orf_wcpm 
CHECK (test_type != 'ORF' OR wcpm IS NOT NULL);
```

#### 3. **저장 공간 낭비**
- 각 레코드마다 사용하지 않는 필드에 NULL 저장
- PostgreSQL의 NULL 저장은 효율적이지만, 여전히 메타데이터 오버헤드 존재

#### 4. **타입 안정성 부족**
- 애플리케이션 레벨에서 필드 사용 여부를 체크해야 함
- 잘못된 필드 조합 사용 가능성

#### 5. **확장성 제한**
- 새로운 테스트 타입 추가 시 기존 스키마에 맞춰야 함
- 특화된 필드가 필요하면 모든 레코드에 컬럼 추가

#### 6. **쿼리 성능 이슈 가능성**
- 많은 NULL 컬럼으로 인한 인덱스 효율 저하 가능
- 특정 테스트 타입만 조회해도 모든 컬럼 스캔

---

## 🔀 방식 2: 테이블 분리 (테이블별 구조)

### 구조 예시
```sql
-- 공통 베이스 테이블 (선택사항)
CREATE TABLE test_results_base (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  question TEXT,
  student_answer TEXT,
  correct_answer TEXT,
  audio_url TEXT,
  transcription_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LNF 테스트 결과
CREATE TABLE test_results_lnf (
  id BIGINT PRIMARY KEY REFERENCES test_results_base(id),
  is_correct BOOLEAN NOT NULL
);

-- PSF 테스트 결과
CREATE TABLE test_results_psf (
  id BIGINT PRIMARY KEY REFERENCES test_results_base(id),
  is_correct BOOLEAN NOT NULL
);

-- NWF 테스트 결과
CREATE TABLE test_results_nwf (
  id BIGINT PRIMARY KEY REFERENCES test_results_base(id),
  is_whole_word_correct BOOLEAN NOT NULL,
  correct_letter_sounds INTEGER NOT NULL
);

-- ORF 테스트 결과
CREATE TABLE test_results_orf (
  id BIGINT PRIMARY KEY REFERENCES test_results_base(id),
  wcpm INTEGER NOT NULL,
  accuracy DOUBLE PRECISION NOT NULL
);

-- WRF 테스트 결과
CREATE TABLE test_results_wrf (
  id BIGINT PRIMARY KEY REFERENCES test_results_base(id),
  is_correct BOOLEAN NOT NULL
);

-- MAZE 테스트 결과
CREATE TABLE test_results_maze (
  id BIGINT PRIMARY KEY REFERENCES test_results_base(id),
  is_correct BOOLEAN NOT NULL
);
```

또는 더 단순하게:

```sql
-- 각 테이블이 독립적
CREATE TABLE test_results_lnf (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  question TEXT,
  student_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  audio_url TEXT,
  transcription_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 다른 테이블들도 유사하게...
```

### ✅ 장점

#### 1. **명확한 스키마**
- 각 테이블이 해당 테스트 타입에 필요한 필드만 포함
- 스키마만 봐도 어떤 필드가 사용되는지 명확

#### 2. **데이터 무결성 강화**
```sql
-- ORF 테이블의 wcpm은 NOT NULL로 강제
CREATE TABLE test_results_orf (
  ...
  wcpm INTEGER NOT NULL,  -- 필수 필드
  ...
);
```

#### 3. **타입 안정성**
- 각 테이블이 특정 테스트 타입 전용
- 잘못된 필드 조합 사용 불가능

#### 4. **저장 공간 효율**
- NULL 값이 없거나 최소화
- 각 레코드가 필요한 필드만 포함

#### 5. **쿼리 성능 최적화**
- 각 테이블이 작고 특화된 인덱스 사용 가능
- 필요한 데이터만 스캔

#### 6. **확장성**
- 새로운 테스트 타입 추가 시 새 테이블만 생성
- 기존 테이블에 영향 없음

#### 7. **독립적인 스키마 진화**
- 각 테이블이 독립적으로 진화 가능
- 특정 테스트 타입만 수정 가능

### ❌ 단점

#### 1. **복잡한 쿼리**
```sql
-- 모든 테스트 결과를 조회하려면 UNION 필요
SELECT 'LNF' as test_type, id, user_id, created_at FROM test_results_lnf
UNION ALL
SELECT 'PSF', id, user_id, created_at FROM test_results_psf
UNION ALL
SELECT 'NWF', id, user_id, created_at FROM test_results_nwf
-- ... 반복
WHERE user_id = '...';
```

#### 2. **통합 분석 복잡**
```sql
-- 모든 테스트 타입의 통계를 계산하려면 복잡한 쿼리
WITH all_results AS (
  SELECT 'LNF' as test_type, is_correct FROM test_results_lnf WHERE user_id = '...'
  UNION ALL
  SELECT 'PSF', is_correct FROM test_results_psf WHERE user_id = '...'
  -- ...
)
SELECT test_type, COUNT(*), AVG(is_correct::int) FROM all_results GROUP BY test_type;
```

#### 3. **세션 관리 복잡**
- 같은 세션의 결과를 조회하려면 여러 테이블 조인 필요

#### 4. **트랜잭션 복잡도 증가**
- 여러 테이블에 분산 저장 시 트랜잭션 관리 복잡

#### 5. **인덱스 관리 복잡**
- 각 테이블마다 인덱스 생성 필요

#### 6. **RLS 정책 중복**
- 각 테이블마다 유사한 RLS 정책 생성 필요

#### 7. **마이그레이션 복잡**
- 구조 변경 시 여러 테이블 수정 필요

#### 8. **애플리케이션 코드 복잡도 증가**
```typescript
// 단일 테이블 방식
const results = await supabase
  .from('test_results')
  .select('*')
  .eq('user_id', userId);

// 테이블 분리 방식
const lnfResults = await supabase.from('test_results_lnf').select('*').eq('user_id', userId);
const psfResults = await supabase.from('test_results_psf').select('*').eq('user_id', userId);
// ... 반복
```

---

## 🎯 하이브리드 방식: 단일 테이블 + JSONB 특화 필드

### 구조 예시
```sql
CREATE TABLE test_results (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL,
  test_type TEXT NOT NULL,
  session_id UUID NOT NULL,
  
  -- 공통 필드
  question TEXT,
  student_answer TEXT,
  correct_answer TEXT,
  audio_url TEXT,
  transcription_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 타입별 특화 데이터를 JSONB로 저장
  test_specific_data JSONB NOT NULL
);

-- 예시 데이터:
-- LNF: {"is_correct": true}
-- NWF: {"is_whole_word_correct": false, "correct_letter_sounds": 3}
-- ORF: {"wcpm": 120, "accuracy": 95.5}
```

### ✅ 장점
- 단일 테이블의 단순함 유지
- 타입별 특화 필드를 JSONB로 유연하게 저장
- 스키마 확장 용이

### ❌ 단점
- JSONB 쿼리 성능 (인덱싱 가능하지만 복잡)
- 데이터 무결성 검증 어려움
- 타입 안정성 부족

---

## 📊 비교표

| 항목 | 단일 테이블 | 테이블 분리 | 하이브리드 |
|------|------------|------------|-----------|
| **쿼리 단순성** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **스키마 명확성** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **데이터 무결성** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **저장 공간 효율** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **쿼리 성능** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **확장성** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **유지보수성** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **통합 분석 용이성** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 추천: 현재 프로젝트에 적합한 구조

### ✅ **단일 테이블 방식 유지 (현재 구조 개선)**

#### 추천 이유:

1. **현재 프로젝트 특성**
   - 6가지 테스트 타입이 모두 같은 세션에서 수행됨
   - 통합 대시보드에서 모든 테스트 결과를 함께 보여줌
   - 교사가 학생의 모든 테스트 결과를 한 번에 조회

2. **데이터 규모**
   - 현재 1,084개 레코드 (중간 규모)
   - 테이블 분리의 이점이 크지 않음

3. **쿼리 패턴**
   ```typescript
   // 현재 코드 패턴
   const results = await supabase
     .from('test_results')
     .select('*')
     .eq('user_id', userId)
     .eq('session_id', sessionId);
   
   // 이 패턴이 자주 사용됨 → 단일 테이블이 유리
   ```

4. **개발 속도**
   - 단일 테이블이 개발 및 유지보수 용이

### 🔧 개선 제안

#### 1. **CHECK 제약조건 추가**
```sql
-- 각 테스트 타입별 필수 필드 검증
ALTER TABLE test_results
ADD CONSTRAINT chk_lnf_fields
CHECK (
  test_type != 'LNF' OR 
  (is_correct IS NOT NULL)
);

ALTER TABLE test_results
ADD CONSTRAINT chk_orf_fields
CHECK (
  test_type != 'ORF' OR 
  (wcpm IS NOT NULL AND accuracy IS NOT NULL)
);

ALTER TABLE test_results
ADD CONSTRAINT chk_nwf_fields
CHECK (
  test_type != 'NWF' OR 
  (is_whole_word_correct IS NOT NULL AND correct_letter_sounds IS NOT NULL)
);
```

#### 2. **테이블 주석 추가**
```sql
COMMENT ON TABLE test_results IS '모든 테스트 타입의 결과를 저장하는 통합 테이블';
COMMENT ON COLUMN test_results.test_type IS '테스트 유형: LNF, PSF, NWF, WRF, ORF, MAZE';
COMMENT ON COLUMN test_results.wcpm IS 'ORF 테스트 전용: Words Correct Per Minute';
COMMENT ON COLUMN test_results.is_whole_word_correct IS 'NWF 테스트 전용: 전체 단어 정확도';
```

#### 3. **인덱스 최적화**
```sql
-- 테스트 타입별 조회 최적화
CREATE INDEX idx_test_results_user_type ON test_results(user_id, test_type);
CREATE INDEX idx_test_results_session_type ON test_results(session_id, test_type);

-- ORF 특화 인덱스
CREATE INDEX idx_test_results_orf_wcpm ON test_results(user_id, wcpm) 
WHERE test_type = 'ORF';
```

#### 4. **애플리케이션 레벨 타입 안정성**
```typescript
// 타입별 인터페이스 정의
interface LNFResult {
  test_type: 'LNF';
  is_correct: boolean;
  // ...
}

interface ORFResult {
  test_type: 'ORF';
  wcpm: number;
  accuracy: number;
  // ...
}

type TestResult = LNFResult | ORFResult | NWFResult | ...;

// 타입 가드 사용
function isORFResult(result: TestResult): result is ORFResult {
  return result.test_type === 'ORF';
}
```

#### 5. **부분 인덱스 활용**
```sql
-- 각 테스트 타입별 특화 인덱스
CREATE INDEX idx_test_results_lnf_user ON test_results(user_id, created_at)
WHERE test_type = 'LNF';

CREATE INDEX idx_test_results_orf_user ON test_results(user_id, wcpm, accuracy)
WHERE test_type = 'ORF';
```

---

## 📈 미래 확장 시나리오

### 시나리오 1: 테스트 타입이 10개 이상으로 증가
→ **테이블 분리 고려**

### 시나리오 2: 각 테스트 타입의 필드가 크게 달라짐
→ **테이블 분리 고려**

### 시나리오 3: 데이터가 수백만 건으로 증가
→ **테이블 분리 또는 파티셔닝 고려**

### 시나리오 4: 현재 구조 유지하면서 성능 최적화 필요
→ **현재 구조 유지 + 인덱스 최적화**

---

## 🎓 결론

**현재 프로젝트에는 단일 테이블 방식을 유지하되, 다음을 개선하는 것을 추천합니다:**

1. ✅ CHECK 제약조건으로 데이터 무결성 강화
2. ✅ 주석으로 스키마 문서화
3. ✅ 부분 인덱스로 성능 최적화
4. ✅ 애플리케이션 레벨 타입 안정성 강화

**테이블 분리는 다음 경우에 고려:**
- 테스트 타입이 10개 이상으로 증가
- 각 테스트 타입의 필드가 완전히 다르고 독립적
- 데이터가 수백만 건으로 증가하여 성능 이슈 발생
- 각 테스트 타입이 독립적인 비즈니스 로직을 가짐

현재는 **단일 테이블 + 개선사항 적용**이 최적의 선택입니다.







