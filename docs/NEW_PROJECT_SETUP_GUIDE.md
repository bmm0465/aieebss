# 새 프로젝트(AIEEBSS) 설정 가이드

AIDTPEL 프로젝트의 데이터를 마이그레이션하지 않고, 새로운 AIEEBSS 프로젝트를 시작하면서 Auth 사용자만 가져오는 방법입니다.

## 📋 개요

이 가이드는 다음을 설명합니다:
- ✅ Auth 사용자(이메일, 메타데이터)만 마이그레이션
- ❌ 데이터베이스 데이터는 마이그레이션하지 않음
- 🆕 새 프로젝트에서 처음부터 시작

## 🚀 단계별 설정

### 1단계: AIEEBSS 프로젝트 생성 및 스키마 설정

#### 1.1 Supabase 프로젝트 생성
1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 새 프로젝트 생성 (AIEEBSS)
3. 프로젝트 URL과 API 키 확인

#### 1.2 데이터베이스 스키마 생성
Supabase SQL Editor에서 다음 마이그레이션 파일들을 순서대로 실행:

1. `supabase/migrations/20250101000001_create_base_tables.sql`
   - `test_results`, `user_profiles`, `teacher_student_assignments` 테이블 생성

2. `supabase/migrations/20250101000000_add_agent_system_tables.sql`
   - `curriculum_pdfs`, `curriculum_pdf_chunks`, `generated_test_items`, `item_approval_workflow` 테이블 생성

### 2단계: 환경변수 설정

`.env.local` 파일을 업데이트하세요:

```env
# 새 프로젝트 (AIEEBSS) - 애플리케이션에서 사용
NEXT_PUBLIC_SUPABASE_URL=https://[AIEEBSS_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[AIEEBSS_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[AIEEBSS_SERVICE_ROLE_KEY]

# 기존 프로젝트 (AIDTPEL) - Auth 마이그레이션에만 필요
OLD_SUPABASE_URL=https://[AIDTPEL_PROJECT_ID].supabase.co
OLD_SUPABASE_SERVICE_ROLE_KEY=[AIDTPEL_SERVICE_ROLE_KEY]

# 기타 설정 (변경 불필요)
OPENAI_API_KEY=your_openai_api_key
```

