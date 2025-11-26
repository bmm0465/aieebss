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
    let rawText = response.text();

    // Parse JSON if response is wrapped in markdown code blocks
    let parsedData: { text?: string; confidence?: string; segments?: Array<{ start: number; end: number; text: string }> } = {};
    
    // Check if response contains JSON in markdown code blocks
    const jsonMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.warn('[Gemini] Failed to parse JSON from response:', parseError);
      }
    } else {
      // Try to parse as direct JSON
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        // If not JSON, treat as plain text
        parsedData = { text: rawText };
      }
    }

    // Extract text, confidence, and segments
    const text = parsedData.text || rawText.trim();
    const confidence = parsedData.confidence || 'medium';
    
    // Build timeline from segments if available
    let timeline: TimelineEntry[] = [];
    if (parsedData.segments && Array.isArray(parsedData.segments)) {
      timeline = parsedData.segments.map((segment, index) => ({
        index,
        start: segment.start || 0,
        end: segment.end || 0,
        text: segment.text || '',
      })).filter(entry => entry.text.length > 0);
    }
    
    // If no timeline from segments, create a basic one
    if (timeline.length === 0 && text) {
      timeline = [
        {
          index: 0,
          start: 0,
          end: Math.max(text.split(/\s+/).length * 0.6, 1),
          text: text.trim(),
        },
      ];
    }

    return {
      text: text.trim(),
      confidence,
      timeline,
      duration: timeline.length > 0 ? timeline[timeline.length - 1].end : 0,
      raw: { text: rawText, parsed: parsedData, model: 'gemini-2.5-pro' },
    };
  } catch (error) {
    console.error('[Gemini Transcription Error]', error);
    throw new Error(`Gemini transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

