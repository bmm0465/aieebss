# Supabase Storage 구조 변경 안내

## 변경 사항 요약

기존의 Supabase Storage 구조를 학생 이름과 평가 시기별로 더 직관적으로 변경했습니다.

## 기존 구조 vs 새로운 구조

### 기존 구조
```
student-recordings/
├── lnf/
│   └── {userId}/
│       ├── 1760537301791.webm
│       └── 1760537303325.webm
├── psf/
│   └── {userId}/
│       └── 1760537304000.webm
├── nwf/
│   └── {userId}/
│       └── 1760537305000.webm
├── wrf/
│   └── {userId}/
│       └── 1760537306000.webm
└── orf/
    └── {userId}/
        └── 1760537307000.webm
```

### 새로운 구조
```
student-recordings/
├── 김민제/
│   ├── 2025-01-15/
│   │   ├── lnf/
│   │   │   ├── 1760537301791.webm
│   │   │   └── 1760537303325.webm
│   │   ├── psf/
│   │   │   └── 1760537304000.webm
│   │   ├── nwf/
│   │   │   └── 1760537305000.webm
│   │   ├── wrf/
│   │   │   └── 1760537306000.webm
│   │   └── orf/
│   │       └── 1760537307000.webm
│   └── 2025-01-16/
│       ├── lnf/
│       └── ...
└── 이영희/
    ├── 2025-01-15/
    └── ...
```

## 변경된 파일들

### 1. 새로운 유틸리티 파일
- `src/lib/storage-path.ts`: 스토리지 경로 생성 및 관리 함수

### 2. 수정된 API 파일들
- `src/app/api/submit-lnf/route.ts`: LNF 테스트 음성 파일 저장
- `src/app/api/submit-psf/route.ts`: PSF 테스트 음성 파일 저장
- `src/app/api/submit-nwf/route.ts`: NWF 테스트 음성 파일 저장
- `src/app/api/submit-wrf/route.ts`: WRF 테스트 음성 파일 저장
- `src/app/api/submit-orf/route.ts`: ORF 테스트 음성 파일 저장

## 새로운 경로 생성 로직

### `generateStoragePath()` 함수
```typescript
export async function generateStoragePath(
  userId: string, 
  testType: string, 
  timestamp?: number
): Promise<string>
```

**경로 형식**: `{studentName}/{sessionDate}/{testType}/{timestamp}.webm`

- `studentName`: `user_profiles` 테이블에서 조회한 학생 이름
- `sessionDate`: `YYYY-MM-DD` 형식의 평가 날짜
- `testType`: 테스트 유형 (lnf, psf, nwf, wrf, orf)
- `timestamp`: 파일 생성 시점의 타임스탬프

## 학생 이름 조회 로직

1. `user_profiles` 테이블에서 `name` 필드 조회
2. 이름이 없으면 `auth` 테이블에서 이메일을 사용
3. 이메일에서도 이름을 추출할 수 없으면 `student_{userId_8자리}` 형식 사용

## 안전한 파일명 처리

- 학생 이름에서 특수문자를 `_`로 치환
- 파일 경로에 안전하지 않은 문자들 정리

## 마이그레이션 고려사항

기존 파일들을 새로운 구조로 이동하려면 별도의 마이그레이션 스크립트가 필요합니다. 현재는 새로운 평가부터 새로운 구조로 저장됩니다.

## Supabase Storage에서 확인하는 방법

1. Supabase Dashboard → Storage → student-recordings 버킷
2. 학생 이름 폴더 → 평가 날짜 폴더 → 테스트 유형 폴더 → 음성 파일들

이제 교사들이 학생별로 체계적으로 음성 파일을 확인할 수 있습니다.
