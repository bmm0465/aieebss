import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 문구를 해시하여 파일명 생성
function generateFileName(phrase: string): string {
  const hash = crypto.createHash('md5').update(phrase).digest('hex').slice(0, 8);
  const safePhrase = phrase.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 30);
  return `${safePhrase}_${hash}.png`;
}

export async function POST(request: Request) {
  try {
    const { phrase } = await request.json();

    if (!phrase) {
      return NextResponse.json({ error: '문구가 필요합니다.' }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const fileName = generateFileName(phrase);
    const storagePath = `meaning-images/${fileName}`;

    // 이미지가 이미 존재하는지 확인
    try {
      const { data: existingFile, error: listError } = await serviceClient.storage
        .from('meaning-images')
        .list('meaning-images', {
          search: fileName,
        });

      if (!listError && existingFile && existingFile.length > 0) {
        // 이미 존재하는 경우 URL 반환
        const { data: urlData } = serviceClient.storage
          .from('meaning-images')
          .getPublicUrl(storagePath);
        
        return NextResponse.json({ 
          imageUrl: urlData.publicUrl,
          cached: true 
        });
      }
    } catch (error) {
      // Storage 확인 실패 시 계속 진행 (새로 생성)
      console.warn('Storage 확인 실패, 새 이미지 생성:', error);
    }

    // DALL-E 3로 이미지 생성
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `A simple, clear illustration of: ${phrase}. The image should be appropriate for children and clearly show the main subject.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    if (!imageResponse.data || imageResponse.data.length === 0) {
      throw new Error('이미지 생성 실패: 응답 데이터가 없습니다.');
    }

    const imageUrl = imageResponse.data[0]?.url;
    if (!imageUrl) {
      throw new Error('이미지 생성 실패: 이미지 URL이 없습니다.');
    }

    // 이미지 다운로드
    const imageResponse_fetch = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse_fetch.arrayBuffer());

    // Supabase Storage에 저장
    const { error: uploadError } = await serviceClient.storage
      .from('meaning-images')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage 업로드 오류:', uploadError);
      // 업로드 실패해도 이미지 URL 반환
      return NextResponse.json({ 
        imageUrl: imageUrl,
        cached: false 
      });
    }

    // 공개 URL 생성
    const { data: urlData } = serviceClient.storage
      .from('meaning-images')
      .getPublicUrl(storagePath);

    return NextResponse.json({ 
      imageUrl: urlData.publicUrl,
      cached: false 
    });

  } catch (error) {
    console.error('이미지 생성 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

