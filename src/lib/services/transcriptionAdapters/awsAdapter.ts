import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import type { LanguageCode } from '@aws-sdk/client-transcribe';
import type { ParsedTranscription, TimelineEntry } from '@/lib/utils/dibelsTranscription';

export interface TranscriptionOptions {
  language?: string;
}

export async function transcribeWithAWS(
  audioBuffer: ArrayBuffer,
  options: TranscriptionOptions = {},
): Promise<ParsedTranscription> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const s3Bucket = process.env.AWS_S3_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not set');
  }

  if (!s3Bucket) {
    throw new Error(
      'AWS_S3_BUCKET_NAME environment variable is not set. ' +
      'AWS Transcribe requires S3 bucket because it only accepts S3 URIs (s3://bucket/key), not HTTP/HTTPS URLs. ' +
      'The audio file from Supabase Storage will be temporarily uploaded to S3 for transcription, then can be cleaned up automatically.'
    );
  }

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const transcribeClient = new TranscribeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    // Step 1: Upload audio to S3
    const s3Key = `transcriptions/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
    const s3Uri = `s3://${s3Bucket}/${s3Key}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        Body: Buffer.from(audioBuffer),
        ContentType: 'audio/webm',
      }),
    );

    // Step 2: Start transcription job
    const jobName = `transcription-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const languageCode: LanguageCode = (options.language === 'en' || !options.language
      ? 'en-US'
      : options.language as LanguageCode) as LanguageCode;

    const startCommand = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: s3Uri },
      MediaFormat: 'webm',
      LanguageCode: languageCode,
      Settings: {
        ShowSpeakerLabels: false,
        MaxAlternatives: 2, // AWS requires minimum value of 2
      },
    });

    await transcribeClient.send(startCommand);

    // Step 3: Poll for completion
    let jobStatus = 'IN_PROGRESS';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (60 attempts * 5 seconds)

    while (jobStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const getCommand = new GetTranscriptionJobCommand({ TranscriptionJobName: jobName });
      const response = await transcribeClient.send(getCommand);
      jobStatus = response.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';

      if (jobStatus === 'COMPLETED') {
        const transcriptUri = response.TranscriptionJob?.Transcript?.TranscriptFileUri;
        if (transcriptUri) {
          // Step 4: Fetch transcript from S3
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

          // Clean up: Delete the temporary audio file from S3
          // Since we're using Supabase Storage as primary storage, we can clean up S3 after transcription
          try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
            console.log('[AWS] Cleaned up temporary S3 file:', s3Key);
          } catch (cleanupError) {
            console.warn('[AWS] Failed to cleanup S3 file (non-critical):', cleanupError);
            // Don't throw - cleanup failure shouldn't affect the transcription result
          }

          return {
            text: text.trim(),
            confidence: 'medium',
            timeline,
            duration: timeline.length > 0 ? timeline[timeline.length - 1].end : 0,
            raw: transcriptData,
          };
        }
      }

      if (jobStatus === 'FAILED') {
        const failureReason = response.TranscriptionJob?.FailureReason || 'Unknown error';
        throw new Error(`AWS Transcription job failed: ${failureReason}`);
      }

      attempts++;
    }

    throw new Error(`AWS Transcription job timed out after ${maxAttempts * 5} seconds. Status: ${jobStatus}`);
  } catch (error) {
    console.error('[AWS Transcription Error]', error);
    throw new Error(`AWS transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
      MaxAlternatives: 2, // AWS requires minimum value of 2
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

