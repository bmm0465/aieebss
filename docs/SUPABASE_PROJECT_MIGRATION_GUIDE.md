# Supabase 프로젝트 마이그레이션 가이드

이 가이드는 AIDTPEL 프로젝트의 모든 데이터를 AIEEBSS 프로젝트로 안전하게 이전하는 방법을 설명합니다.

## 목차

1. [사전 준비](#사전-준비)
2. [데이터 품질 분석](#데이터-품질-분석)
3. [데이터 정리](#데이터-정리)
4. [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
5. [Storage 파일 마이그레이션](#storage-파일-마이그레이션)
6. [환경변수 업데이트](#환경변수-업데이트)
7. [마이그레이션 검증](#마이그레이션-검증)
8. [데이터베이스 최적화](#데이터베이스-최적화)
9. [트러블슈팅](#트러블슈팅)

## 사전 준비

### 1. 환경변수 설정

`.env.local` 파일에 다음 환경변수를 추가하세요:

```bash
# 기존 프로젝트 (AIDTPEL)
OLD_SUPABASE_URL=https://[old-project-id].supabase.co
OLD_SUPABASE_SERVICE_ROLE_KEY=your_old_service_role_key
OLD_SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres

# 새 프로젝트 (AIEEBSS)
NEXT_PUBLIC_SUPABASE_URL=https://[new-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
NEW_SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres

# Storage 버킷 이름 (기본값: student-recordings)
STORAGE_BUCKET_NAME=student-recordings
```

#### 데이터베이스 연결 문자열(DB URL) 확인 방법

**Supabase 대시보드에서 확인:**

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 왼쪽 사이드바에서 **Settings** → **Database** 클릭
4. **Connection Info** 섹션에서 **Connection string** 확인
5. 또는 프로젝트 메인 페이지에서 **Connect** 버튼 클릭

**연결 문자열 형식:**

- **Direct connection** (IPv6 필요):
  ```
  postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
  ```

- **Supavisor Session mode** (IPv4 지원):
  ```
  postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
  ```

- **Supavisor Transaction mode** (서버리스용):
  ```
  postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  ```

**비밀번호 확인:**

- 데이터베이스 비밀번호는 프로젝트 생성 시 설정한 비밀번호입니다
- 비밀번호를 잊어버린 경우: **Settings** → **Database** → **Database password**에서 재설정 가능

**참고:**
- `pg_dump` 스크립트 사용 시에는 **Direct connection** 또는 **Supavisor Session mode**를 사용하세요
- IPv6를 지원하지 않는 환경에서는 **Supavisor Session mode**를 사용하세요

### 2. 필수 도구 설치

- Node.js 및 npm
- PostgreSQL 클라이언트 (pg_dump, psql) - pg_dump 방법 사용 시

### 3. 백업 생성

**중요**: 마이그레이션 전에 기존 프로젝트의 백업을 생성하세요.

```bash
# Supabase 대시보드에서 수동 백업 생성
# 또는 pg_dump를 사용하여 백업
pg_dump "$OLD_SUPABASE_DB_URL" -f backup_$(date +%Y%m%d_%H%M%S).sql
```

## 데이터 품질 분석

마이그레이션 전에 기존 프로젝트의 데이터 품질을 분석합니다.

### 실행 방법

```bash
npx tsx scripts/analyze-data-quality.ts
```

### 분석 항목

- 사용되지 않는 컬럼 식별
- NULL 값이 많은 컬럼 확인
- Orphaned records 확인
- 중복 데이터 검색
- Storage와 DB 불일치 확인
- 스키마 이슈 확인

### 결과 확인

분석 결과는 `data-quality-analysis.json` 파일에 저장됩니다. 이 파일을 기반으로 정리 작업을 수행할 수 있습니다.

## 데이터 정리

분석 결과를 바탕으로 불필요한 데이터를 정리합니다.

### 실행 방법

```bash
# Dry-run (실제 삭제 없이 미리보기)
npx tsx scripts/cleanup-old-project.ts

# 실제 정리 실행
npx tsx scripts/cleanup-old-project.ts --execute

# 특정 작업만 실행
npx tsx scripts/cleanup-old-project.ts --remove-orphaned    # Orphaned records만
npx tsx scripts/cleanup-old-project.ts --remove-files       # Orphaned files만
npx tsx scripts/cleanup-old-project.ts --remove-old 365    # 365일 이상 된 데이터
```

### 정리 항목

1. **Orphaned Records 제거**
   - 삭제된 사용자의 test_results 레코드
   - 삭제된 사용자의 teacher_student_assignments 레코드

2. **Orphaned Files 제거**
   - DB에 참조가 없는 Storage 파일

3. **오래된 데이터 정리** (선택적)
   - 지정된 기간 이상 된 데이터 삭제

### 주의사항

- 정리 작업은 **되돌릴 수 없습니다**
- 실행 전에 반드시 백업을 생성하세요
- Dry-run 모드로 먼저 확인하세요

## 데이터베이스 마이그레이션

데이터베이스 마이그레이션에는 두 가지 방법이 있습니다:

### 방법 1: Supabase API 기반 (권장)

소규모~중규모 데이터에 적합합니다.

```bash
# Dry-run
npx tsx scripts/migrate-database.ts

# 실제 마이그레이션
npx tsx scripts/migrate-database.ts --execute

# 배치 크기 조정 (기본값: 100)
npx tsx scripts/migrate-database.ts --execute --batch-size=50
```

**마이그레이션 순서:**
1. user_profiles
2. teacher_student_assignments
3. curriculum_pdfs
4. curriculum_pdf_chunks
5. generated_test_items
6. item_approval_workflow
7. test_results
8. Auth 사용자

### 방법 2: pg_dump/psql 기반

대용량 데이터에 적합합니다.

```bash
# 실행 권한 부여
chmod +x scripts/migrate-database-pgdump.sh

# Dry-run
DRY_RUN=true ./scripts/migrate-database-pgdump.sh

# 실제 마이그레이션
./scripts/migrate-database-pgdump.sh
```

**단계:**
1. 스키마 덤프
2. 데이터 덤프
3. 새 프로젝트에 스키마 적용
4. 새 프로젝트에 데이터 적용

## Storage 파일 마이그레이션

Storage 파일을 프로젝트 간에 마이그레이션합니다.

### 실행 방법

```bash
# Dry-run
npx tsx scripts/migrate-storage-between-projects.ts

# 실제 마이그레이션
npx tsx scripts/migrate-storage-between-projects.ts --execute

# Orphaned 파일도 포함
npx tsx scripts/migrate-storage-between-projects.ts --execute --include-orphaned
```

### 마이그레이션 대상

- 기본적으로 DB에 참조가 있는 파일만 마이그레이션
- `--include-orphaned` 플래그로 모든 파일 마이그레이션 가능

### 진행 상황

- 10개 파일마다 진행 상황 표시
- 실패한 파일은 에러 로그에 기록

## 환경변수 업데이트

새 프로젝트 정보로 환경변수를 업데이트합니다.

### 실행 방법

```bash
# Dry-run
npx tsx scripts/update-env-vars.ts

# 실제 업데이트
npx tsx scripts/update-env-vars.ts --execute
```

### 업데이트 항목

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Vercel 환경변수 업데이트

스크립트 실행 후 Vercel 대시보드에서도 환경변수를 업데이트하세요:

1. Vercel 프로젝트 설정 → Environment Variables
2. 각 환경변수를 새 프로젝트 값으로 업데이트
3. 또는 Vercel CLI 사용:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

## 마이그레이션 검증

마이그레이션 후 데이터 무결성을 검증합니다.

### 실행 방법

```bash
npx tsx scripts/verify-migration.ts
```

### 검증 항목

1. **테이블별 레코드 수 비교**
   - 소스와 타겟의 레코드 수 일치 확인

2. **Storage 파일 수 비교**
   - 소스와 타겟의 파일 수 일치 확인

3. **샘플 데이터 검증**
   - 주요 레코드의 데이터 일치 확인

4. **외래키 무결성 확인**
   - Orphaned foreign keys 확인

5. **데이터 무결성 확인**
   - NULL 값 비율 확인

### 결과 해석

- ✅ 모든 검증 통과: 마이그레이션 성공
- ⚠️ 일부 이슈 발견: 발견된 이슈를 확인하고 수정

## 데이터베이스 최적화

마이그레이션 후 데이터베이스 성능을 최적화합니다.

### 실행 방법

```bash
# Dry-run
npx tsx scripts/optimize-new-project.ts

# 최적화 가이드 확인
npx tsx scripts/optimize-new-project.ts --execute
```

### 최적화 작업

1. **VACUUM ANALYZE**
   - 디스크 공간 정리
   - 통계 정보 업데이트

2. **테이블별 ANALYZE**
   - 각 테이블의 통계 정보 업데이트

3. **인덱스 재구성**
   - 사용되지 않는 인덱스 확인 및 삭제

4. **통계 정보 업데이트**
   - 쿼리 플래너를 위한 통계 정보 갱신

### SQL 스크립트 실행

스크립트 실행 시 `supabase-optimization.sql` 파일이 생성됩니다. 이 파일을 Supabase SQL Editor에서 실행하세요:

1. Supabase 대시보드 → SQL Editor
2. 생성된 SQL 파일 내용 복사
3. 실행

## 트러블슈팅

### 일반적인 문제

#### 1. 환경변수 오류

**증상**: `환경변수가 설정되지 않았습니다` 오류

**해결**:
- `.env.local` 파일이 존재하는지 확인
- 환경변수 이름이 정확한지 확인
- 스크립트 실행 전에 `dotenv`가 로드되는지 확인

#### 2. 권한 오류

**증상**: `permission denied` 또는 `unauthorized` 오류

**해결**:
- Service Role Key가 올바른지 확인
- Supabase 프로젝트 설정에서 API 키 확인
- RLS 정책이 Service Role을 허용하는지 확인

#### 3. 타임아웃 오류

**증상**: 대용량 데이터 마이그레이션 시 타임아웃

**해결**:
- 배치 크기를 줄여서 재시도 (`--batch-size=50`)
- pg_dump 방법 사용 고려
- 네트워크 연결 확인

#### 4. 중복 키 오류

**증상**: `duplicate key value violates unique constraint`

**해결**:
- 타겟 프로젝트의 기존 데이터 확인
- `upsert` 옵션 사용 (이미 구현됨)
- 필요시 타겟 프로젝트 초기화

#### 5. Storage 파일 누락

**증상**: 일부 Storage 파일이 마이그레이션되지 않음

**해결**:
- `--include-orphaned` 플래그로 모든 파일 마이그레이션
- 에러 로그 확인
- 수동으로 누락된 파일 마이그레이션

### 데이터 불일치 해결

#### 레코드 수 불일치

1. 소스와 타겟의 레코드 수 비교
2. 누락된 레코드 식별
3. 해당 레코드만 재마이그레이션

#### Storage 파일 불일치

1. DB에 참조가 있는 파일 목록 확인
2. Storage에 실제로 존재하는 파일 확인
3. 불일치 파일 식별 및 처리

### 롤백 방법

마이그레이션 실패 시 롤백:

1. **데이터베이스 롤백**
   - 백업 파일로 복구
   ```bash
   psql "$NEW_SUPABASE_DB_URL" -f backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Storage 롤백**
   - 타겟 프로젝트의 Storage 파일 삭제
   - 필요시 소스에서 재마이그레이션

3. **환경변수 롤백**
   - `.env.local` 파일을 이전 버전으로 복구
   - Vercel 환경변수도 이전 값으로 복구

## 체크리스트

마이그레이션 전 체크리스트:

- [ ] 기존 프로젝트 백업 생성
- [ ] 환경변수 설정 완료
- [ ] 데이터 품질 분석 완료
- [ ] 데이터 정리 완료 (선택적)
- [ ] 데이터베이스 마이그레이션 완료
- [ ] Storage 파일 마이그레이션 완료
- [ ] 환경변수 업데이트 완료
- [ ] 마이그레이션 검증 완료
- [ ] 데이터베이스 최적화 완료
- [ ] 애플리케이션 테스트 완료

## 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL VACUUM 문서](https://www.postgresql.org/docs/current/sql-vacuum.html)
- [Supabase Storage 가이드](https://supabase.com/docs/guides/storage)

## 지원

문제가 발생하면:
1. 이 가이드의 트러블슈팅 섹션 확인
2. 스크립트의 에러 로그 확인
3. Supabase 대시보드의 로그 확인
4. 필요시 개발팀에 문의

