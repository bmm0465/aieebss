# 🎤 PSF 오디오 파일 생성 가이드

PSF 테스트에 사용할 오디오 파일을 로컬에서 생성하는 방법입니다.

## 📋 사전 준비사항

1. **tsx 설치** (TypeScript 실행 도구)
   ```bash
   npm install -D tsx
   ```

2. **환경 변수 설정**
   `.env.local` 파일에 OpenAI API 키가 설정되어 있어야 합니다:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

## 🚀 생성 방법

### 1단계: tsx 설치
```bash
npm install -D tsx
```

### 2단계: 스크립트 실행
```bash
npx tsx scripts/generate-psf-audio.ts
```

## 📊 실행 결과

스크립트가 성공적으로 실행되면:

```
🎤 PSF 오디오 파일 생성 시작...
총 110개 단어
⏳ "go" 생성 중...
✅ "go" 완료
⏳ "on" 생성 중...
✅ "on" 완료
...
📊 생성 완료:
✅ 성공: 110개
❌ 실패: 0개
📁 저장 위치: public/audio/psf
💾 총 용량: X.XX MB
📝 인덱스 파일 생성: public/audio/psf/index.json

🎉 모든 오디오 파일 생성 완료!
```

생성된 파일:
- `public/audio/psf/go.mp3`
- `public/audio/psf/on.mp3`
- ... (총 110개)
- `public/audio/psf/index.json` (파일 목록)

## 📦 Git에 커밋

생성된 오디오 파일을 Git에 커밋하면 Vercel 배포 시 자동으로 포함됩니다:

```bash
git add public/audio/psf/
git commit -m "Add PSF audio files for performance optimization"
git push
```

## ⏱️ 예상 소요 시간

- 약 110개 단어 × 0.2초 (딜레이) ≈ **22초**
- 네트워크 상태에 따라 다소 차이 있음

## 💰 비용 예상

OpenAI TTS-1 모델 사용 시:
- 110개 단어 생성
- 예상 비용: 약 **$0.01 ~ $0.05** (매우 저렴)

> 참고: Open AI TTS-1 가격: $15/1M characters

## ⚠️ 주의사항

1. **API 레이트 리밋**: 스크립트는 200ms 딜레이를 두어 API 레이트 리밋을 방지합니다
2. **인터넷 연결**: OpenAI API 호출을 위해 안정적인 인터넷 연결이 필요합니다
3. **파일 크기**: 총 약 1~2MB (110개 파일 기준)
4. **이미 존재하는 파일**: 같은 파일이 있으면 덮어씌워집니다

## 🔧 문제 해결

### 에러: OPENAI_API_KEY가 설정되지 않았습니다

**해결**: `.env.local` 파일에 API 키를 추가하세요:
```bash
echo "OPENAI_API_KEY=sk-..." >> .env.local
```

### 에러: Cannot find module 'dotenv'

**해결**: dotenv 패키지가 설치되어 있는지 확인:
```bash
npm list dotenv
# 없으면
npm install
```

### 에러: Cannot find module 'tsx'

**해결**: tsx를 설치하세요:
```bash
npm install -D tsx
```

### 생성 중 일부 파일 실패

**원인**: 네트워크 오류 또는 API 레이트 리밋

**해결**: 
1. 스크립트를 다시 실행 (이미 생성된 파일은 건너뜀)
2. 딜레이를 늘림 (200ms → 500ms)

## ✅ 확인 방법

생성된 파일들을 확인:

```bash
# 파일 개수 확인
ls -1 public/audio/psf/*.mp3 | wc -l
# 110개여야 함

# 총 용량 확인
du -sh public/audio/psf/
```

## 🎯 다음 단계

오디오 파일을 생성한 후:

1. ✅ Git에 커밋
2. ✅ Vercel에 푸시
3. ✅ 배포 확인
4. ✅ PSF 테스트 실행하여 오디오 파일이 사용되는지 확인

## 📝 참고

- 오디오 파일이 없어도 시스템이 정상 작동합니다 (TTS API 사용)
- 오디오 파일이 있으면 훨씬 빠르게 로딩됩니다
- 오디오 파일이 있으면 OpenAI API 비용이 절감됩니다

