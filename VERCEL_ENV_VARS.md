# Vercel 환경변수 설정 가이드

이 프로젝트를 Vercel에 배포하기 위해 다음 환경변수들을 설정해야 합니다.

## 필수 환경변수 (Required)

### Supabase 설정
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### OpenAI 설정
```
OPENAI_API_KEY
```

## 선택적 환경변수 (Optional - Multi-API Transcription 기능용)

### Google Gemini 2.5 Pro
```
GOOGLE_AI_API_KEY
```

### AWS Transcribe
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```
기본값: `us-east-1` (AWS_REGION이 설정되지 않은 경우)

### Azure AI Speech
```
AZURE_SPEECH_KEY
AZURE_SPEECH_REGION
```
기본값: `eastus` (AZURE_SPEECH_REGION이 설정되지 않은 경우)

## Vercel에 환경변수 설정하는 방법

1. Vercel 대시보드에 로그인
2. 프로젝트 선택
3. Settings > Environment Variables 메뉴로 이동
4. 각 환경변수를 추가:
   - **Name**: 변수명 (예: `OPENAI_API_KEY`)
   - **Value**: 실제 값
   - **Environment**: Production, Preview, Development 중 선택 (또는 All)

## 환경변수별 설명

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key (클라이언트에서 접근 가능)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (서버 사이드 전용, 보안 중요)

### OpenAI
- `OPENAI_API_KEY`: OpenAI API 키 (gpt-4o-transcribe 및 gpt-4o 모델 사용)

### Google Gemini
- `GOOGLE_AI_API_KEY`: Google AI API 키 (Gemini 2.5 Pro 모델 사용)

### AWS
- `AWS_ACCESS_KEY_ID`: AWS 액세스 키 ID
- `AWS_SECRET_ACCESS_KEY`: AWS 시크릿 액세스 키
- `AWS_REGION`: AWS 리전 (예: `us-east-1`, `ap-northeast-2`)

### Azure
- `AZURE_SPEECH_KEY`: Azure Speech 서비스 키
- `AZURE_SPEECH_REGION`: Azure 리전 (예: `eastus`, `koreacentral`)

## 참고사항

- `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트 사이드에서도 접근 가능합니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 사용되며, 보안상 매우 중요합니다.
- Multi-API Transcription 기능을 사용하지 않는다면, Google, AWS, Azure 관련 환경변수는 설정하지 않아도 됩니다. (OpenAI만 사용)
- 환경변수를 설정하지 않은 API는 자동으로 실패 처리되며, 다른 API들은 정상적으로 작동합니다.

