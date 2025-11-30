# Auth 사용자만 마이그레이션 가이드

AIDTPEL 프로젝트의 Auth 사용자(이메일, 메타데이터)만 AIEEBSS 프로젝트로 마이그레이션하는 방법입니다.

## 📋 개요

이 가이드는 **데이터베이스 데이터는 마이그레이션하지 않고**, Auth 사용자 계정만 마이그레이션하는 방법을 설명합니다.

**중요**: 비밀번호는 보안상의 이유로 직접 마이그레이션할 수 없습니다. 사용자는 비밀번호 재설정이 필요합니다.

## 🚀 실행 방법

### 1단계: 환경변수 설정

`.env.local` 파일에 다음 환경변수를 추가하세요:

```env
# 기존 프로젝트 (AIDTPEL)
OLD_SUPABASE_URL=https://[AIDTPEL_PROJECT_ID].supabase.co
OLD_SUPABASE_SERVICE_ROLE_KEY=[AIDTPEL_SERVICE_ROLE_KEY]

# 새 프로젝트 (AIEEBSS)
NEXT_PUBLIC_SUPABASE_URL=https://[AIEEBSS_PROJECT_ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[AIEEBSS_SERVICE_ROLE_KEY]
```

### 2단계: Dry-run 실행 (필수)

실제 마이그레이션 전에 Dry-run을 실행하여 마이그레이션될 사용자를 확인합니다:

```bash
npm run migrate-auth-only
```

또는:

```bash
npx tsx scripts/migrate-auth-users-only.ts
```

**예상 출력:**
- 마이그레이션될 사용자 목록
- 각 사용자의 이메일, ID, 메타데이터 정보
- "Dry-run 모드" 메시지

### 3단계: 실제 마이그레이션 실행

Dry-run 결과를 확인한 후, 실제 마이그레이션을 실행합니다:

```bash
npx tsx scripts/migrate-auth-users-only.ts --execute
```

또는:

```bash
npx tsx scripts/migrate-auth-users-only.ts -e
```

### 4단계: 비밀번호 재설정 링크 생성 (선택사항)

마이그레이션과 함께 비밀번호 재설정 링크를 생성하려면:

```bash
npx tsx scripts/migrate-auth-users-only.ts --execute --send-reset
```

또는:

```bash
npx tsx scripts/migrate-auth-users-only.ts -e -r
```

**참고**: `--send-reset` 플래그는 비밀번호 재설정 링크를 생성하지만, 실제 이메일 발송은 Supabase Dashboard에서 수동으로 해야 합니다.

## 📊 마이그레이션되는 정보

### 마이그레이션되는 항목
- ✅ 이메일 주소
- ✅ 이메일 확인 상태
- ✅ 사용자 메타데이터 (`user_metadata`)
- ✅ 앱 메타데이터 (`app_metadata`)
- ✅ 생성일시

### 마이그레이션되지 않는 항목
- ❌ 비밀번호 (보안상의 이유로 불가능)
- ❌ 데이터베이스 테이블 데이터 (이 스크립트는 Auth만 처리)

## ⚠️ 중요 주의사항

### 1. 비밀번호 재설정

**비밀번호는 마이그레이션할 수 없습니다.** 다음 방법 중 하나를 사용하세요:

#### 방법 A: 비밀번호 재설정 링크 발송 (권장)
1. 마이그레이션 시 `--send-reset` 플래그 사용
2. Supabase Dashboard > Authentication > Users로 이동
3. 각 사용자에게 비밀번호 재설정 링크 발송

#### 방법 B: 임시 비밀번호 설정
1. Supabase Dashboard > Authentication > Users로 이동
2. 각 사용자 선택
3. "Send password reset email" 클릭
4. 또는 수동으로 임시 비밀번호 설정

#### 방법 C: 사용자가 직접 재설정
1. 로그인 페이지에서 "비밀번호 찾기" 사용
2. 이메일로 재설정 링크 수신

### 2. 중복 사용자 처리

이미 존재하는 사용자(동일한 이메일)는 자동으로 건너뜁니다.

### 3. 새 프로젝트에서 필요한 작업

Auth 사용자 마이그레이션 후 다음 작업이 필요할 수 있습니다:

1. **user_profiles 테이블에 프로필 생성**
   - 마이그레이션된 사용자에 대해 `user_profiles` 레코드 생성
   - 필요시 수동으로 또는 별도 스크립트로 생성

2. **사용자 안내**
   - 새 프로젝트 URL 안내
   - 비밀번호 재설정 필요 안내

## 🔍 마이그레이션 후 확인사항

### 1. 사용자 수 확인

```sql
-- AIEEBSS 프로젝트에서
SELECT COUNT(*) FROM auth.users;
```

### 2. 사용자 목록 확인

```sql
-- AIEEBSS 프로젝트에서
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;
```

### 3. user_profiles 확인

```sql
-- user_profiles 테이블에 프로필이 있는지 확인
SELECT 
  up.id,
  up.full_name,
  up.role,
  au.email
FROM user_profiles up
RIGHT JOIN auth.users au ON up.id = au.id
WHERE up.id IS NULL;  -- 프로필이 없는 사용자
```

## 🐛 문제 해결

### 오류: "기존 프로젝트 환경변수가 설정되지 않았습니다"
- `.env.local` 파일에 `OLD_SUPABASE_URL`과 `OLD_SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인하세요

### 오류: "새 프로젝트 환경변수가 설정되지 않았습니다"
- `.env.local` 파일에 `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인하세요

### 오류: "사용자 목록 조회 실패"
- Service Role Key가 올바른지 확인하세요
- 네트워크 연결을 확인하세요

### 사용자가 로그인할 수 없음
- 비밀번호 재설정이 필요합니다
- Supabase Dashboard에서 비밀번호 재설정 링크를 발송하세요

## 📝 다음 단계

Auth 사용자 마이그레이션 완료 후:

1. ✅ 사용자에게 비밀번호 재설정 안내
2. ✅ 필요시 `user_profiles` 테이블에 프로필 생성
3. ✅ 새 프로젝트에서 테스트 로그인
4. ✅ 필요시 Storage 파일 마이그레이션 (`npm run migrate-storage`)

## 🔄 전체 데이터 마이그레이션이 필요한 경우

만약 나중에 데이터베이스 데이터도 마이그레이션하고 싶다면:

```bash
# 전체 데이터 마이그레이션 (Auth + 테이블 데이터)
npm run migrate-database
```

**참고**: Auth 사용자는 이미 마이그레이션되어 있으므로, 중복 생성되지 않습니다.

