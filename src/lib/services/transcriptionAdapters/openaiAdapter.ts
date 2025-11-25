import OpenAI from 'openai';
import type { ParsedTranscription } from '@/lib/utils/dibelsTranscription';
import { parseTranscriptionResult } from '@/lib/utils/dibelsTranscription';

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'verbose_json' | 'text';
  temperature?: number;
}

export async function transcribeWithOpenAI(
  audioBuffer: ArrayBuffer,
  options: TranscriptionOptions = {},
): Promise<ParsedTranscription> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const transcription = await openai.audio.transcriptions.create({
    model: 'gpt-4o-transcribe',
    file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
    language: options.language || 'en',
    response_format: options.responseFormat || 'json',
    temperature: options.temperature ?? 0,
    prompt: options.prompt,
  });

  return parseTranscriptionResult(transcription);
}

