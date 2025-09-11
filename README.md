# AIEEBSS - AI 기반 영어 읽기 평가 시스템

DIBELS 기반의 AI 영어 읽기 평가 시스템으로, 음성 인식과 AI 채점을 통해 학생들의 읽기 능력을 종합적으로 평가합니다.

## 🎯 주요 기능

- **6가지 DIBELS 테스트**: LNF, PSF, NWF, WRF, ORF, MAZE
- **AI 음성 인식**: OpenAI Whisper를 활용한 정확한 음성 전사
- **AI 자동 채점**: GPT-4o-mini를 활용한 지능형 채점
- **EFL 환경 최적화**: 한국어 발음 및 혼합 응답 지원
- **세션별 결과 관리**: 평가 세션별 독립적인 결과 추적
- **실시간 음성 녹음**: WebRTC 기반 고품질 음성 캡처

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, Supabase
- **AI**: OpenAI (Whisper, GPT-4o-mini)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth

## 🚀 시작하기

### 1. 환경 설정

```bash
# 저장소 클론
git clone [repository-url]
cd aieebss

# 의존성 설치
npm install
```

### 2. 환경 변수 설정

`env.example` 파일을 참고하여 `.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI 설정
OPENAI_API_KEY=your_openai_api_key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📋 배포 전 체크리스트

### 환경 변수 확인
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 설정
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정
- [ ] `OPENAI_API_KEY` 설정

### Supabase 설정
- [ ] 데이터베이스 테이블 생성 (`test_results`)
- [ ] 스토리지 버킷 생성 (`student-recordings`)
- [ ] RLS (Row Level Security) 정책 설정
- [ ] 사용자 인증 설정

### 기능 테스트
- [ ] 로그인/로그아웃 기능
- [ ] 모든 테스트 페이지 (LNF, PSF, NWF, WRF, ORF, MAZE)
- [ ] 음성 녹음 및 업로드
- [ ] AI 음성 인식 및 채점
- [ ] 결과 페이지 및 세션 관리

## 🌐 Vercel 배포

### 1. GitHub 저장소 연결
Vercel 대시보드에서 GitHub 저장소를 연결하세요.

### 2. 환경 변수 설정
Vercel 프로젝트 설정에서 환경 변수를 설정하세요.

### 3. 배포 실행
자동 배포가 시작됩니다.

## 📊 프로젝트 구조

```
src/
├── app/
│   ├── api/                 # API 라우트
│   │   ├── submit-*/        # 테스트 제출 API
│   │   └── tts/            # TTS API
│   ├── test/               # 테스트 페이지
│   │   ├── lnf/
│   │   ├── psf/
│   │   ├── nwf/
│   │   ├── wrf/
│   │   ├── orf/
│   │   └── maze/
│   ├── results/            # 결과 페이지
│   │   └── sessions/       # 세션별 결과
│   ├── lobby/              # 로비 페이지
│   └── page.tsx            # 로그인 페이지
├── components/             # 재사용 컴포넌트
├── lib/                    # 유틸리티 함수
│   └── supabase/          # Supabase 클라이언트
└── middleware.ts          # 인증 미들웨어
```

## 🔧 주요 설정 파일

- `next.config.ts`: Next.js 설정
- `vercel.json`: Vercel 배포 설정
- `tsconfig.json`: TypeScript 설정
- `package.json`: 프로젝트 의존성

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
