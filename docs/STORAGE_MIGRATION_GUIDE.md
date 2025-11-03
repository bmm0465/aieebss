# Supabase Storage 마이그레이션 가이드

## 📋 개요

기존 Supabase Storage 구조를 새로운 구조로 마이그레이션하는 방법입니다.

### 기존 구조
```
student-recordings/
├── lnf/{userId}/{timestamp}.webm
├── psf/{userId}/{timestamp}.webm
├── nwf/{userId}/{timestamp}.webm
├── wrf/{userId}/{timestamp}.webm
└── orf/{userId}/{timestamp}.webm
```

### 새로운 구조
```
student-recordings/
├── {studentName}/
│   ├── {sessionDate}/
│   │   ├── lnf/{timestamp}.webm
│   │   ├── psf/{timestamp}.webm
│   │   ├── nwf/{timestamp}.webm
│   │   ├── wrf/{timestamp}.webm
│   │   └── orf/{timestamp}.webm
│   └── ...
└── ...
```

## 🚀 마이그레이션 실행 방법

### 1단계: 사전 준비

#### 환경 변수 확인
`.env.local` 파일에 다음 변수들이 설정되어 있어야 합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # 필수!
```

> ⚠️ **중요**: 마이그레이션 스크립트는 서비스 역할 키가 필요합니다. Supabase Dashboard → Settings → API → `service_role` 키를 확인하세요.

#### tsx 설치 (필요한 경우)
```bash
npm install -D tsx
```

### 2단계: Dry-run 실행 (미리보기)

실제로 파일을 이동하기 전에 어떤 파일들이 마이그레이션될지 미리 확인합니다:

```bash
npm run migrate-storage
```

또는 직접 실행:

```bash
npx tsx scripts/migrate-storage.ts
```

**출력 예시:**
```
🔄 Storage 마이그레이션 시작...

모드: 👀 Dry-run 모드 (실제 이동 없음)

📂 기존 폴더 구조 스캔 중...

📁 LNF 폴더 처리 중...
  📊 발견된 사용자 폴더: 5개
📁 PSF 폴더 처리 중...
  📊 발견된 사용자 폴더: 3개
...

📊 마이그레이션 대상 파일: 127개

📋 마이그레이션 계획 샘플 (처음 5개):
  1. lnf/user-id-1/1760537301791.webm
     → 김민제/2025-01-15/lnf/1760537301791.webm (김민제, 2025-01-15)
  2. lnf/user-id-1/1760537303325.webm
     → 김민제/2025-01-15/lnf/1760537303325.webm (김민제, 2025-01-15)
  ...

👀 Dry-run 모드: 실제 마이그레이션을 실행하려면 --execute 플래그를 사용하세요.
   예: npm run migrate-storage -- --execute
```

### 3단계: 실제 마이그레이션 실행

Dry-run 결과를 확인한 후, 실제 마이그레이션을 실행합니다:

```bash
npm run migrate-storage -- --execute
```

또는:

```bash
npx tsx scripts/migrate-storage.ts --execute
```

**실행 과정:**
1. 기존 파일들을 새 경로로 복사
2. `test_results` 테이블의 `audio_url` 필드 업데이트
3. 기존 파일 삭제
4. 진행 상황 및 결과 리포트 출력

**출력 예시:**
```
🚀 마이그레이션 실행 중...

[1/127] ✅ 완료: lnf/user-id-1/1760537301791.webm → 김민제/2025-01-15/lnf/1760537301791.webm
[2/127] ✅ 완료: lnf/user-id-1/1760537303325.webm → 김민제/2025-01-15/lnf/1760537303325.webm
...

📊 진행 상황: 10/127 (성공: 10, 실패: 0, 건너뜀: 0)

...

📊 마이그레이션 완료:
   ✅ 성공: 125개
   ⏭️  건너뜀: 2개
   ❌ 실패: 0개

🔄 test_results 테이블의 audio_url 업데이트 중...

📊 DB 업데이트 완료:
   ✅ 성공: 125개
   ❌ 실패: 0개

