import type { ParsedTranscription } from '@/lib/utils/dibelsTranscription';
import { transcribeWithOpenAI, type TranscriptionOptions } from './transcriptionAdapters/openaiAdapter';
import { transcribeWithGemini } from './transcriptionAdapters/geminiAdapter';
import { transcribeWithAWS } from './transcriptionAdapters/awsAdapter';
import { transcribeWithAzure } from './transcriptionAdapters/azureAdapter';

export interface TranscriptionResult {
  success: boolean;
  result?: ParsedTranscription;
  error?: string;
  provider: 'openai' | 'gemini' | 'aws' | 'azure';
}

export interface AllTranscriptionResults {
  openai: TranscriptionResult;
  gemini: TranscriptionResult;
  aws: TranscriptionResult;
  azure: TranscriptionResult;
}

/**
 * Transcribe audio using all available transcription APIs in parallel
 * @param audioBuffer - The audio file as ArrayBuffer
 * @param options - Transcription options (language, prompt, etc.)
 * @returns Results from all transcription providers
 */
export async function transcribeAll(
  audioBuffer: ArrayBuffer,
  options: TranscriptionOptions = {},
): Promise<AllTranscriptionResults> {
  // Call all APIs in parallel
  const [openaiResult, geminiResult, awsResult, azureResult] = await Promise.allSettled([
    transcribeWithOpenAI(audioBuffer, options).then(
      (result) => ({ success: true, result, provider: 'openai' as const }),
      (error) => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'openai' as const,
      }),
    ),
    transcribeWithGemini(audioBuffer, options).then(
      (result) => ({ success: true, result, provider: 'gemini' as const }),
      (error) => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'gemini' as const,
      }),
    ),
    transcribeWithAWS(audioBuffer, options).then(
      (result) => ({ success: true, result, provider: 'aws' as const }),
      (error) => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'aws' as const,
      }),
    ),
    transcribeWithAzure(audioBuffer, options).then(
      (result) => ({ success: true, result, provider: 'azure' as const }),
      (error) => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'azure' as const,
      }),
    ),
  ]);

  // Extract results from Promise.allSettled
  const openai: TranscriptionResult =
    openaiResult.status === 'fulfilled'
      ? openaiResult.value
      : { success: false, error: 'Promise rejected', provider: 'openai' };

  const gemini: TranscriptionResult =
    geminiResult.status === 'fulfilled'
      ? geminiResult.value
      : { success: false, error: 'Promise rejected', provider: 'gemini' };

  const aws: TranscriptionResult =
    awsResult.status === 'fulfilled'
      ? awsResult.value
      : { success: false, error: 'Promise rejected', provider: 'aws' };

  const azure: TranscriptionResult =
    azureResult.status === 'fulfilled'
      ? azureResult.value
      : { success: false, error: 'Promise rejected', provider: 'azure' };

  // Log errors for debugging
  if (!openai.success) {
    console.warn('[Transcription] OpenAI failed:', openai.error);
  }
  if (!gemini.success) {
    console.warn('[Transcription] Gemini failed:', gemini.error);
  }
  if (!aws.success) {
    console.warn('[Transcription] AWS failed:', aws.error);
  }
  if (!azure.success) {
    console.warn('[Transcription] Azure failed:', azure.error);
  }

  return {
    openai,
    gemini,
    aws,
    azure,
  };
}

/**
 * Get the primary transcription result (OpenAI) for backward compatibility
 * @param results - All transcription results
 * @returns OpenAI result or null if failed
 */
export function getPrimaryTranscription(results: AllTranscriptionResults): ParsedTranscription | null {
  return results.openai.success && results.openai.result ? results.openai.result : null;
}

