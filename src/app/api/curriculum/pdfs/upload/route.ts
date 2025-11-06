import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { PDFProcessorAgent } from '@/lib/agents/PDFProcessorAgent';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const gradeLevel = formData.get('gradeLevel') as string;
    const subject = formData.get('subject') as string;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // PDF 파일 검증
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDF 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 100MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Supabase Storage에 업로드
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const storagePath = `curriculum-pdfs/${user.id}/${filename}`;

    const { error: uploadError } = await serviceClient.storage
      .from('curriculum-pdfs')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage 업로드 오류:', uploadError);
      return NextResponse.json(
        { error: '파일 업로드 실패: ' + uploadError.message },
        { status: 500 }
      );
    }

    // 데이터베이스에 메타데이터 저장
    const { data: pdfData, error: dbError } = await supabase
      .from('curriculum_pdfs')
      .insert({
        filename: file.name,
        storage_path: storagePath,
        file_size: file.size,
        grade_level: gradeLevel || null,
        subject: subject || null,
        uploaded_by: user.id,
        status: 'processing'
      })
      .select()
      .single();

    if (dbError) {
      console.error('데이터베이스 저장 오류:', dbError);
      // Storage에서 파일 삭제
      await serviceClient.storage
        .from('curriculum-pdfs')
        .remove([storagePath]);
      
      return NextResponse.json(
        { error: '데이터베이스 저장 실패: ' + dbError.message },
        { status: 500 }
      );
    }

    // 백그라운드에서 PDF 처리 (비동기)
    processPDFInBackground(pdfData.id, fileBuffer).catch(error => {
      console.error('PDF 처리 백그라운드 오류:', error);
    });

    return NextResponse.json({
      success: true,
      pdf: {
        id: pdfData.id,
        filename: pdfData.filename,
        status: pdfData.status
      }
    });
  } catch (error) {
    console.error('PDF 업로드 오류:', error);
    return NextResponse.json(
      { error: 'PDF 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 백그라운드에서 PDF 처리
async function processPDFInBackground(pdfId: string, fileBuffer: Buffer) {
  try {
    const processor = new PDFProcessorAgent();
    const result = await processor.processPDF(pdfId, fileBuffer);
    
    if (!result.success) {
      console.error(`PDF 처리 실패 (${pdfId}):`, result.error);
    }
  } catch (error) {
    console.error('PDF 처리 오류:', error);
  }
}

