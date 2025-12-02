import type { ParsedTranscription, TimelineEntry } from '@/lib/utils/dibelsTranscription';

export interface TranscriptionOptions {
  language?: string;
}

export async function transcribeWithAzure(
  audioBuffer: ArrayBuffer,
  options: TranscriptionOptions = {},
): Promise<ParsedTranscription> {
  const subscriptionKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';

  if (!subscriptionKey) {
    throw new Error('AZURE_SPEECH_KEY is not set');
  }

  // Azure Speech REST API endpoint
  // Note: Azure Speech API supports various audio formats, but WebM may need special handling
  // Map language to Azure language code format (e.g., 'en' -> 'en-US')
  const languageCode = options.language === 'en' ? 'en-US' : options.language || 'en-US';
  const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(languageCode)}&format=detailed`;

  try {
    // Azure Speech API - try with WebM format first
    // Note: If WebM doesn't work, we may need to convert to WAV/OGG format
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'audio/webm; codecs=opus', // Azure may accept this, but WAV/OGG is more reliable
        'Accept': 'application/json',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Speech API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Parse Azure response
    // Azure Speech API returns: { RecognitionStatus: 'Success' | 'NoMatch' | 'InitialSilenceTimeout' | ..., DisplayText: string, Text: string, ... }
    let text = '';
    const recognitionStatus = result.RecognitionStatus;
    
    if (recognitionStatus === 'Success') {
      text = result.DisplayText || result.Text || '';
      
      // If both DisplayText and Text are empty, it's still a success but no speech detected
      if (!text) {
        console.warn('[Azure] RecognitionStatus is Success but no text found in response');
      }
    } else if (recognitionStatus) {
      // Log non-success status for debugging (NoMatch, InitialSilenceTimeout, etc.)
      console.warn(`[Azure] RecognitionStatus: ${recognitionStatus}`);
      throw new Error(`Azure recognition failed with status: ${recognitionStatus}`);
    } else {
      throw new Error('Azure API response missing RecognitionStatus field');
    }
    
    // Azure provides Confidence as a number (0.0-1.0) in some API versions, or we default to medium
    const confidenceValue = result.Confidence || result.NBest?.[0]?.Confidence;
    const confidence = confidenceValue 
      ? (confidenceValue > 0.8 ? 'high' : confidenceValue > 0.5 ? 'medium' : 'low')
      : 'medium';

    // Azure doesn't provide detailed timeline in basic API, so create a simple one
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
      confidence,
      timeline,
      duration: 0,
      raw: result,
    };
  } catch (error) {
    console.error('[Azure Transcription Error]', error);
    throw new Error(`Azure transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

