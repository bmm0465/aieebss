import type { ParsedTranscription, TimelineEntry } from '@/lib/utils/dibelsTranscription';

export interface TranscriptionOptions {
  language?: string;
}

export async function transcribeWithAzure(
  audioBuffer: ArrayBuffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: TranscriptionOptions = {},
): Promise<ParsedTranscription> {
  const subscriptionKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';

  if (!subscriptionKey) {
    throw new Error('AZURE_SPEECH_KEY is not set');
  }

  // Azure Speech REST API endpoint
  // Note: base64Audio conversion is not needed for direct audio buffer upload
  const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;

  try {
    // Get access token first (or use subscription key directly)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'audio/webm; codecs=opus',
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
    const text = result.DisplayText || result.RecognitionStatus === 'Success' ? result.Text || '' : '';
    const confidence = result.Confidence ? (result.Confidence > 0.8 ? 'high' : result.Confidence > 0.5 ? 'medium' : 'low') : 'medium';

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

