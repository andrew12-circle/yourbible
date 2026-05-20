export type TranscriptSegmentSource = "caption" | "third_party" | "deepgram" | "gemini" | "paste";

export type TranscriptSegmentRow = {
  seq: number;
  start_seconds: number;
  end_seconds: number | null;
  text: string;
  speaker: string | null;
  confidence: number | null;
  source: TranscriptSegmentSource;
};

export type TranscriptFetchResult = {
  segments: TranscriptSegmentRow[];
  rawText: string;
  source: TranscriptSegmentSource;
  provider: string;
  speakerCount: number | null;
  audioUrl?: string | null;
};
