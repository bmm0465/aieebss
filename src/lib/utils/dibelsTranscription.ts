export interface TimelineEntry {
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface ParsedTranscription {
  text: string;
  confidence?: string;
  timeline: TimelineEntry[];
  duration?: number;
  raw: unknown;
}

const DEFAULT_CONFIDENCE = 'medium';

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function safeParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildTimelineFromSegments(segments: unknown): TimelineEntry[] {
  if (!Array.isArray(segments)) return [];

  return segments
    .map((segment, index) => {
      if (!segment || typeof segment !== 'object') return null;
      const segmentObj = segment as Record<string, unknown>;

      const words = Array.isArray(segmentObj.words)
        ? (segmentObj.words as Array<Record<string, unknown>>)
        : [];

      let start: number | undefined;
      if (typeof segmentObj.start === 'number') {
        start = segmentObj.start;
      } else if (words.length > 0 && typeof words[0] === 'object' && words[0] !== null) {
        const firstWordStart = (words[0] as Record<string, unknown>).start;
        if (typeof firstWordStart === 'number') {
          start = firstWordStart;
        }
      }

      let end: number | undefined;
      if (typeof segmentObj.end === 'number') {
        end = segmentObj.end;
      } else if (words.length > 0) {
        const lastWord = words[words.length - 1];
        if (lastWord && typeof lastWord.end === 'number') {
          end = lastWord.end as number;
        }
      }

      let text = '';
      if (typeof segmentObj.text === 'string') {
        text = segmentObj.text.trim();
      } else if (words.length > 0) {
        text = words
          .map((word) => {
            const token = word && typeof word.word === 'string' ? word.word.trim() : '';
            return token;
          })
          .filter((token) => token.length > 0)
          .join(' ');
      }

      if (!text) return null;

      return {
        index,
        start: start ?? (index === 0 ? 0 : (index - 1) * 3),
        end: end ?? start ?? (index === 0 ? 0 : index * 3),
        text,
      } satisfies TimelineEntry;
    })
    .filter((entry): entry is TimelineEntry => Boolean(entry));
}

export function parseTranscriptionResult(transcription: unknown): ParsedTranscription {
  const raw = safeParseJson(transcription);

  let payload: Record<string, unknown> = {};

  if (raw && typeof raw === 'object') {
    payload = raw as Record<string, unknown>;

    if (typeof payload.text === 'string') {
      const nested = safeParseJson(payload.text);
      if (nested && typeof nested === 'object') {
        payload = { ...payload, ...(nested as Record<string, unknown>) };
      }
    }
  } else if (typeof raw === 'string') {
    const parsed = safeParseJson(raw);
    if (parsed && typeof parsed === 'object') {
      payload = parsed as Record<string, unknown>;
    } else {
      payload.text = raw.trim();
    }
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  const duration = coerceNumber(payload.duration, 0);
  const confidence = typeof payload.confidence === 'string' ? payload.confidence : DEFAULT_CONFIDENCE;
  const timeline = buildTimelineFromSegments(payload.segments);

  if (!timeline.length && text) {
    timeline.push({
      index: 0,
      start: 0,
      end: duration || Math.max(text.split(/\s+/).length * 0.6, 1),
      text,
    });
  }

  return {
    text,
    confidence,
    timeline,
    duration,
    raw,
  };
}

export function hasHesitation(timeline: TimelineEntry[], thresholdSeconds: number): boolean {
  if (!timeline.length) return true;
  const firstStart = timeline[0]?.start ?? 0;
  return firstStart >= thresholdSeconds;
}

export function timelineToPrompt(timeline: TimelineEntry[], maxEntries = 12): string {
  if (!timeline.length) return '[]';
  const trimmed = timeline.slice(-maxEntries).map((entry) => ({
    index: entry.index,
    start: Number(entry.start.toFixed(2)),
    end: Number(entry.end.toFixed(2)),
    text: entry.text,
  }));
  return JSON.stringify(trimmed);
}

export function secondsBetween(a: number | undefined, b: number | undefined): number | null {
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return Math.abs(b - a);
}

export function findLastTimelineEntry(timeline: TimelineEntry[]): TimelineEntry | null {
  if (!timeline.length) return null;
  return timeline[timeline.length - 1];
}


