# 마이그레이션 전 스키마 설정 가이드

데이터 마이그레이션을 실행하기 전에 타겟 프로젝트(AIEEBSS)에 필요한 테이블들을 먼저 생성해야 합니다.

## 🚨 중요

**데이터 마이그레이션을 실행하기 전에 반드시 이 단계를 먼저 완료하세요!**

## 방법 1: Supabase Dashboard 사용 (권장)

### 1단계: Supabase Dashboard 접속
1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. **AIEEBSS** 프로젝트 선택

### 2단계: SQL Editor 열기
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

### 3단계: 마이그레이션 파일 실행

다음 순서로 마이그레이션 파일들을 실행하세요:

#### 1. 기본 테이블 생성
`supabase/migrations/20250101000001_create_base_tables.sql` 파일의 내용을 복사하여 실행

이 파일은 다음 테이블을 생성합니다:
- `test_results`
- `user_profiles`
- `teacher_student_assignments`

#### 2. Agent 시스템 테이블 생성
`supabase/migrations/20250101000000_add_agent_system_tables.sql` 파일의 내용을 복사하여 실행

이 파일은 다음 테이블을 생성합니다:
- `curriculum_pdfs`
- `curriculum_pdf_chunks`
- `generated_test_items`
- `item_approval_workflow`

#### 3. Transcription 결과 컬럼 추가 (이미 포함되어 있을 수 있음)
`supabase/migrations/20250125000000_add_transcription_results.sql` 파일의 내용을 복사하여 실행

**참고**: `20250101000001_create_base_tables.sql` 파일에 이미 `transcription_results` 컬럼이 포함되어 있으므로, 이 단계는 선택사항입니다.

### 4단계: 실행 확인
각 마이그레이션 실행 후, 다음 쿼리로 테이블이 생성되었는지 확인하세요:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'test_results',
    'user_profiles',
    'teacher_student_assignments',
    'curriculum_pdfs',
    'curriculum_pdf_chunks',
    'generated_test_items',
    'item_approval_workflow'
  )
ORDER BY table_name;
```

모든 테이블이 나열되어야 합니다.

## 방법 2: Supabase CLI 사용 (선택사항)

Supabase CLI가 설치되어 있다면:

```bash
# Supabase 프로젝트 연결
supabase link --project-ref [AIEEBSS_PROJECT_ID]

# 마이그레이션 적용
supabase db push
```

## ✅ 확인 체크리스트

마이그레이션 전에 다음을 확인하세요:

- [ ] `test_results` 테이블 생성됨
- [ ] `user_profiles` 테이블 생성됨
- [ ] `teacher_student_assignments` 테이블 생성됨
- [ ] `curriculum_pdfs` 테이블 생성됨
- [ ] `curriculum_pdf_chunks` 테이블 생성됨
- [ ] `generated_test_items` 테이블 생성됨
- [ ] `item_approval_workflow` 테이블 생성됨
- [ ] 모든 테이블에 RLS 정책이 설정됨
- [ ] 인덱스가 생성됨

## 🚀 다음 단계

스키마 설정이 완료되면 데이터 마이그레이션을 실행할 수 있습니다:

```bash
# Dry-run 먼저 실행
npm run migrate-database

# 실제 마이그레이션 실행
npx tsx scripts/migrate-database.ts --execute
```

## 🐛 문제 해결

### 오류: "relation already exists"
- 테이블이 이미 존재하는 경우입니다. `CREATE TABLE IF NOT EXISTS`를 사용했으므로 무시해도 됩니다.

### 오류: "permission denied"
- Service Role Key를 사용하여 실행해야 합니다. Supabase Dashboard의 SQL Editor는 자동으로 Service Role 권한을 사용합니다.

### 오류: "column already exists"
- 일부 컬럼이 이미 존재하는 경우입니다. `IF NOT EXISTS` 또는 `ADD COLUMN IF NOT EXISTS`를 사용했으므로 무시해도 됩니다.

