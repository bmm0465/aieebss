# 📚 AIEEBSS 프로젝트 전체 문서

**최종 업데이트**: 2025년 10월  
**버전**: 1.1.0  
**작성자**: AIEEBSS 개발팀

---

## 📑 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [데이터베이스 구조](#데이터베이스-구조)
6. [주요 기능 상세](#주요-기능-상세)
7. [사용자 가이드](#사용자-가이드)
8. [배포 및 운영](#배포-및-운영)
9. [보안 및 개인정보 보호](#보안-및-개인정보-보호)
10. [향후 계획](#향후-계획)

---

## 프로젝트 개요

### 🎯 프로젝트 소개

**AIEEBSS (AI for Elementary English Basic Skills Support)**는 AI 기반 영어 읽기 평가 시스템으로, 음성 인식과 인공지능을 활용하여 학생들의 영어 읽기 능력을 자동으로 평가하고 분석하는 웹 애플리케이션입니다.

### 💡 해결하고자 하는 문제

#### 기존 영어 읽기 평가의 문제점

- ❌ **시간 소모**: 교사가 일일이 학생의 발음을 듣고 평가해야 함 (학생당 15-20분 소요)
- ❌ **일관성 부족**: 교사의 주관적 판단에 따라 평가 결과가 달라질 수 있음
- ❌ **진도 추적 어려움**: 엑셀 수기 입력, 분석 시간 소요
- ❌ **EFL 환경 미최적화**: 기존 도구는 원어민 발음 기준으로 설계됨

#### AIEEBSS의 해결 방법

- ✅ **AI 음성 인식**: OpenAI Whisper로 학생의 읽기를 자동 전사 (95% 이상 정확도)
- ✅ **GPT-4 자동 채점**: 즉각적이고 일관된 평가 제공
- ✅ **교사 대시보드**: 모든 학생의 진도를 한눈에 파악
- ✅ **EFL 환경 최적화**: 한국 학생 발음 특성을 반영한 평가

### 📊 프로젝트 현황

- **개발 시작**: 2025년 10월
- **최신 버전**: v1.1.0 (2025-10-14)
- **배포 플랫폼**: Vercel
- **데이터베이스**: Supabase (PostgreSQL)
- **지원 테스트**: 6가지 DIBELS 테스트

---

## 주요 기능

### 1️⃣ 6가지 DIBELS 읽기 평가 테스트

DIBELS 8th Edition 기반의 6가지 읽기 평가를 제공합니다:

| 테스트 | 전체 이름 | 평가 내용 | 제한 시간 |
|--------|----------|----------|----------|
| **LNF** | Letter Naming Fluency | 알파벳 이름 인식 속도 | 1분 |
| **PSF** | Phoneme Segmentation Fluency | 음소 분리 능력 | 1분 |
| **NWF** | Nonsense Word Fluency | 무의미 단어 읽기 (파닉스) | 1분 |
| **WRF** | Word Reading Fluency | 단어 읽기 유창성 | 1분 |
| **ORF** | Oral Reading Fluency | 문장 읽기 유창성 | 1분 |
| **MAZE** | Passage Reading | 지문 이해력 | 3분 |

### 2️⃣ AI 기반 자동 평가 시스템

#### 음성 인식 (OpenAI gpt-4o-transcribe)
- **기술**: OpenAI gpt-4o-transcribe API
- **정확도**: 95% 이상
- **지원 언어**: 영어 (한국어 발음 혼합 지원)
- **처리 시간**: 평균 10-15초

#### 자동 채점 (GPT-4o)
- **모델**: GPT-4o
- **기능**: 
  - 문항별 정답/오답 판정
  - 정확도 계산
  - 상세 피드백 생성
  - 종합 평가 코멘트 작성
- **처리 시간**: 평균 20-30초

### 3️⃣ 교사 관리 대시보드 (v1.1.0)

#### 대시보드 메인 (`/teacher/dashboard`)
- **통계 요약**:
  - 총 학생 수
  - 반 개수
  - 완료된 테스트 수
  - 평균 정확도
- **반별 학생 목록**: 반별로 그룹화된 학생 카드
- **학생 정보**: 이름, 반, 번호, 완료율, 평균 정확도

#### 학생 상세 결과 페이지 (`/teacher/student/[studentId]`)
- **학생 기본 정보**: 이름, 반, 번호, 학년
- **테스트별 통계**: 6가지 테스트별 시도 횟수, 평균 정확도
- **시각화 차트**:
  - 막대 차트: 테스트별 정확도 비교
  - 레이더 차트: 종합 역량 시각화
- **AI 평가 코멘트**: GPT-4가 생성한 종합 평가 및 개선 제안
- **세션별 상세 기록**: 날짜별로 그룹화된 평가 이력

### 4️⃣ AI 문항 생성 기능 (신규)

LLM을 활용한 평가 문항 자동 생성 기능:

- **다중 평가 유형 생성**: 6가지 테스트 유형 모두 지원
- **학년별 맞춤 생성**: 초등 1-6학년 선택 가능
- **참고 문서 기반 생성**: 특정 주제나 어휘 목록 입력 가능
- **PDF 다운로드**: 생성된 문항을 PDF로 다운로드하여 인쇄 가능

#### 생성 가능한 문항 수
- LNF: 200개 (알파벳)
- PSF: 100개 (단어)
- NWF: 150개 (무의미 단어)
- WRF: 85개 (Sight Words)
- ORF: 150단어 (읽기 유창성 지문)
- MAZE: 20문항 (독해력 평가)

### 5️⃣ 세션별 결과 관리

- **세션 추적**: 각 테스트 세션을 독립적으로 관리
- **날짜별 그룹화**: 평가 날짜별로 결과 확인
- **상세 결과 조회**: 문항별 정답/오답 상세 분석
- **이력 관리**: 학생의 학습 진행 상황 추적

### 6️⃣ 실시간 음성 녹음

- **WebRTC 기반**: 고품질 음성 캡처
- **타이머 표시**: 제한 시간 내 테스트 진행
- **자동 업로드**: 테스트 완료 시 자동으로 Supabase Storage에 저장

---

## 기술 스택

### Frontend

- **Next.js 15**: 최신 React 프레임워크, Server Components 활용
- **React 19**: 최신 UI 라이브러리
- **TypeScript**: 타입 안정성 보장
- **Tailwind CSS 4**: 모던 UI 디자인

### Backend & Database

- **Next.js API Routes**: 서버리스 API 엔드포인트
- **Supabase**: 
  - PostgreSQL 데이터베이스
  - Authentication (사용자 인증)
  - Storage (음성 파일 저장)
  - Row Level Security (RLS)

### AI & ML

- **OpenAI Whisper API**: 음성 인식
- **GPT-4o-mini**: 
  - 자동 채점
  - 피드백 생성
  - 평가 코멘트 작성
  - 문항 생성 (신규)

### 배포 및 인프라

- **Vercel**: 서버리스 배포 플랫폼
- **CDN**: 글로벌 콘텐츠 전송
- **자동 스케일링**: 트래픽 증가 시 자동 확장

---

## 시스템 아키텍처

### 전체 아키텍처 다이어그램

```
[학생/교사 브라우저]
        ↓
[Next.js App (Vercel)]
        ↓
    ┌───┴───┬──────────┬─────────────┐
    ↓       ↓          ↓             ↓
[Supabase] [OpenAI]  [Supabase]   [Supabase]
[Database] [API]     [Auth]        [Storage]
    ↓       ↓          ↓             ↓
[결과 저장] [AI 채점] [인증 관리]   [음성 파일]
```

### 데이터 흐름

#### 1. 테스트 제출 프로세스

```
1. 학생이 테스트 완료
   ↓
2. 음성 파일을 Supabase Storage에 업로드
   ↓
3. Next.js API Route 호출
   ↓
4. OpenAI Whisper API로 음성 전사
   ↓
5. GPT-4o-mini로 채점 및 피드백 생성
   ↓
6. 결과를 Supabase Database에 저장
   ↓
7. 학생에게 결과 반환
```

#### 2. 교사 대시보드 데이터 조회

```
1. 교사가 대시보드 접근
   ↓
2. Supabase에서 담당 학생 목록 조회 (RLS 적용)
   ↓
3. 각 학생의 test_results 집계
   ↓
4. 통계 및 차트 데이터 생성
   ↓
5. 화면에 표시
```

#### 3. AI 문항 생성 프로세스

```
1. 교사가 문항 생성 요청
   ↓
2. 학년, 평가 유형, 참고 문서 전달
   ↓
3. GPT-4o-mini API 호출
   ↓
4. 문항 생성 및 반환
   ↓
5. PDF 생성 및 다운로드
```

---

## 데이터베이스 구조

### 주요 테이블

#### 1. `test_results`
테스트 결과 저장 테이블

```sql
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  test_type TEXT NOT NULL, -- 'lnf', 'psf', 'nwf', 'wrf', 'orf', 'maze'
  session_id UUID NOT NULL,
  question TEXT,
  correct_answer TEXT,
  user_answer TEXT,
  is_correct BOOLEAN,
  accuracy DECIMAL(5,2),
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `user_profiles`
사용자 프로필 및 역할 관리

```sql
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student', -- 'student' or 'teacher'
  class_name TEXT, -- 학생의 경우 반 이름
  student_number TEXT, -- 학생 번호
  grade_level TEXT, -- 학년
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. `teacher_student_assignments`
교사-학생 관계 매핑

```sql
CREATE TABLE teacher_student_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  class_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);
```

### Row Level Security (RLS) 정책

#### 학생 권한
- 자신의 `test_results`만 조회 가능
- 자신의 `user_profiles`만 조회/수정 가능

#### 교사 권한
- 담당 학생의 `test_results` 조회 가능
- 담당 학생의 `user_profiles` 조회 가능
- 자신의 `teacher_student_assignments` 조회 가능

---

## 주요 기능 상세

### 📝 각 테스트별 상세 설명

#### 1. LNF (Letter Naming Fluency)
**목적**: 알파벳 이름 인식 속도 평가

- **형식**: 화면에 알파벳 대소문자 무작위 배치
- **제한 시간**: 1분
- **평가 방법**: 1분 동안 읽은 알파벳 수와 정확도 측정
- **학생 평가**: 음성으로 알파벳 이름 말하기

#### 2. PSF (Phoneme Segmentation Fluency)
**목적**: 음소 분리 능력 평가

- **형식**: 단어를 제시하고 각 음소를 분리하여 읽기
- **제한 시간**: 1분
- **예시**: "cat" → /c/ /a/ /t/
- **평가 방법**: 정확히 분리한 음소 수 측정

#### 3. NWF (Nonsense Word Fluency)
**목적**: 파닉스 규칙 적용 능력 평가

- **형식**: 무의미 단어를 읽고 발음
- **제한 시간**: 1분
- **예시**: "sep", "dib", "rop" 등
- **평가 방법**: 파닉스 규칙을 적용하여 읽은 단어 수 측정

#### 4. WRF (Word Reading Fluency)
**목적**: 단어 읽기 유창성 평가

- **형식**: Sight Words (고빈도 단어) 읽기
- **제한 시간**: 1분
- **평가 방법**: 1분 동안 정확하게 읽은 단어 수 측정

#### 5. ORF (Oral Reading Fluency)
**목적**: 문장 읽기 유창성 평가

- **형식**: 짧은 지문 읽기
- **제한 시간**: 1분
- **평가 방법**: 
  - 읽은 단어 수 (WPM: Words Per Minute)
  - 정확도
  - 오류 분석

#### 6. MAZE (Passage Reading)
**목적**: 독해력 및 문맥 이해 평가

- **형식**: 지문에서 빈칸에 들어갈 적절한 단어 선택
- **제한 시간**: 3분
- **평가 방법**: 정확하게 선택한 답안 수 측정

### 🎨 UI/UX 특징

#### 마법학교 테마
- 친근하고 재미있는 UI로 학생들의 참여 유도
- 밝고 활기찬 색상 팔레트
- 직관적인 네비게이션

#### 반응형 디자인
- 모바일, 태블릿, 데스크톱 모두 지원
- 터치 및 마우스 입력 모두 최적화

#### 접근성
- 명확한 버튼 레이블
- 시각적 피드백 제공
- 키보드 네비게이션 지원

---

## 사용자 가이드

### 👦 학생 사용 가이드

#### 1. 로그인
- Supabase Auth를 통한 이메일/비밀번호 로그인
- 회원가입 시 자동으로 `user_profiles`에 'student' 역할 할당

#### 2. 로비 화면
- 6가지 테스트 버튼 표시
- 결과 확인 버튼
- 로그아웃 버튼

#### 3. 테스트 진행
1. 원하는 테스트 선택
2. 테스트 설명 화면 확인
3. "시작하기" 버튼 클릭
4. 음성 녹음 진행 (제한 시간 내)
5. "제출" 버튼 클릭

#### 4. 결과 확인
- 즉시 정확도 및 피드백 표시
- AI 생성 코멘트 확인
- 세션별 이력 확인 가능

### 👨‍🏫 교사 사용 가이드

#### 1. 교사 계정 설정
자세한 설정 방법은 `docs/TEACHER_SETUP_GUIDE.md`를 참조하세요.

**간단 요약**:
1. Supabase에서 교사 계정 생성
2. `user_profiles`에 role을 'teacher'로 설정
3. 학생 프로필 생성
4. `teacher_student_assignments`에 교사-학생 매핑 설정

#### 2. 대시보드 접근
- 로비에서 "🎓 교사 관리 대시보드" 버튼 클릭
- 담당 학생 목록 및 통계 확인

#### 3. 학생 상세 분석
- 학생 카드 클릭
- 테스트별 통계 확인
- 차트로 시각적 분석
- AI 평가 코멘트 참고
- 세션별 상세 기록 확인

#### 4. AI 문항 생성
1. "🤖 AI 문항 생성기" 버튼 클릭
2. 학년 선택
3. 평가 유형 선택 (다중 선택 가능)
4. 참고 문서 입력 (선택사항)
5. "문항 생성하기" 클릭
6. PDF 다운로드

---

## 배포 및 운영

### 🚀 Vercel 배포

#### 배포 전 체크리스트
자세한 내용은 `docs/DEPLOYMENT_CHECKLIST.md`를 참조하세요.

**필수 환경 변수**:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

**Supabase 설정**:
- ✅ `test_results` 테이블 생성
- ✅ `user_profiles` 테이블 생성
- ✅ `teacher_student_assignments` 테이블 생성
- ✅ RLS 정책 설정
- ✅ `student-recordings` 스토리지 버킷 생성

#### 배포 프로세스
1. GitHub 저장소에 코드 푸시
2. Vercel에서 프로젝트 연결
3. 환경 변수 설정
4. 자동 배포 완료

### 💰 비용 구조

#### OpenAI API 비용
- **테스트 1회당**: 약 50-100원
- **학생 100명 × 월 4회**: 약 2만원
- **AI 문항 생성 1회**: 약 $0.10 ~ $0.30

#### Supabase 비용
- **무료 플랜**: 월 50,000 MAU까지
- **Pro 플랜**: 월 $25 (약 3만원)

#### 총 비용 (학생 100명 기준)
- **월 약 5만원**
- **vs. 기존 외부 평가 도구**: 월 약 25만원 (80% 절감)

---

## 보안 및 개인정보 보호

### 🔒 보안 조치

#### 1. 인증 및 권한 관리
- **Supabase Auth**: 안전한 사용자 인증
- **Row Level Security (RLS)**: 데이터 접근 권한 관리
- **역할 기반 접근**: 교사는 담당 학생만, 학생은 본인만 조회

#### 2. 데이터 암호화
- **HTTPS**: 모든 통신 암호화
- **데이터베이스**: PostgreSQL 기본 암호화
- **스토리지**: Supabase Storage 암호화

#### 3. 개인정보 보호
- **최소 수집 원칙**: 필요한 정보만 수집
- **GDPR 준수 가능**: 데이터 삭제 요청 지원 가능
- **접근 로그**: 관리자만 접근 가능

---

## 향후 계획

### 단기 계획 (2025 Q4)
- [ ] 모바일 앱 개발 (React Native)
- [ ] 오프라인 모드 지원
- [ ] 학생 성적 추이 그래프 (시계열)

### 중기 계획 (2026 Q1-Q2)
- [ ] 학부모 포털 추가
- [ ] 학습 게이미피케이션
- [ ] 추가 언어 지원 (일본어, 중국어)
- [ ] CSV/Excel 내보내기

### 장기 계획 (2026 Q3 이후)
- [ ] AI 튜터링 기능
- [ ] 다른 과목으로 확장 (수학, 과학)
- [ ] 글로벌 교육 플랫폼으로 성장
- [ ] 머신러닝 기반 개인 맞춤 학습 경로

---

## 📚 관련 문서

### 필수 문서
- **README.md**: 전체 프로젝트 개요 및 설치 가이드
- **docs/TEACHER_SETUP_GUIDE.md**: 교사 기능 상세 설정 가이드
- **docs/DEPLOYMENT_CHECKLIST.md**: 배포 전 체크리스트

### 기능별 가이드
- **docs/AI_문항_생성_가이드.md**: AI 문항 생성 기능 사용법
- **docs/DEMO_GUIDE.md**: 데모 시연 가이드
- **docs/PRESENTATION_SLIDES.md**: 발표용 슬라이드 내용

### 테스트별 가이드
- **docs/LNF_문항_고정_및_분석_가이드.md**
- **docs/PSF_문항_고정_및_분석_가이드.md**
- **docs/NWF_문항_고정_및_분석_가이드.md**
- **docs/WRF_문항_고정_및_분석_가이드.md**
- **docs/ORF_문항_고정_및_분석_가이드.md**
- **docs/MAZE_문항_고정_및_분석_가이드.md**

### 변경 이력
- **docs/CHANGELOG.md**: 버전별 변경 내역

---

## 🤝 기여 및 문의

이 프로젝트에 관심이 있으신가요?

- 🐛 **버그 제보**: GitHub Issues
- 💡 **기능 제안**: GitHub Discussions
- 📖 **문서 개선**: Pull Request 환영

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

<div align="center">

**🌟 AIEEBSS - AI로 더 나은 교육을 만들어갑니다 🌟**

Made with ❤️ for Teachers and Students

**최종 업데이트**: 2025년 10월

</div>

