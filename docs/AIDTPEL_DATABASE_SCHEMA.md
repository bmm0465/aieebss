# AIDTPEL 프로젝트 데이터베이스 스키마

## 📊 개요

- **프로젝트 ID**: `nygxawxvwoagqjqdrzgb`
- **총 테이블 수**: 7개
- **RLS 활성화**: 모든 테이블에 Row Level Security 활성화

## 🔗 테이블 관계도 (ERD)

```
┌─────────────────┐
│   auth.users    │
│  (Supabase Auth)│
└────────┬────────┘
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                               │
         │                                                               │
    ┌────▼──────────────┐                                    ┌─────────▼──────────┐
    │  user_profiles     │                                    │   test_results      │
    │  (115 rows)        │                                    │   (1,084 rows)      │
    │                    │                                    │                     │
    │  • id (PK, FK)     │                                    │  • id (PK)          │
    │  • full_name       │                                    │  • user_id (FK)     │
    │  • role            │                                    │  • test_type        │
    │  • class_name      │                                    │  • question         │
    │  • student_number  │                                    │  • student_answer   │
    │  • grade_level     │                                    │  • is_correct       │
    │  • created_at      │                                    │  • accuracy         │
    │  • updated_at      │                                    │  • audio_url        │
    │                    │                                    │  • transcription_   │
    └────────────────────┘                                    │    results (JSONB)  │
         │                                                      │  • ... (기타 필드)  │
         │                                                      └─────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ teacher_student_assignments   │
    │ (112 rows)                    │
    │                               │
    │  • id (PK)                    │
    │  • teacher_id (FK)             │
    │  • student_id (FK)             │
    │  • class_name                  │
    │  • assigned_at                 │
    └───────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Agent 시스템 테이블                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  curriculum_pdfs     │
│  (0 rows)           │
│                     │
│  • id (PK)          │
│  • filename         │
│  • storage_path     │
│  • file_size        │
│  • grade_level      │
│  • subject          │
│  • uploaded_by (FK)│
│  • status           │
│  • created_at       │
│  • updated_at       │
└──────────┬──────────┘
           │
           │
    ┌──────▼──────────────────┐
    │ curriculum_pdf_chunks   │
    │ (0 rows)                │
    │                         │
    │  • id (PK)              │
    │  • pdf_id (FK)          │
    │  • chunk_index          │
    │  • page_number          │
    │  • content              │
    │  • metadata (JSONB)      │
    │  • created_at           │
    └─────────────────────────┘

┌──────────────────────┐
│ generated_test_items │
│ (9 rows)            │
│                     │
│  • id (PK)          │
│  • test_type        │
│  • grade_level      │
│  • items (JSONB)    │
│  • pdf_references   │
│  • generated_by (FK)│
│  • reviewed_by (FK) │
│  • status           │
│  • created_at       │
│  • updated_at       │
└──────────┬──────────┘
           │
           │
    ┌──────▼──────────────────┐
    │ item_approval_workflow   │
    │ (0 rows)                 │
    │                          │
    │  • id (PK)               │
    │  • item_id (FK)          │
    │  • action                │
    │  • performed_by (FK)    │
    │  • notes                 │
    │  • quality_score         │
    │  • created_at            │
    └──────────────────────────┘
```

## 📋 테이블 상세 구조

### 1. `test_results` (1,084 rows)

테스트 결과를 저장하는 메인 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `bigint` | PK, Identity | 기본 키 (자동 증가) |
| `user_id` | `uuid` | FK → `auth.users.id` | 사용자 ID |
| `test_type` | `text` | NULLABLE | 테스트 유형 (lnf, psf, nwf, wrf, orf, maze) |
| `question` | `text` | NULLABLE | 문제 내용 |
| `student_answer` | `text` | NULLABLE, DEFAULT: `''` | 학생 답안 |
| `correct_answer` | `text` | NULLABLE | 정답 |
| `is_correct` | `boolean` | NULLABLE | 정답 여부 |
| `is_phonemes_correct` | `boolean` | NULLABLE | 음소 정확도 |
| `is_whole_word_correct` | `boolean` | NULLABLE | 단어 전체 정확도 |
| `target_phoneme_count` | `integer` | NULLABLE | 목표 음소 수 |
| `wcpm` | `integer` | NULLABLE | Words Correct Per Minute |
| `accuracy` | `double precision` | NULLABLE | 정확도 (0-100) |
| `time_taken` | `integer` | NULLABLE | 소요 시간 (초) |
| `error_details` | `jsonb` | NULLABLE | 오류 상세 정보 |
| `error_type` | `text` | NULLABLE | 오류 유형 |
| `correct_segments` | `integer` | NULLABLE | 정확한 세그먼트 수 |
| `target_segments` | `integer` | NULLABLE | 목표 세그먼트 수 |
| `correct_letter_sounds` | `integer` | NULLABLE | 정확한 글자 소리 수 |
| `audio_url` | `text` | NULLABLE | 오디오 파일 URL |
| `transcription_results` | `jsonb` | NULLABLE | Multi-API 전사 결과 |
| `created_at` | `timestamptz` | DEFAULT: `now()` | 생성 시간 |

