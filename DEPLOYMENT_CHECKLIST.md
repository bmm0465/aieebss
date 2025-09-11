# 🚀 Vercel 배포 전 체크리스트

## ✅ 코드 수정 완료 항목

### 1. 빌드 설정
- [x] `package.json`에서 `build` 스크립트에서 `--turbopack` 제거
- [x] `next.config.ts` 최적화 설정 추가
- [x] `vercel.json` 배포 설정 파일 생성
- [x] 사용하지 않는 `@deepgram/sdk` 의존성 제거

### 2. 환경 변수 설정
- [x] `env.example` 파일 생성 (환경 변수 가이드)
- [x] `.gitignore`에서 환경 변수 파일 제외 확인

### 3. 문서화
- [x] `README.md` 완전히 업데이트
- [x] 프로젝트 구조 및 설정 가이드 추가

## 🔧 Vercel 배포 전 설정 필요 항목

### 1. 환경 변수 설정 (Vercel 대시보드에서)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### 2. Supabase 설정 확인
- [ ] `test_results` 테이블 생성 및 RLS 정책 설정
- [ ] `student-recordings` 스토리지 버킷 생성 및 정책 설정
- [ ] 사용자 인증 설정 확인

### 3. GitHub 저장소 준비
- [ ] 모든 변경사항 커밋 및 푸시
- [ ] 메인 브랜치가 최신 상태인지 확인

## 🧪 배포 전 테스트

### 1. 로컬 빌드 테스트
```bash
cd aieebss
npm install
npm run build
npm run start
```

### 2. 기능 테스트
- [ ] 로그인/로그아웃
- [ ] 모든 테스트 페이지 접근
- [ ] 음성 녹음 기능
- [ ] API 호출 (TTS, 음성 인식, 채점)
- [ ] 결과 페이지 및 세션 관리

### 3. 성능 테스트
- [ ] 페이지 로딩 속도
- [ ] API 응답 시간
- [ ] 음성 파일 업로드 속도

## 🚨 주의사항

### 1. API 사용량
- OpenAI API 호출량 모니터링 필요
- 음성 파일 스토리지 사용량 확인

### 2. 보안
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 사용
- 클라이언트에 민감한 정보 노출 방지

### 3. 성능
- 음성 처리 시간으로 인한 응답 지연 가능성
- 대용량 음성 파일 처리 시 타임아웃 주의

## 📋 배포 후 확인사항

### 1. 기본 기능
- [ ] 사이트 접근 가능
- [ ] 로그인/회원가입 작동
- [ ] 모든 페이지 정상 로딩

### 2. 테스트 기능
- [ ] 각 테스트 페이지 접근
- [ ] 음성 녹음 및 업로드
- [ ] AI 음성 인식 결과
- [ ] AI 채점 결과

### 3. 결과 관리
- [ ] 테스트 결과 저장
- [ ] 세션별 결과 조회
- [ ] 결과 리포트 표시

## 🔄 롤백 계획

문제 발생 시:
1. Vercel 대시보드에서 이전 배포로 롤백
2. 환경 변수 재확인
3. Supabase 설정 재확인
4. 로컬에서 재테스트 후 재배포