✨ 마이그레이션 작업 완료!
```

## 📊 마이그레이션 결과 확인

### Supabase Dashboard에서 확인

1. **Supabase Dashboard** → **Storage** → **student-recordings** 버킷
2. 학생 이름 폴더가 생성되었는지 확인
3. 각 학생 폴더 내에 날짜별 폴더가 생성되었는지 확인
4. 각 날짜 폴더 내에 테스트 유형 폴더(lnf, psf, nwf, wrf, orf)가 있는지 확인

### 데이터베이스에서 확인

```sql
-- audio_url이 새로운 형식으로 업데이트되었는지 확인
SELECT DISTINCT audio_url 
FROM test_results 
WHERE audio_url IS NOT NULL 
LIMIT 10;
```

새로운 형식: `{studentName}/{sessionDate}/{testType}/{timestamp}.webm`

## ⚠️ 주의사항

### 1. 백업 필수
마이그레이션 전에 Supabase Storage를 백업하세요:
- Supabase Dashboard → Storage → Export 기능 사용
- 또는 수동으로 중요 파일들 다운로드

### 2. 서비스 역할 키 보안
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 공개하지 마세요
- `.env.local` 파일은 `.gitignore`에 포함되어 있어야 합니다
- GitHub 등에 커밋하지 마세요

### 3. 마이그레이션 중 사용 제한
- 마이그레이션 실행 중에는 애플리케이션 사용을 중지하는 것을 권장합니다
- 또는 마이그레이션을 비업무 시간에 실행하세요

### 4. 대용량 파일
- 파일이 매우 많으면 마이그레이션에 시간이 걸릴 수 있습니다
- 진행 상황을 모니터링하세요

### 5. 에러 처리
- 마이그레이션 중 에러가 발생하면 스크립트가 에러 목록을 출력합니다
- 실패한 파일들은 수동으로 확인하고 다시 마이그레이션할 수 있습니다

## 🔄 롤백 방법

마이그레이션 후 문제가 발생하면:

1. **Supabase Dashboard**에서 Storage 내용 확인
2. 필요 시 Supabase 지원팀에 문의하여 백업에서 복원 요청

> ⚠️ **주의**: 기존 파일은 마이그레이션 후 삭제되므로, 백업이 필수입니다.

## ❓ 문제 해결

### 문제: "Service role key not found"
**해결**: `.env.local` 파일에 `SUPABASE_SERVICE_ROLE_KEY`를 추가하세요.

### 문제: "Permission denied"
**해결**: 서비스 역할 키가 올바른지 확인하고, Supabase Storage 버킷의 정책을 확인하세요.

### 문제: 일부 파일만 마이그레이션됨
**해결**: 
- 에러 로그를 확인하세요
- 실패한 파일들을 수동으로 다시 시도할 수 있습니다
- 파일 경로나 권한 문제일 수 있습니다

### 문제: test_results 테이블 업데이트 실패
**해결**:
- 데이터베이스 권한을 확인하세요
- 수동으로 SQL을 실행하여 업데이트할 수 있습니다:
```sql
UPDATE test_results 
SET audio_url = '{new_path}' 
WHERE audio_url = '{old_path}';
```

## 📝 체크리스트

마이그레이션 전:
- [ ] `.env.local`에 모든 필요한 환경 변수 설정
- [ ] Supabase Storage 백업 완료
- [ ] Dry-run 실행하여 결과 확인
- [ ] 마이그레이션 실행 시간 결정 (비업무 시간 권장)

마이그레이션 후:
- [ ] Supabase Dashboard에서 새 구조 확인
- [ ] 몇 개의 파일을 랜덤 샘플링하여 접근 가능한지 확인
- [ ] 애플리케이션에서 음성 파일 재생 테스트
- [ ] `test_results` 테이블의 `audio_url` 값 확인

## 🎯 다음 단계

마이그레이션이 완료되면:
1. 애플리케이션에서 새로운 평가를 진행하여 새 구조로 파일이 저장되는지 확인
2. 기존 평가 결과에서 음성 파일이 정상적으로 재생되는지 확인
3. 교사 대시보드에서 학생별로 파일이 잘 정리되어 있는지 확인

