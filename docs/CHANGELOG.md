# 변경 로그 (Changelog)

## [1.1.0] - 2025-10-14

### 🆕 추가된 기능

#### 교사 관리 시스템
- **교사 대시보드** (`/teacher/dashboard`)
  - 담당 학생 목록 및 통계 요약
  - 반별 학생 그룹화
  - 학생별 성적 요약 (완료율, 평균 정확도)
  - 실시간 통계 계산 (총 학생 수, 반 수, 테스트 수, 평균 정확도)

- **학생 상세 결과 페이지** (`/teacher/student/[studentId]`)
  - 학생 기본 정보 표시 (이름, 반, 번호, 학년)
  - 6가지 테스트별 상세 통계 (LNF, PSF, NWF, WRF, ORF, MAZE)
  - 시각화 차트:
    - 막대 차트: 테스트별 정확도 비교
    - 레이더 차트: 종합 역량 시각화
  - AI 기반 종합 평가 코멘트 자동 생성
  - 평가 세션 기록 (날짜별 그룹화)

- **시각화 컴포넌트** (`StudentResultChart.tsx`)
  - SVG 기반 레이더 차트
  - 색상 코딩된 막대 그래프
  - 반응형 디자인

#### 데이터베이스 스키마
- `user_profiles` 테이블 추가
  - 사용자 역할 관리 (teacher/student)
  - 학생 정보 (반, 번호, 학년)
  
- `teacher_student_assignments` 테이블 추가
  - 교사-학생 관계 매핑
  - 반별 그룹화

#### 보안
- Row Level Security (RLS) 정책 구현
  - 교사는 담당 학생의 정보만 조회 가능
  - 학생은 자신의 정보만 조회 가능
- 페이지 접근 권한 검증

### 🔄 변경된 기능

#### 로비 페이지
- 교사 계정일 경우 "교사 관리 대시보드" 버튼 표시
- 교사 권한 확인 로직 추가

### 📝 문서

#### 새로운 문서
- `TEACHER_SETUP_GUIDE.md`: 교사 기능 설정 상세 가이드
- `QUICK_START_TEACHER.md`: 5분 안에 시작하는 빠른 가이드
- `CHANGELOG.md`: 변경 로그 (이 문서)

#### 업데이트된 문서
- `README.md`: 교사 기능 섹션 추가
- `DEPLOYMENT_CHECKLIST.md`: 교사 기능 관련 체크리스트 항목 추가

### 🏗️ 기술적 개선

- TypeScript 타입 안정성 강화
- 서버 컴포넌트 활용 (Next.js 15)
- Supabase Admin API 통합
- 성능 최적화:
  - 인덱스 추가
  - 쿼리 최적화
  - 클라이언트 사이드 렌더링 최소화

### 📦 파일 구조

```
새로 추가된 파일:
src/app/teacher/
  ├── dashboard/page.tsx          # 교사 대시보드
  └── student/[studentId]/page.tsx # 학생 상세 페이지

src/components/
  └── StudentResultChart.tsx      # 차트 컴포넌트

문서:
  ├── TEACHER_SETUP_GUIDE.md      # 설정 가이드
  ├── QUICK_START_TEACHER.md      # 빠른 시작
  └── CHANGELOG.md                # 이 파일
```

---

## [1.0.0] - 2025-10-01

### 초기 릴리스
- 6가지 DIBELS 테스트 구현 (LNF, PSF, NWF, WRF, ORF, MAZE)
- OpenAI 음성 인식 및 AI 채점
- 학생용 결과 페이지
- 세션별 결과 관리
- 마법학교 테마 UI

