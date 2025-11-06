// Agent 시스템 타입 정의

export type TestType = 'LNF' | 'PSF' | 'NWF' | 'WRF' | 'ORF' | 'MAZE';

export type GradeLevel = '초등 1학년' | '초등 2학년' | '초등 3학년' | '초등 4학년' | '초등 5학년' | '초등 6학년';

export type ItemStatus = 'pending' | 'reviewed' | 'approved' | 'rejected';

export type WorkflowAction = 'review' | 'approve' | 'reject' | 'request_revision';

export interface GeneratedItems {
  LNF?: string[];
  PSF?: string[];
  NWF?: string[];
  WRF?: string[];
  ORF?: string;
  MAZE?: Array<{
    num: number;
    sentence: string;
    choices: string[];
    answer: string;
  }>;
}

export interface PDFChunk {
  id: string;
  pdf_id: string;
  chunk_index: number;
  page_number: number | null;
  content: string;
  metadata: Record<string, any> | null;
}

export interface PDFReference {
  pdf_id: string;
  pdf_filename: string;
  chunk_ids: string[];
  chunks?: PDFChunk[];
}

export interface CurriculumAlignment {
  grade_level: string;
  units?: string[];
  themes?: string[];
  vocabulary?: string[];
  expressions?: string[];
}

export interface QualityScore {
  overall: number; // 0-100
  dibels_compliance: number;
  grade_level_appropriateness: number;
  curriculum_alignment: number;
  difficulty_appropriateness: number;
  grammar_accuracy: number;
  issues?: string[];
  suggestions?: string[];
}

export interface GeneratedTestItem {
  id?: string;
  test_type: TestType;
  grade_level: GradeLevel;
  items: GeneratedItems;
  pdf_references?: PDFReference[];
  curriculum_alignment?: CurriculumAlignment;
  quality_score?: QualityScore;
  status: ItemStatus;
  generated_by?: string;
  reviewed_by?: string;
  review_notes?: string;
  approved_at?: Date;
  created_at?: Date;
}

export interface ItemGenerationRequest {
  testTypes: TestType[];
  gradeLevel: GradeLevel;
  pdfIds?: string[]; // 참조할 PDF ID 목록
  referenceDocument?: string; // 추가 참고 문서 (텍스트)
  customInstructions?: string; // 사용자 지정 지시사항
}

export interface ItemGenerationResult {
  success: boolean;
  items?: GeneratedItems;
  itemId?: string;
  qualityScore?: QualityScore;
  pdfReferences?: PDFReference[];
  error?: string;
}

export interface WorkflowHistoryEntry {
  id: string;
  item_id: string;
  action: WorkflowAction;
  performed_by: string;
  notes?: string;
  quality_score?: number;
  created_at: Date;
}

