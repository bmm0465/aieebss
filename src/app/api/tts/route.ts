import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error: any) {
    console.error('TTS API 에러 - OpenAI로부터 받은 응답:', error); 
    
    // [핵심] OpenAI 에러의 상세 내용을 뽑아서 JSON으로 응답합니다.
    const errorMessage = error.response?.data?.error?.message || error.message || '알 수 없는 에러';
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}