**중요**: 
- `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 **AIEEBSS 프로젝트** 값으로 설정
- `OLD_SUPABASE_URL`과 `OLD_SUPABASE_SERVICE_ROLE_KEY`는 Auth 마이그레이션에만 사용

### 3단계: Auth 사용자 마이그레이션

#### 3.1 Dry-run 실행
```bash
npm run migrate-auth-only
```

마이그레이션될 사용자 목록을 확인합니다.

#### 3.2 실제 마이그레이션 실행
```bash
npx tsx scripts/migrate-auth-users-only.ts --execute
```

#### 3.3 비밀번호 재설정 링크 생성 (선택사항)
```bash
npx tsx scripts/migrate-auth-users-only.ts --execute --send-reset
```

### 4단계: 비밀번호 재설정 안내

마이그레이션된 사용자는 비밀번호 재설정이 필요합니다:

1. **Supabase Dashboard에서 발송** (권장)
   - Authentication > Users로 이동
   - 각 사용자 선택
   - "Send password reset email" 클릭

2. **사용자가 직접 재설정**
   - 로그인 페이지에서 "비밀번호 찾기" 사용

### 5단계: 코드 수정 사항

**좋은 소식**: 애플리케이션 코드는 수정할 필요가 없습니다! 

코드는 이미 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수를 사용하므로, `.env.local` 파일만 업데이트하면 됩니다.

#### 확인할 파일들 (수정 불필요)
- ✅ `src/lib/supabase/client.ts` - 이미 `NEXT_PUBLIC_SUPABASE_URL` 사용
- ✅ `src/lib/supabase/server.ts` - 이미 `NEXT_PUBLIC_SUPABASE_URL` 사용
- ✅ `src/lib/supabase/middleware.ts` - 이미 `NEXT_PUBLIC_SUPABASE_URL` 사용
- ✅ 모든 API 라우트 - 이미 환경변수 사용

### 6단계: 애플리케이션 테스트

#### 6.1 개발 서버 실행
```bash
npm run dev
```

#### 6.2 테스트 항목
- [ ] 로그인 페이지 접근 가능
- [ ] 마이그레이션된 사용자로 로그인 시도 (비밀번호 재설정 필요)
- [ ] 새 사용자 회원가입 가능
- [ ] 테스트 결과 저장 기능 작동
- [ ] 교사 대시보드 접근 가능

## 📊 마이그레이션 후 작업

### 1. user_profiles 테이블에 프로필 생성

Auth 사용자는 마이그레이션되었지만, `user_profiles` 테이블에는 프로필이 없을 수 있습니다.

#### 방법 A: 사용자가 직접 생성
- 사용자가 처음 로그인할 때 프로필 생성 페이지로 이동
- 또는 애플리케이션에서 자동 생성

#### 방법 B: 수동으로 생성
```sql
-- 예시: 특정 사용자의 프로필 생성
INSERT INTO user_profiles (id, full_name, role)
VALUES (
  'user-uuid-here',
  '사용자 이름',
  'student'
);
```

### 2. 교사-학생 관계 설정

교사가 있다면 `teacher_student_assignments` 테이블에 관계를 설정해야 합니다:

```sql
-- 예시: 교사-학생 관계 설정
INSERT INTO teacher_student_assignments (teacher_id, student_id, class_name)
VALUES (
  'teacher-uuid',
  'student-uuid',
  '1학년 1반'
);
```

## ⚠️ 주의사항

### 1. 데이터는 마이그레이션되지 않음
- `test_results` 테이블은 비어있음
- `user_profiles` 테이블은 비어있음 (수동 생성 필요)
- `teacher_student_assignments` 테이블은 비어있음 (수동 설정 필요)

### 2. Storage 파일
- Storage 파일도 마이그레이션되지 않음
- 필요시 별도로 마이그레이션: `npm run migrate-storage`

### 3. 환경변수 관리
- `.env.local`은 Git에 커밋하지 마세요 (`.gitignore`에 포함되어야 함)
- Vercel 배포 시 환경변수를 별도로 설정해야 합니다

## 🔄 나중에 데이터도 마이그레이션하고 싶다면

만약 나중에 AIDTPEL의 데이터도 가져오고 싶다면:

```bash
# 전체 데이터 마이그레이션 (Auth는 이미 있으므로 중복 생성되지 않음)
npm run migrate-database
```

## 📝 체크리스트

새 프로젝트 설정 완료 체크리스트:

- [ ] AIEEBSS Supabase 프로젝트 생성
- [ ] 데이터베이스 스키마 생성 (마이그레이션 파일 실행)
- [ ] `.env.local` 파일 업데이트 (AIEEBSS 프로젝트 정보)
- [ ] Auth 사용자 마이그레이션 완료
- [ ] 사용자에게 비밀번호 재설정 안내
- [ ] 개발 서버 실행 및 테스트
- [ ] 새 사용자 회원가입 테스트
- [ ] 테스트 결과 저장 기능 테스트
- [ ] Vercel 배포 시 환경변수 설정 (배포하는 경우)

## 🐛 문제 해결

### 환경변수 관련
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 환경변수 이름이 정확한지 확인 (대소문자 구분)
- 개발 서버 재시작 (`npm run dev`)

### Auth 관련
- Supabase Dashboard에서 사용자가 생성되었는지 확인
- 비밀번호 재설정 링크가 발송되었는지 확인
- 이메일 스팸 폴더 확인

### 데이터베이스 관련
- 테이블이 생성되었는지 확인 (SQL Editor에서 `\dt` 또는 테이블 목록 확인)
- RLS 정책이 올바르게 설정되었는지 확인

## 📚 관련 문서

- [Auth 사용자만 마이그레이션 가이드](./AUTH_ONLY_MIGRATION_GUIDE.md)
- [스키마 설정 가이드](./SETUP_SCHEMA_BEFORE_MIGRATION.md)
- [Vercel 환경변수 설정](./../VERCEL_ENV_VARS.md)

