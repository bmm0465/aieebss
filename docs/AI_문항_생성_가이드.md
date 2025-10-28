# 🤖 AI 문항 생성기 사용 가이드

## 📋 개요

LLM(Large Language Model)을 활용하여 DIBELS 8th Edition의 6가지 평가 유형에 맞는 문항을 자동으로 생성하고 PDF로 다운로드할 수 있는 기능입니다.

---

## ✨ 주요 기능

### 1. 다중 평가 유형 생성
- **LNF** (Letter Naming Fluency): 알파벳 인식 - 200개
- **PSF** (Phoneme Segmentation Fluency): 음소 분리 - 100개  
- **NWF** (Nonsense Word Fluency): 파닉스 적용 - 150개
- **WRF** (Word Recognition Fluency): Sight Words - 85개
- **ORF** (Oral Reading Fluency): 읽기 유창성 지문 - 150단어
- **MAZE**: 독해력 및 문맥 이해 - 20문항

### 2. 학년별 맞춤 생성
- 초등 1학년 ~ 6학년까지 선택 가능
- LLM이 학년 수준에 맞는 난이도로 문항 생성

### 3. 참고 문서 기반 생성
- 특정 주제나 어휘 목록을 입력하여 맞춤형 문항 생성
- 교육과정이나 교재 내용을 참고하여 생성 가능

### 4. PDF 다운로드
- 생성된 문항을 깔끔한 PDF 형식으로 다운로드
- 인쇄하여 오프라인 평가에 활용 가능

---

## 🚀 사용 방법

### 1. 페이지 접근
1. 교사 대시보드에 로그인
2. **🤖 AI 문항 생성기** 버튼 클릭
3. `/teacher/generate-items` 페이지로 이동

### 2. 문항 생성 설정

#### 2-1. 학년 수준 선택
```
초등 1학년 ~ 6학년 중 선택
```
- 선택한 학년에 맞는 어휘와 난이도로 문항 생성

#### 2-2. 평가 유형 선택 (다중 선택 가능)
```
✓ LNF - 알파벳 인식 (200개)
✓ PSF - 음소 분리 (100개)
✓ NWF - 파닉스 적용 (150개)
  WRF - Sight Words (85개)
  ORF - 읽기 유창성 지문 (150단어)
  MAZE - 독해력 평가 (20문항)
```
- 필요한 평가 유형만 선택하여 생성 가능
- 모든 유형을 한 번에 생성하거나 개별 생성 가능

#### 2-3. 참고 문서 입력 (선택사항)
```
예시 1: "동물 관련 단어를 중심으로 생성해주세요"
예시 2: "교과서 3단원 어휘: apple, banana, orange, grape..."
예시 3: "가족, 친구, 학교를 주제로 한 지문 생성"
```
- LLM이 입력한 내용을 참고하여 문항 생성
- 비워두면 일반적인 DIBELS 기준으로 생성

### 3. 문항 생성
1. **✨ 문항 생성하기** 버튼 클릭
2. 약 10-30초 대기 (선택한 평가 유형 수에 따라 다름)
3. 생성 완료 후 미리보기 표시

### 4. PDF 다운로드
1. **📥 PDF로 다운로드** 버튼 클릭
2. 새 창에서 인쇄 대화상자 자동 열림
3. PDF로 저장하거나 직접 인쇄

---

## 🔧 환경 설정

### OpenAI API 키 설정 (필수)

#### 🌐 Vercel 배포 환경 (실제 운영 서버)

**Vercel을 통해 배포하는 경우 (권장):**

1. Vercel 프로젝트 설정으로 이동
2. **Settings** → **Environment Variables** 클릭
3. 새 환경 변수 추가:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: `sk-proj-xxxxxxxxxxxxx`
   - **Environments**: Production, Preview, Development 모두 체크
4. **Save** 클릭
5. 프로젝트 재배포 (자동으로 적용됨)

> ✅ **Vercel 환경 변수를 설정했다면 `.env.local` 파일은 필요 없습니다!**  
> 배포된 웹사이트에서 자동으로 Vercel의 환경 변수를 사용합니다.

#### 💻 로컬 개발 환경 (개발/테스트용)

**로컬에서 테스트하려면:**

1. 프로젝트 루트에 `.env.local` 파일 생성
2. 다음 내용 추가:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

3. 개발 서버 재시작:
```bash
npm run dev
```

#### 🔑 OpenAI API 키 발급 방법

1. https://platform.openai.com/api-keys 접속
2. 로그인 후 "Create new secret key" 클릭
3. 생성된 키를 복사
4. Vercel 환경 변수 또는 `.env.local`에 붙여넣기

---

### 📌 환경 변수 설정 요약

| 환경 | 설정 위치 | 파일 필요 여부 |
|------|----------|--------------|
| **Vercel 배포** | Vercel Dashboard → Settings → Environment Variables | `.env.local` ❌ 불필요 |
| **로컬 개발** | 프로젝트 루트의 `.env.local` 파일 | `.env.local` ✅ 필요 |

> 💡 **팁**: 실제 운영은 Vercel 환경 변수로 관리하고, 로컬 개발할 때만 `.env.local`을 사용하세요.

---

## 💡 활용 예시

