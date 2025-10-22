# Supabase Storage 설정 가이드

## 🎯 문제 해결: 음성 파일 접근 권한

### 현재 문제
- `createSignedUrl`이 RLS 정책으로 인해 실패
- 이전 평가의 음성 파일에 접근할 수 없음

### 해결 방법

## 1. Supabase Dashboard에서 Storage 설정

### 1.1 Storage 버킷 확인
1. **Supabase Dashboard** → **Storage** → **student-recordings** 버킷
2. **Settings** 탭에서 다음 설정 확인:
   - ✅ **Public bucket**: 체크되어 있어야 함
   - ✅ **File size limit**: 충분히 큰 값 (예: 50MB)
   - ✅ **Allowed MIME types**: `audio/webm` 포함

### 1.2 RLS 정책 설정
**Authentication** → **Policies** → **student-recordings** 테이블에서:

#### 기존 정책 삭제 (있다면)
```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
```

#### 새로운 정책 추가
```sql
-- 1. 모든 사용자가 읽기 가능 (Public)
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'student-recordings');

-- 2. 인증된 사용자가 업로드 가능
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'student-recordings' 
  AND auth.role() = 'authenticated'
);

-- 3. 인증된 사용자가 업데이트 가능
CREATE POLICY "Allow authenticated users to update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'student-recordings' 
  AND auth.role() = 'authenticated'
);
```

## 2. 환경 변수 확인

`.env.local` 파일에 다음이 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. 테스트 방법

### 3.1 진단 도구 사용
1. **교사 대시보드** → **🎵 음성 파일 진단** 클릭
2. **🔍 음성 파일 진단 실행** 버튼 클릭
3. 결과 확인:
   - ✅ **정상 파일**: 재생 가능
   - ❌ **누락 파일**: 파일이 실제로 없음
   - ⚠️ **오류 파일**: 권한 문제

### 3.2 수동 테스트
브라우저에서 다음 URL 직접 접근:
```
https://your-project.supabase.co/storage/v1/object/public/student-recordings/경로/파일명.webm
```

## 4. 문제 해결 체크리스트

### ✅ Storage 버킷 설정
- [ ] `student-recordings` 버킷이 존재
- [ ] 버킷이 Public으로 설정됨
- [ ] 파일 크기 제한이 충분함 (50MB+)
- [ ] MIME 타입에 `audio/webm` 포함

### ✅ RLS 정책 설정
- [ ] Public read 정책이 활성화됨
- [ ] 인증된 사용자 업로드 정책이 활성화됨
- [ ] 기존 제한적인 정책이 삭제됨

### ✅ 코드 설정
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 환경변수 설정
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수 설정
- [ ] AudioPlayer에서 Signed URL과 Public URL 모두 시도

## 5. 추가 디버깅

### 5.1 브라우저 콘솔 확인
```javascript
// 콘솔에서 직접 테스트
const supabase = createClient();
const { data, error } = await supabase.storage
  .from('student-recordings')
  .createSignedUrl('경로/파일명.webm', 3600);
console.log('Signed URL:', data?.signedUrl, 'Error:', error);
```

### 5.2 네트워크 탭 확인
- 개발자 도구 → Network 탭
- 400/403 에러가 발생하는지 확인
- CORS 문제가 있는지 확인

## 6. 최종 확인

모든 설정이 완료되면:
1. **새로운 평가 진행** → 음성 파일이 정상 저장되는지 확인
2. **이전 평가 결과 확인** → 음성 파일이 재생되는지 확인
3. **진단 도구 실행** → 대부분의 파일이 "정상" 상태인지 확인

## 🚨 주의사항

- **보안**: Public 버킷은 모든 사용자가 접근 가능하므로 민감한 정보는 저장하지 마세요
- **비용**: Public 접근 시 대역폭 비용이 발생할 수 있습니다
- **백업**: 중요한 설정 변경 전에 정책을 백업하세요
