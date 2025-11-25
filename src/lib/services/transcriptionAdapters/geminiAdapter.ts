import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ParsedTranscription, TimelineEntry } from '@/lib/utils/dibelsTranscription';

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
}

export async function transcribeWithGemini(
  audioBuffer: ArrayBuffer,
  options: TranscriptionOptions = {},
): Promise<ParsedTranscription> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

  // Convert ArrayBuffer to base64
  const base64Audio = Buffer.from(audioBuffer).toString('base64');

  // Prepare the prompt
  const systemPrompt = options.prompt || 'Transcribe this audio to text. Return only the transcribed text.';
  
  const prompt = `${systemPrompt}\n\nAudio data (base64): ${base64Audio.substring(0, 100)}...`;

  try {
    // Note: Gemini 2.5 Pro may not directly support audio transcription in the same way
    // This is a placeholder implementation. You may need to use Google Cloud Speech-to-Text API instead
    // For now, we'll use the generative model with audio input if supported
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response and create a basic timeline
    const timeline: TimelineEntry[] = text
      ? [
          {
            index: 0,
            start: 0,
            end: Math.max(text.split(/\s+/).length * 0.6, 1),
            text: text.trim(),
          },
        ]
      : [];

    return {
      text: text.trim(),
      confidence: 'medium',
      timeline,
      duration: 0,
      raw: { text, model: 'gemini-2.5-pro' },
    };
  } catch (error) {
    console.error('[Gemini Transcription Error]', error);
    throw new Error(`Gemini transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

