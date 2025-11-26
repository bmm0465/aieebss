import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import type { LanguageCode } from '@aws-sdk/client-transcribe';
import type { ParsedTranscription, TimelineEntry } from '@/lib/utils/dibelsTranscription';

export interface TranscriptionOptions {
  language?: string;
}

export async function transcribeWithAWS(
  _audioBuffer: ArrayBuffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: TranscriptionOptions = {},
): Promise<ParsedTranscription> {
  // AWS Transcribe requires audio to be uploaded to S3 first
  // For now, we'll use a simplified approach with direct API call if possible
  // In production, you'd need to upload to S3 first, then start transcription job
  
  // Note: AWS Transcribe is asynchronous - it requires:
  // 1. Upload audio to S3
  // 2. Start transcription job
  // 3. Poll for completion
  // 4. Get results from S3
  
  // This is a placeholder implementation. For production, you'd need S3 integration
  // Credentials and options will be used when S3 integration is implemented
  const _accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const _secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _region = process.env.AWS_REGION || 'us-east-1';

  if (!_accessKeyId || !_secretAccessKey) {
    throw new Error('AWS credentials are not set');
  }
  
  throw new Error(
    'AWS Transcribe requires S3 integration. Please upload audio to S3 first, then start transcription job.',
  );
}

// Helper function for when S3 is integrated
export async function transcribeWithAWSS3(
  s3Uri: string,
  options: TranscriptionOptions = {},
): Promise<ParsedTranscription> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not set');
  }

  const client = new TranscribeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const jobName = `transcription-${Date.now()}`;
  // Map language to AWS Transcribe LanguageCode type
  // Default to 'en-US' if language is 'en' or not specified
  const languageCode: LanguageCode = (options.language === 'en' || !options.language 
    ? 'en-US' 
    : options.language as LanguageCode) as LanguageCode;

  // Start transcription job
  const startCommand = new StartTranscriptionJobCommand({
    TranscriptionJobName: jobName,
    Media: { MediaFileUri: s3Uri },
    MediaFormat: 'webm',
    LanguageCode: languageCode,
    Settings: {
      ShowSpeakerLabels: false,
      MaxAlternatives: 1,
    },
  });

  await client.send(startCommand);

  // Poll for completion (simplified - in production use proper polling with timeout)
  let jobStatus = 'IN_PROGRESS';
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (jobStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    const getCommand = new GetTranscriptionJobCommand({ TranscriptionJobName: jobName });
    const response = await client.send(getCommand);
    jobStatus = response.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';

    if (jobStatus === 'COMPLETED') {
      const transcriptUri = response.TranscriptionJob?.Transcript?.TranscriptFileUri;
      if (transcriptUri) {
        // Fetch transcript from S3
        const transcriptResponse = await fetch(transcriptUri);
        const transcriptData = await transcriptResponse.json();

        const text = transcriptData.results?.transcripts?.[0]?.transcript || '';
        const items = transcriptData.results?.items || [];

        const timeline: TimelineEntry[] = items
          .filter((item: { type: string }) => item.type === 'pronunciation')
          .map((item: { start_time?: string; end_time?: string; alternatives?: Array<{ content: string }> }, index: number) => ({
            index,
            start: item.start_time ? parseFloat(item.start_time) : 0,
            end: item.end_time ? parseFloat(item.end_time) : 0,
            text: item.alternatives?.[0]?.content || '',
          }))
          .filter((entry: TimelineEntry) => entry.text.length > 0);

        return {
          text: text.trim(),
          confidence: 'medium',
          timeline,
          duration: timeline.length > 0 ? timeline[timeline.length - 1].end : 0,
          raw: transcriptData,
        };
      }
    }

    attempts++;
  }

  throw new Error(`AWS Transcription job failed or timed out. Status: ${jobStatus}`);
}

