# 🤖 자동 배포 워크플로우 가이드

현재 수동으로 진행하던 배포 프로세스를 자동화하는 방법입니다.

## 📋 현재 워크플로우

1. Cursor에서 vibe coding
2. Git 커밋 및 푸시
3. Vercel 배포 상태 확인
4. 에러 발생 시 Build Logs 복사
5. Cursor에 에러 로그 입력하여 수정
6. 반복

## 🚀 자동화 솔루션

### 방법 1: 스크립트 기반 자동화 (즉시 사용 가능)

#### 1.1 자동 커밋 및 푸시 스크립트

```bash
# 커밋 메시지와 함께 실행
npx tsx scripts/auto-deploy.ts "수정 내용 설명"
```

이 스크립트는:
- ✅ 변경사항 자동 감지
- ✅ Git add, commit, push 자동 실행
- ✅ 배포 상태 확인 안내

#### 1.2 배포 모니터링 스크립트

```bash
# 배포 URL 또는 ID로 모니터링
npx tsx scripts/monitor-deployment.ts https://aieebss-abc123.vercel.app
```

### 방법 2: MCP를 활용한 완전 자동화 (추천)

#### 2.1 Vercel MCP 설정

1. **Vercel API 토큰 생성**
   - Vercel Dashboard → Settings → Tokens
   - 새 토큰 생성 및 복사

2. **MCP 서버 설정**
   - Cursor 설정에서 MCP 서버 추가
   - Vercel MCP 서버 설정에 토큰 입력

#### 2.2 자동화 워크플로우

MCP가 설정되면 Cursor에서 직접:

```
"Vercel에 배포하고 상태를 확인해줘"
"최근 배포의 빌드 로그를 확인하고 에러가 있으면 수정해줘"
```

이렇게 요청하면 자동으로:
1. 배포 상태 확인
2. 빌드 로그 분석
3. 에러 감지 및 수정
4. 재배포

### 방법 3: Git Hooks 활용

#### 3.1 post-push hook 설정

`.git/hooks/post-push` 파일 생성:

```bash
#!/bin/bash
# Git 푸시 후 자동으로 배포 상태 확인

echo "🚀 배포 시작..."
echo "💡 Vercel 대시보드에서 배포 상태를 확인하세요"
echo "💡 에러 발생 시: npx tsx scripts/monitor-deployment.ts [deployment-id]"
```

### 방법 4: Cursor Composer 활용 (가장 강력)

Cursor의 Composer 기능을 사용하면:

1. **자동 계획 수립**
   ```
   "이 변경사항을 배포하고 에러가 있으면 수정해줘"
   ```

2. **자동 실행**
   - Git 커밋/푸시
   - 배포 상태 모니터링
   - 에러 감지 및 수정
   - 재배포

3. **자동 피드백 루프**
   - 에러 발생 시 자동으로 수정 시도
   - 성공할 때까지 반복

## 🎯 추천 워크플로우

### 단계별 설정

#### Step 1: 기본 스크립트 사용 (즉시)

```bash
# package.json에 스크립트 추가
npm run deploy "커밋 메시지"
```

#### Step 2: MCP 설정 (완전 자동화)

1. Vercel API 토큰 생성
2. Cursor MCP 설정
3. 자동화 명령어 사용

#### Step 3: Cursor Composer 활용 (최고 수준)

```
"이 코드를 배포하고, 에러가 있으면 자동으로 수정해줘"
```

## 📝 package.json 스크립트 추가

```json
{
  "scripts": {
    "deploy": "tsx scripts/auto-deploy.ts",
    "monitor": "tsx scripts/monitor-deployment.ts"
  }
}
```

사용법:
```bash
npm run deploy "수정 내용"
npm run monitor [deployment-id]
```

## 🔧 고급: 완전 자동화 스크립트

MCP를 활용한 완전 자동화를 원한다면:

1. **Vercel MCP 서버 설정**
2. **자동화 스크립트 개선** (MCP 호출 추가)
3. **에러 자동 수정 로직** 추가

## 💡 팁

1. **에러 패턴 학습**: 자주 발생하는 에러는 자동으로 수정 가능
2. **테스트 자동화**: 배포 전 로컬 빌드 테스트
3. **단계별 배포**: Preview → Production 순서로 배포

## 🚨 주의사항

- 자동 커밋은 신중하게 사용하세요
- 중요한 변경사항은 수동으로 검토하세요
- MCP 토큰은 안전하게 보관하세요

