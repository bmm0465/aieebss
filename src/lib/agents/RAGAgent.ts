// RAG (Retrieval Augmented Generation) Agent
// PDF 청크에서 관련 내용을 검색하여 컨텍스트로 제공

import { createClient } from '@/lib/supabase/server';
import type { PDFChunk, PDFReference } from './types';

export class RAGAgent {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * PDF 청크에서 관련 내용 검색 (텍스트 기반 검색)
   * @param pdfIds 검색할 PDF ID 목록
   * @param query 검색 쿼리 (학년, 테스트 유형, 주제 등)
   * @param limit 최대 반환 개수
   */
  async searchPDFChunks(
    pdfIds: string[],
    query: {
      gradeLevel?: string;
      testType?: string;
      keywords?: string[];
    },
    limit: number = 10
  ): Promise<PDFChunk[]> {
    if (!this.supabase) await this.initialize();

    try {
      let queryBuilder = this.supabase!
        .from('curriculum_pdf_chunks')
        .select('*')
        .in('pdf_id', pdfIds)
        .order('chunk_index', { ascending: true })
        .limit(limit);

      // 학년 레벨 필터링 (metadata에 있는 경우)
      if (query.gradeLevel) {
        queryBuilder = queryBuilder.contains('metadata', { grade_level: query.gradeLevel });
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('PDF 청크 검색 오류:', error);
        return [];
      }

      let chunks = data || [];

      // 키워드 기반 필터링 (간단한 텍스트 매칭)
      if (query.keywords && query.keywords.length > 0) {
        chunks = chunks.filter(chunk => {
          const content = chunk.content.toLowerCase();
          return query.keywords!.some(keyword => 
            content.includes(keyword.toLowerCase())
          );
        });
      }

      return chunks.slice(0, limit);
    } catch (error) {
      console.error('RAG 검색 오류:', error);
      return [];
    }
  }

  /**
   * 검색된 청크를 컨텍스트 문자열로 변환
   */
  formatChunksAsContext(chunks: PDFChunk[]): string {
    if (chunks.length === 0) return '';

    const contextParts = chunks.map((chunk, index) => {
      const pageInfo = chunk.page_number ? ` (페이지 ${chunk.page_number})` : '';
      return `[청크 ${index + 1}${pageInfo}]\n${chunk.content}`;
    });

    return `\n\n=== 교육과정 참고 자료 ===\n${contextParts.join('\n\n')}\n`;
  }

  /**
   * PDF 참조 정보 생성
   */
  async createPDFReference(
    pdfId: string,
    chunkIds: string[]
  ): Promise<PDFReference | null> {
    if (!this.supabase) await this.initialize();

    try {
      // PDF 정보 조회
      const { data: pdfData, error: pdfError } = await this.supabase!
        .from('curriculum_pdfs')
        .select('filename')
        .eq('id', pdfId)
        .single();

      if (pdfError || !pdfData) {
        console.error('PDF 정보 조회 오류:', pdfError);
        return null;
      }

      // 청크 정보 조회
      const { data: chunks, error: chunksError } = await this.supabase!
        .from('curriculum_pdf_chunks')
        .select('*')
        .in('id', chunkIds);

      if (chunksError) {
        console.error('청크 정보 조회 오류:', chunksError);
        return null;
      }

      return {
        pdf_id: pdfId,
        pdf_filename: pdfData.filename,
        chunk_ids: chunkIds,
        chunks: chunks || []
      };
    } catch (error) {
      console.error('PDF 참조 생성 오류:', error);
      return null;
    }
  }

  /**
   * 문항 생성에 필요한 관련 컨텍스트 추출
   */
  async extractContextForItemGeneration(
    pdfIds: string[],
    testType: string,
    gradeLevel: string
  ): Promise<{
    context: string;
    pdfReference: PDFReference | null;
  }> {
    // 테스트 유형에 맞는 키워드 추출
    const keywords = this.getKeywordsForTestType(testType);

    // 관련 청크 검색
    const chunks = await this.searchPDFChunks(
      pdfIds,
      {
        gradeLevel,
        testType,
        keywords
      },
      5 // 최대 5개 청크
    );

    // 컨텍스트 생성
    const context = this.formatChunksAsContext(chunks);

    // PDF 참조 생성
    const pdfReference = chunks.length > 0
      ? await this.createPDFReference(
          pdfIds[0],
          chunks.map(c => c.id)
        )
      : null;

    return {
      context,
      pdfReference
    };
  }

  /**
   * 테스트 유형별 키워드 추출
   */
  private getKeywordsForTestType(testType: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'LNF': ['알파벳', 'letter', 'alphabet', '문자'],
      'PSF': ['음소', 'phoneme', 'sound', '발음', '음성'],
      'NWF': ['파닉스', 'phonics', '디코딩', 'decoding', '무의미 단어'],
      'WRF': ['단어', 'word', '어휘', 'vocabulary', 'sight word'],
      'ORF': ['읽기', 'reading', '유창성', 'fluency', '지문', 'passage'],
      'MAZE': ['독해', 'comprehension', '이해', '문맥', 'context']
    };

    return keywordMap[testType] || [];
  }
}

