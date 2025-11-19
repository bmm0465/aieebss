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

    // 이미지가 이미 존재하는지 확인 (bucket이 없을 수 있으므로 안전하게 처리)
    let useStorage = false;
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
      useStorage = true; // bucket이 존재하면 Storage 사용
    } catch (error) {
      // Storage bucket이 없거나 확인 실패 시 DALL-E URL 직접 사용
      console.warn('Storage 확인 실패, DALL-E URL 직접 사용:', error);
      useStorage = false;
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

    // Storage를 사용할 수 있으면 저장 시도, 없으면 DALL-E URL 직접 반환
    if (useStorage) {
      try {
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

        if (!uploadError) {
          // 공개 URL 생성
          const { data: urlData } = serviceClient.storage
            .from('meaning-images')
            .getPublicUrl(storagePath);

          return NextResponse.json({ 
            imageUrl: urlData.publicUrl,
            cached: false 
          });
        } else {
          console.error('Storage 업로드 오류:', uploadError);
        }
      } catch (storageError) {
        console.error('Storage 처리 오류:', storageError);
      }
    }

    // Storage 사용 불가 또는 업로드 실패 시 DALL-E URL 직접 반환
    return NextResponse.json({ 
      imageUrl: imageUrl,
      cached: false 
    });

  } catch (error) {
    console.error('이미지 생성 에러:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

