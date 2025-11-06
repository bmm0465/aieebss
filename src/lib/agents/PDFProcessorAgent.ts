// PDF 처리 Agent
// PDF 파일을 업로드하고 텍스트를 추출하여 청크로 분할

import { createClient } from '@/lib/supabase/server';
// @ts-ignore - pdf-parse는 타입 정의가 불완전할 수 있음
import pdfParse from 'pdf-parse';

export class PDFProcessorAgent {
  private supabase: ReturnType<typeof createClient> | null = null;

  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * PDF 파일 처리 (텍스트 추출 및 청킹)
   */
  async processPDF(
    pdfId: string,
    fileBuffer: Buffer
  ): Promise<{
    success: boolean;
    chunksCreated: number;
    error?: string;
  }> {
    if (!this.supabase) await this.initialize();

    try {
      // PDF 텍스트 추출
      const pdfData = await pdfParse(fileBuffer);
      const text = pdfData.text;
      const numPages = pdfData.numpages;

      if (!text || text.trim().length === 0) {
        throw new Error('PDF에서 텍스트를 추출할 수 없습니다.');
      }

      // 텍스트를 청크로 분할 (페이지 단위 또는 문단 단위)
      const chunks = this.chunkText(text, numPages);

      // 데이터베이스에 청크 저장
      const chunksToInsert = chunks.map((chunk, index) => ({
        pdf_id: pdfId,
        chunk_index: index,
        page_number: chunk.pageNumber,
        content: chunk.text,
        metadata: {
          page_number: chunk.pageNumber,
          chunk_length: chunk.text.length
        }
      }));

      const { error: insertError } = await this.supabase!
        .from('curriculum_pdf_chunks')
        .insert(chunksToInsert);

      if (insertError) {
        throw new Error(`청크 저장 오류: ${insertError.message}`);
      }

      // PDF 상태 업데이트
      await this.supabase!
        .from('curriculum_pdfs')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', pdfId);

      return {
        success: true,
        chunksCreated: chunks.length
      };
    } catch (error) {
      console.error('PDF 처리 오류:', error);
      
      // 에러 상태 업데이트
      if (this.supabase) {
        await this.supabase
          .from('curriculum_pdfs')
          .update({
            status: 'failed'
          })
          .eq('id', pdfId);
      }

      return {
        success: false,
        chunksCreated: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 텍스트를 청크로 분할
   * 페이지 단위로 분할하되, 너무 긴 페이지는 문단 단위로 추가 분할
   */
  private chunkText(text: string, numPages: number): Array<{
    text: string;
    pageNumber: number;
  }> {
    const chunks: Array<{ text: string; pageNumber: number }> = [];
    const maxChunkSize = 2000; // 최대 청크 크기 (문자 수)

    // 페이지 분리 (PDF 파서가 페이지 정보를 제공하지 않는 경우를 대비)
    const pageMatches = text.match(/\f/g); // 폼 피드 문자 (페이지 구분)
    
    if (!pageMatches || pageMatches.length === 0) {
      // 페이지 구분이 없는 경우, 문단 단위로 분할
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
      let currentChunk = '';
      let currentPage = 1;

      for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            pageNumber: currentPage
          });
          currentChunk = paragraph;
          currentPage++;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }

      if (currentChunk.trim().length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          pageNumber: currentPage
        });
      }
    } else {
      // 페이지 단위로 분할
      const pages = text.split(/\f/);
      
      for (let i = 0; i < pages.length; i++) {
        const pageText = pages[i].trim();
        if (pageText.length === 0) continue;

        // 페이지가 너무 길면 문단 단위로 추가 분할
        if (pageText.length > maxChunkSize) {
          const paragraphs = pageText.split(/\n\n+/).filter(p => p.trim().length > 0);
          let currentChunk = '';

          for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
              chunks.push({
                text: currentChunk.trim(),
                pageNumber: i + 1
              });
              currentChunk = paragraph;
            } else {
              currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            }
          }

          if (currentChunk.trim().length > 0) {
            chunks.push({
              text: currentChunk.trim(),
              pageNumber: i + 1
            });
          }
        } else {
          chunks.push({
            text: pageText,
            pageNumber: i + 1
          });
        }
      }
    }

    return chunks;
  }
}