**외래키:**
- `test_results_user_id_fkey`: `user_id` → `auth.users.id`

**RLS:** ✅ 활성화

---

### 2. `user_profiles` (115 rows)

사용자 프로필 및 역할 관리 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PK, FK → `auth.users.id` | 사용자 ID (기본 키) |
| `full_name` | `text` | NULLABLE | 전체 이름 |
| `role` | `text` | DEFAULT: `'student'` | 역할 (student, teacher) |
| `class_name` | `text` | NULLABLE | 반 이름 |
| `student_number` | `text` | NULLABLE | 학생 번호 |
| `grade_level` | `text` | NULLABLE | 학년 |
| `created_at` | `timestamptz` | DEFAULT: `now()` | 생성 시간 |
| `updated_at` | `timestamptz` | DEFAULT: `now()` | 수정 시간 |

**외래키:**
- `user_profiles_id_fkey`: `id` → `auth.users.id`

**RLS:** ✅ 활성화

---

### 3. `teacher_student_assignments` (112 rows)

교사-학생 관계 매핑 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PK, DEFAULT: `uuid_generate_v4()` | 기본 키 |
| `teacher_id` | `uuid` | FK → `auth.users.id` | 교사 ID |
| `student_id` | `uuid` | FK → `auth.users.id` | 학생 ID |
| `class_name` | `text` | NULLABLE | 반 이름 |
| `assigned_at` | `timestamptz` | DEFAULT: `now()` | 배정 시간 |

**외래키:**
- `teacher_student_assignments_teacher_id_fkey`: `teacher_id` → `auth.users.id`
- `teacher_student_assignments_student_id_fkey`: `student_id` → `auth.users.id`

**제약조건:**
- `UNIQUE(teacher_id, student_id)`: 교사-학생 조합은 유일해야 함

**RLS:** ✅ 활성화

---

### 4. `curriculum_pdfs` (0 rows)

교육과정 PDF 파일 메타데이터 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PK, DEFAULT: `uuid_generate_v4()` | 기본 키 |
| `filename` | `text` | NOT NULL | 파일명 |
| `storage_path` | `text` | NOT NULL | Supabase Storage 경로 |
| `file_size` | `bigint` | NOT NULL | 파일 크기 (bytes) |
| `grade_level` | `text` | NULLABLE | 학년 |
| `subject` | `text` | NULLABLE | 과목 |
| `uploaded_by` | `uuid` | NULLABLE, FK → `auth.users.id` | 업로드한 사용자 |
| `processed_at` | `timestamptz` | NULLABLE | 처리 완료 시간 |
| `status` | `text` | DEFAULT: `'processing'` | 상태 (processing, completed, failed) |
| `created_at` | `timestamptz` | DEFAULT: `now()` | 생성 시간 |
| `updated_at` | `timestamptz` | DEFAULT: `now()` | 수정 시간 |

**외래키:**
- `curriculum_pdfs_uploaded_by_fkey`: `uploaded_by` → `auth.users.id`

**RLS:** ✅ 활성화

---

### 5. `curriculum_pdf_chunks` (0 rows)

PDF 텍스트 청크 테이블 (RAG용)입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PK, DEFAULT: `uuid_generate_v4()` | 기본 키 |
| `pdf_id` | `uuid` | NULLABLE, FK → `curriculum_pdfs.id` | PDF ID |
| `chunk_index` | `integer` | NOT NULL | 청크 순서 |
| `page_number` | `integer` | NULLABLE | 페이지 번호 |
| `content` | `text` | NOT NULL | 텍스트 내용 |
| `metadata` | `jsonb` | NULLABLE | 추가 메타데이터 (단원, 주제 등) |
| `created_at` | `timestamptz` | DEFAULT: `now()` | 생성 시간 |

**외래키:**
- `curriculum_pdf_chunks_pdf_id_fkey`: `pdf_id` → `curriculum_pdfs.id` (ON DELETE CASCADE)

**RLS:** ✅ 활성화

---

### 6. `generated_test_items` (9 rows)

