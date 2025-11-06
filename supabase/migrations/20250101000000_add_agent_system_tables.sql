-- LLM Agent 기반 문항 생성 시스템을 위한 테이블 생성

-- 1. 교육과정 PDF 파일 메타데이터
CREATE TABLE IF NOT EXISTS curriculum_pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage 경로
  file_size BIGINT NOT NULL, -- 파일 크기 (bytes)
  grade_level TEXT, -- 학년
  subject TEXT, -- 과목
  uploaded_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE, -- 처리 완료 시간
  status TEXT DEFAULT 'processing', -- processing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PDF 텍스트 청크 (RAG용)
CREATE TABLE IF NOT EXISTS curriculum_pdf_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdf_id UUID REFERENCES curriculum_pdfs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL, -- 청크 순서
  page_number INTEGER, -- 페이지 번호
  content TEXT NOT NULL, -- 텍스트 내용
  -- embedding VECTOR(1536), -- OpenAI embedding (선택사항, pgvector 확장 필요 - 주석 처리)
  metadata JSONB, -- 추가 메타데이터 (단원, 주제 등)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 생성된 문항 저장
CREATE TABLE IF NOT EXISTS generated_test_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_type TEXT NOT NULL, -- LNF, PSF, NWF, WRF, ORF, MAZE
  grade_level TEXT NOT NULL,
  items JSONB NOT NULL, -- 문항 데이터
  pdf_references JSONB, -- 참조한 PDF 청크 ID 목록
  curriculum_alignment JSONB, -- 교육과정 연계 정보
  quality_score NUMERIC, -- 품질 점수 (0-100)
  status TEXT DEFAULT 'pending', -- pending, reviewed, approved, rejected
  generated_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id), -- 검토자
  review_notes TEXT, -- 검토 의견
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 문항 승인 워크플로우 이력
CREATE TABLE IF NOT EXISTS item_approval_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES generated_test_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- review, approve, reject, request_revision
  performed_by UUID REFERENCES auth.users(id),
  notes TEXT, -- 의견/메모
  quality_score NUMERIC, -- 이 시점의 품질 점수
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_pdf_id ON curriculum_pdf_chunks(pdf_id);
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_page ON curriculum_pdf_chunks(pdf_id, page_number);
-- 벡터 검색 인덱스 (pgvector 확장 필요 시 주석 해제)
-- CREATE INDEX IF NOT EXISTS idx_pdf_chunks_embedding ON curriculum_pdf_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_generated_items_status ON generated_test_items(status);
CREATE INDEX IF NOT EXISTS idx_generated_items_grade ON generated_test_items(grade_level, test_type);
CREATE INDEX IF NOT EXISTS idx_generated_items_created ON generated_test_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_item_id ON item_approval_workflow(item_id);
CREATE INDEX IF NOT EXISTS idx_workflow_created ON item_approval_workflow(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curriculum_pdfs_status ON curriculum_pdfs(status);
CREATE INDEX IF NOT EXISTS idx_curriculum_pdfs_grade ON curriculum_pdfs(grade_level);

-- 6. RLS (Row Level Security) 정책 설정

-- curriculum_pdfs 테이블
ALTER TABLE curriculum_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PDFs"
  ON curriculum_pdfs FOR SELECT
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can upload PDFs"
  ON curriculum_pdfs FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own PDFs"
  ON curriculum_pdfs FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own PDFs"
  ON curriculum_pdfs FOR DELETE
  USING (auth.uid() = uploaded_by);

-- curriculum_pdf_chunks 테이블
ALTER TABLE curriculum_pdf_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks from their PDFs"
  ON curriculum_pdf_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM curriculum_pdfs
      WHERE curriculum_pdfs.id = curriculum_pdf_chunks.pdf_id
      AND curriculum_pdfs.uploaded_by = auth.uid()
    )
  );

-- generated_test_items 테이블
ALTER TABLE generated_test_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated items"
  ON generated_test_items FOR SELECT
  USING (auth.uid() = generated_by);

CREATE POLICY "Users can create their own generated items"
  ON generated_test_items FOR INSERT
  WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can update their own generated items"
  ON generated_test_items FOR UPDATE
  USING (auth.uid() = generated_by OR auth.uid() = reviewed_by);

-- item_approval_workflow 테이블
ALTER TABLE item_approval_workflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow for their items"
  ON item_approval_workflow FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generated_test_items
      WHERE generated_test_items.id = item_approval_workflow.item_id
      AND (generated_test_items.generated_by = auth.uid() 
           OR item_approval_workflow.performed_by = auth.uid())
    )
  );

CREATE POLICY "Users can create workflow entries"
  ON item_approval_workflow FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM generated_test_items
      WHERE generated_test_items.id = item_approval_workflow.item_id
      AND (generated_test_items.generated_by = auth.uid() 
           OR auth.uid() = item_approval_workflow.performed_by)
    )
  );

-- 7. 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_curriculum_pdfs_updated_at
  BEFORE UPDATE ON curriculum_pdfs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_test_items_updated_at
  BEFORE UPDATE ON generated_test_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