### 예시 1: 특정 주제 중심 평가
```
학년: 초등 3학년
평가 유형: PSF, WRF, ORF
참고 문서: "스포츠 관련 어휘: soccer, basketball, baseball, swimming..."
```
→ 스포츠 주제로 통일된 문항 생성

### 예시 2: 교과서 연계 평가
```
학년: 초등 4학년
평가 유형: 모두 선택
참고 문서: "교과서 5단원 - 음식과 건강
주요 어휘: healthy, vegetable, fruit, breakfast, dinner..."
```
→ 교과서 단원과 연계된 평가 문항 생성

### 예시 3: 기본 평가
```
학년: 초등 2학년
평가 유형: LNF, PSF, NWF
참고 문서: (비워둠)
```
→ DIBELS 표준 기준으로 문항 생성

---

## 📊 생성된 문항 예시

### LNF (Letter Naming Fluency)
```
t  n  f  y  I  R  D  G  Y  V
r  b  P  L  Z  i  c  A  O  J
p  T  x  K  a  v  M  U  Q  h
...
```
- 대소문자 무작위 배열
- 총 200개

### PSF (Phoneme Segmentation Fluency)
```
road  dad  six  frog  on  cry  sit
camp  farm  bell  plan  hand  gift
...
```
- CVC, CVCC, CCVC 패턴의 영어 단어
- 총 100개

### NWF (Nonsense Word Fluency)
```
sep  nem  dib  rop  lin  fom  mig
stam  clen  frap  smop  grut  ston
...
```
- 무의미 단어 (Nonsense words)
- 총 150개

### WRF (Word Recognition Fluency)
```
no  do  he  go  it  to  me  up  the  she
this  that  like  look  good  come  have
...
```
- 고빈도 Sight Words
- 총 85개

### ORF (Oral Reading Fluency)
```
Hello! How many dogs?
Hi! One, two, three, four. Four dogs!
Okay. Come in.

Do you have a ball?
Yes, I do. Here you are.
Thank you.
...
```
- 대화형 지문
- 약 150단어

### MAZE
```
문항 1: I like _____ and oranges.
  [apples ✓] [books] [dogs]

문항 2: I don't like bananas and _____.
  [jackets] [carrots ✓] [robots]
...
```
- 문맥에 맞는 단어 선택
- 총 20문항

---

## ⚠️ 주의사항

### 1. API 비용
- OpenAI API 사용 시 비용 발생
- GPT-4 모델 사용으로 인한 토큰 소비
- 대략 문항 1세트 생성 시 $0.10 ~ $0.30 예상

### 2. 생성 시간
- 선택한 평가 유형 수에 따라 10-30초 소요
- 참고 문서가 길수록 시간 증가

### 3. 생성 품질
- LLM 특성상 100% 완벽하지 않을 수 있음
- 생성 후 교사가 검토하고 필요시 수정 권장
- 특히 ORF와 MAZE는 문맥과 문법 확인 필요

### 4. 네트워크 연결
- 인터넷 연결 필수
- OpenAI API 서버 장애 시 사용 불가

---

## 🔍 문제 해결

### Q1. "문항 생성 중 오류가 발생했습니다" 에러
**원인:**
- OpenAI API 키가 설정되지 않음
- API 키가 유효하지 않음
- OpenAI 크레딧 부족

**해결:**
1. `.env.local` 파일에서 `OPENAI_API_KEY` 확인
2. API 키가 올바른지 확인
3. OpenAI 계정의 크레딧 잔액 확인

### Q2. 생성이 너무 오래 걸립니다
**원인:**
- 모든 평가 유형을 선택함
- 참고 문서가 너무 김

**해결:**
1. 필요한 평가 유형만 선택
2. 참고 문서를 간결하게 작성
3. 여러 번 나누어 생성

### Q3. PDF 다운로드가 안 됩니다
**원인:**
- 팝업 차단
- 브라우저 호환성 문제

**해결:**
1. 브라우저의 팝업 차단 해제
2. Chrome, Edge, Firefox 사용 권장
3. 인쇄 미리보기에서 직접 저장

---

## 🎯 교육적 활용 팁

### 1. 주제별 문항 세트 생성
```
봄 학기: 봄, 식물, 날씨 관련 문항
여름 학기: 여름, 휴가, 바다 관련 문항
가을 학기: 가을, 과일, 수확 관련 문항
겨울 학기: 겨울, 눈, 크리스마스 관련 문항
```

### 2. 개인 맞춤 평가
```
특정 학생이 어려워하는 알파벳/단어를 참고 문서에 입력
→ 약점 보완을 위한 맞춤형 문항 생성
```

### 3. 다양한 버전 생성
```
같은 설정으로 여러 번 생성하여 여러 버전의 평가지 준비
→ 재평가나 유사 평가에 활용
```

---

## 📈 향후 계획

- [ ] 문항 템플릿 저장 기능
- [ ] 생성 이력 관리
- [ ] 문항 직접 수정 기능
- [ ] 더 많은 AI 모델 지원
- [ ] 한글 문항 생성 지원

---

## 💬 피드백

문항 생성 기능에 대한 의견이나 개선 사항이 있다면 언제든지 공유해주세요!

---

**AI로 더 효율적인 평가 준비를! 🚀✨**

