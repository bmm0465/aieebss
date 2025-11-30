# 데이터베이스 마이그레이션 가이드

AIDTPEL 프로젝트에서 AIEEBSS 프로젝트로 데이터를 마이그레이션하는 방법입니다.

## 📋 사전 준비사항

### 1. 환경변수 설정

`.env.local` 파일에 다음 환경변수를 추가하세요:

```env
# 기존 프로젝트 (AIDTPEL)
OLD_SUPABASE_URL=https://[AIDTPEL_PROJECT_ID].supabase.co
OLD_SUPABASE_SERVICE_ROLE_KEY=[AIDTPEL_SERVICE_ROLE_KEY]

# 새 프로젝트 (AIEEBSS)
NEXT_PUBLIC_SUPABASE_URL=https://[AIEEBSS_PROJECT_ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[AIEEBSS_SERVICE_ROLE_KEY]
```

### 2. Supabase 프로젝트 정보 확인

#### AIDTPEL 프로젝트 (소스)
1. Supabase Dashboard에서 AIDTPEL 프로젝트 선택
2. Settings > API 메뉴로 이동
3. Project URL과 Service Role Key 복사

#### AIEEBSS 프로젝트 (타겟)
1. Supabase Dashboard에서 AIEEBSS 프로젝트 선택
2. Settings > API 메뉴로 이동
3. Project URL과 Service Role Key 복사

### 3. 타겟 프로젝트 스키마 확인

AIEEBSS 프로젝트에 다음 테이블들이 생성되어 있어야 합니다:
- `user_profiles`
- `teacher_student_assignments`
- `curriculum_pdfs`
- `curriculum_pdf_chunks`
- `generated_test_items`
- `item_approval_workflow`
- `test_results`

스키마가 없다면 `supabase/migrations/` 폴더의 마이그레이션 파일을 실행하세요.

## 🚀 마이그레이션 실행 방법

### 1단계: Dry-run 실행 (필수)

실제 마이그레이션 전에 Dry-run을 실행하여 데이터를 미리 확인합니다:

```bash
npx tsx scripts/migrate-database.ts
```

또는:

```bash
npm run migrate-database
```

**예상 출력:**
- 각 테이블의 레코드 수
- 마이그레이션될 데이터 요약
- "Dry-run 모드" 메시지

### 2단계: 실제 마이그레이션 실행

Dry-run 결과를 확인한 후, 실제 마이그레이션을 실행합니다:

```bash
npx tsx scripts/migrate-database.ts --execute
```

또는:

```bash
npx tsx scripts/migrate-database.ts -e
```

### 3단계: 배치 크기 조정 (선택사항)

대용량 데이터의 경우 배치 크기를 조정할 수 있습니다 (기본값: 100):

```bash
npx tsx scripts/migrate-database.ts --execute --batch-size=50
```

## 📊 마이그레이션되는 데이터

### 테이블 순서 (외래키 의존성 고려)
1. `user_profiles` - 사용자 프로필
2. `teacher_student_assignments` - 교사-학생 관계
3. `curriculum_pdfs` - 교육과정 PDF 메타데이터
4. `curriculum_pdf_chunks` - PDF 텍스트 청크
5. `generated_test_items` - 생성된 문항
6. `item_approval_workflow` - 문항 승인 워크플로우
7. `test_results` - 테스트 결과

### Auth 사용자
- 모든 인증 사용자 계정이 마이그레이션됩니다
- **중요**: 비밀번호는 마이그레이션되지 않으므로, 각 사용자는 비밀번호 재설정이 필요합니다

## ⚠️ 주의사항

### 1. 비밀번호 재설정
- Auth 사용자는 비밀번호가 마이그레이션되지 않습니다
- Supabase Dashboard에서 각 사용자에게 비밀번호 재설정 링크를 발송하거나
- 수동으로 임시 비밀번호를 설정해야 합니다

### 2. 중복 데이터 처리
- `upsert`를 사용하여 중복 데이터를 자동으로 처리합니다
- 이미 존재하는 레코드는 업데이트됩니다

### 3. 외래키 제약조건
- 테이블 순서가 외래키 의존성을 고려하여 설계되었습니다
- 마이그레이션 중 외래키 오류가 발생하면 순서를 확인하세요

### 4. Storage 파일
- 이 스크립트는 데이터베이스 데이터만 마이그레이션합니다
- Storage 파일은 별도로 마이그레이션해야 합니다:
  ```bash
  npm run migrate-storage
  ```

## 🔍 마이그레이션 후 확인사항

### 1. 데이터 무결성 확인
각 테이블의 레코드 수를 비교하세요:

```sql
-- AIDTPEL 프로젝트에서
SELECT 
  'user_profiles' as table_name, COUNT(*) as count FROM user_profiles
UNION ALL
SELECT 'teacher_student_assignments', COUNT(*) FROM teacher_student_assignments
UNION ALL
SELECT 'curriculum_pdfs', COUNT(*) FROM curriculum_pdfs
-- ... (나머지 테이블들)

-- AIEEBSS 프로젝트에서도 동일한 쿼리 실행하여 비교
```

### 2. Auth 사용자 확인
```sql
-- AIEEBSS 프로젝트에서
SELECT COUNT(*) FROM auth.users;
```

### 3. 외래키 관계 확인
주요 외래키 관계가 올바르게 설정되었는지 확인:

```sql
-- 예: teacher_student_assignments의 외래키 확인
SELECT 
  tsa.id,
  tsa.teacher_id,
  tsa.student_id,
  CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = tsa.teacher_id) THEN 'OK' ELSE 'MISSING' END as teacher_exists,
  CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = tsa.student_id) THEN 'OK' ELSE 'MISSING' END as student_exists
FROM teacher_student_assignments tsa
LIMIT 10;
```

## 🐛 문제 해결

### 오류: "기존 프로젝트 환경변수가 설정되지 않았습니다"
- `.env.local` 파일에 `OLD_SUPABASE_URL`과 `OLD_SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인하세요

### 오류: "새 프로젝트 환경변수가 설정되지 않았습니다"
- `.env.local` 파일에 `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인하세요

### 오류: "데이터 조회 실패" 또는 "삽입 실패"
- RLS (Row Level Security) 정책이 Service Role Key로는 우회되어야 합니다
- Supabase Dashboard에서 Service Role Key가 올바른지 확인하세요
- 네트워크 연결을 확인하세요

### Auth 사용자 생성 실패
- 이미 존재하는 사용자는 자동으로 건너뜁니다
- 이메일 형식이 올바른지 확인하세요

## 📝 추가 리소스

- [Supabase Migration 문서](https://supabase.com/docs/guides/database/migrations)
- [Supabase Auth 관리자 API](https://supabase.com/docs/reference/javascript/auth-admin-api)