생성된 문항 저장 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PK, DEFAULT: `uuid_generate_v4()` | 기본 키 |
| `test_type` | `text` | NOT NULL | 테스트 유형 (LNF, PSF, NWF, WRF, ORF, MAZE) |
| `grade_level` | `text` | NOT NULL | 학년 |
| `items` | `jsonb` | NOT NULL | 문항 데이터 |
| `pdf_references` | `jsonb` | NULLABLE | 참조한 PDF 청크 ID 목록 |
| `curriculum_alignment` | `jsonb` | NULLABLE | 교육과정 연계 정보 |
| `quality_score` | `numeric` | NULLABLE | 품질 점수 (0-100) |
| `status` | `text` | DEFAULT: `'pending'` | 상태 (pending, reviewed, approved, rejected) |
| `generated_by` | `uuid` | NULLABLE, FK → `auth.users.id` | 생성한 사용자 |
| `reviewed_by` | `uuid` | NULLABLE, FK → `auth.users.id` | 검토자 |
| `review_notes` | `text` | NULLABLE | 검토 의견 |
| `approved_at` | `timestamptz` | NULLABLE | 승인 시간 |
| `created_at` | `timestamptz` | DEFAULT: `now()` | 생성 시간 |
| `updated_at` | `timestamptz` | DEFAULT: `now()` | 수정 시간 |

**외래키:**
- `generated_test_items_generated_by_fkey`: `generated_by` → `auth.users.id`
- `generated_test_items_reviewed_by_fkey`: `reviewed_by` → `auth.users.id`

**RLS:** ✅ 활성화

---

### 7. `item_approval_workflow` (0 rows)

문항 승인 워크플로우 이력 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PK, DEFAULT: `uuid_generate_v4()` | 기본 키 |
| `item_id` | `uuid` | NULLABLE, FK → `generated_test_items.id` | 문항 ID |
| `action` | `text` | NOT NULL | 액션 (review, approve, reject, request_revision) |
| `performed_by` | `uuid` | NULLABLE, FK → `auth.users.id` | 수행한 사용자 |
| `notes` | `text` | NULLABLE | 의견/메모 |
| `quality_score` | `numeric` | NULLABLE | 이 시점의 품질 점수 |
| `created_at` | `timestamptz` | DEFAULT: `now()` | 생성 시간 |

**외래키:**
- `item_approval_workflow_item_id_fkey`: `item_id` → `generated_test_items.id` (ON DELETE CASCADE)
- `item_approval_workflow_performed_by_fkey`: `performed_by` → `auth.users.id`

**RLS:** ✅ 활성화

---

## 🔐 Row Level Security (RLS) 정책

모든 테이블에 RLS가 활성화되어 있으며, 다음과 같은 정책이 적용됩니다:

### `test_results`
- 학생은 자신의 결과만 조회 가능
- 교사는 담당 학생의 결과 조회 가능

### `user_profiles`
- 사용자는 자신의 프로필 조회/수정 가능
- 교사는 담당 학생의 프로필 조회 가능

### `teacher_student_assignments`
- 교사는 자신의 학생 배정 조회 가능

### `curriculum_pdfs`
- 사용자는 자신이 업로드한 PDF만 조회/수정/삭제 가능

### `curriculum_pdf_chunks`
- 사용자는 자신이 업로드한 PDF의 청크만 조회 가능

### `generated_test_items`
- 사용자는 자신이 생성한 문항만 조회/수정 가능
- 검토자는 자신이 검토한 문항 수정 가능

### `item_approval_workflow`
- 사용자는 자신이 생성한 문항의 워크플로우 조회 가능
- 검토자는 자신이 수행한 워크플로우 조회 가능

---

## 📊 데이터 통계

| 테이블명 | 레코드 수 | 주요 용도 |
|----------|-----------|-----------|
| `test_results` | 1,084 | 테스트 결과 저장 |
| `user_profiles` | 115 | 사용자 프로필 관리 |
| `teacher_student_assignments` | 112 | 교사-학생 관계 |
| `generated_test_items` | 9 | 생성된 문항 |
| `curriculum_pdfs` | 0 | PDF 메타데이터 |
| `curriculum_pdf_chunks` | 0 | PDF 청크 |
| `item_approval_workflow` | 0 | 승인 워크플로우 |

---

## 🔑 주요 특징

1. **ID 타입 차이**: `test_results`는 `bigint` ID를 사용하지만, 다른 테이블은 `uuid`를 사용합니다.
2. **JSONB 활용**: `transcription_results`, `items`, `pdf_references`, `curriculum_alignment`, `metadata`, `error_details` 등에서 JSONB를 사용하여 유연한 데이터 구조를 지원합니다.
3. **CASCADE 삭제**: `curriculum_pdf_chunks`와 `item_approval_workflow`는 부모 레코드 삭제 시 자동으로 삭제됩니다.
4. **타임스탬프 자동 관리**: 모든 테이블에 `created_at`이 있으며, 일부 테이블은 `updated_at`도 자동으로 관리됩니다.

---

## 📝 참고사항

- 모든 테이블은 `public` 스키마에 있습니다.
- `auth.users` 테이블은 Supabase Auth에서 자동으로 관리됩니다.
- RLS 정책은 보안을 위해 모든 테이블에 적용되어 있습니다.
- 외래키 제약조건으로 데이터 무결성이 보장됩니다.

