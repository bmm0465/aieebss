# AIEEBSS - AI 기반 영어 읽기 평가 시스템

DIBELS 기반의 AI 영어 읽기 평가 시스템으로, 음성 인식과 AI 채점을 통해 학생들의 읽기 능력을 종합적으로 평가합니다.

## 🎯 주요 기능

- **6가지 DIBELS 테스트**: LNF, PSF, NWF, WRF, ORF, MAZE
- **AI 음성 인식**: OpenAI Whisper를 활용한 정확한 음성 전사
- **AI 자동 채점**: GPT-4o-mini를 활용한 지능형 채점
- **EFL 환경 최적화**: 한국어 발음 및 혼합 응답 지원
- **세션별 결과 관리**: 평가 세션별 독립적인 결과 추적
- **실시간 음성 녹음**: WebRTC 기반 고품질 음성 캡처
- **🆕 교사 관리 대시보드**: 담당 학생들의 평가 결과 종합 분석 및 시각화

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

### 3. Supabase 데이터베이스 설정

데이터베이스 테이블 및 RLS 정책을 설정하세요. 자세한 내용은 `TEACHER_SETUP_GUIDE.md`를 참조하세요.

**필수 테이블:**
- `test_results` (테스트 결과 저장)
- `user_profiles` (사용자 프로필 및 역할)
- `teacher_student_assignments` (교사-학생 관계)

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 👨‍🏫 교사 관리 기능

교사는 담당 학생들의 평가 결과를 종합적으로 확인하고 분석할 수 있습니다.

### 주요 기능
- **대시보드**: 담당 학생 현황 및 통계 요약
- **반별 관리**: 학생을 반별로 그룹화하여 관리
- **개별 학생 분석**: 학생별 상세 평가 결과 및 시각화
- **차트 분석**: 막대 차트, 레이더 차트로 역량 시각화
- **자동 평가**: AI 기반 종합 평가 코멘트 생성

### 설정 방법
자세한 설정 방법은 `TEACHER_SETUP_GUIDE.md`를 참조하세요.

**간단 요약:**
1. Supabase에서 테이블 생성 (user_profiles, teacher_student_assignments)
2. 교사 계정 생성 및 role을 'teacher'로 설정
3. 학생 프로필 생성
4. 교사-학생 매핑 설정

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
│   │   ├── tts/            # TTS API
│   │   └── feedback/       # 피드백 API
│   ├── test/               # 테스트 페이지
│   │   ├── lnf/
│   │   ├── psf/
│   │   ├── nwf/
│   │   ├── wrf/
│   │   ├── orf/
│   │   └── maze/
│   ├── results/            # 결과 페이지
│   │   └── sessions/       # 세션별 결과
│   ├── teacher/            # 🆕 교사 관리 페이지
│   │   ├── dashboard/      # 교사 대시보드
│   │   └── student/        # 학생 상세 결과
│   ├── lobby/              # 로비 페이지
│   └── page.tsx            # 로그인 페이지
├── components/             # 재사용 컴포넌트
│   ├── ResultReport.tsx
│   ├── FeedbackSection.tsx
│   └── StudentResultChart.tsx  # 🆕 학생 결과 차트
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
