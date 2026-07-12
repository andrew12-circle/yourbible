import type { ClaimEpistemology } from "@/lib/framework/epistemology";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

export interface ArtifactMetadata {
  source?: string;
  channel_title?: string | null;
  channel_url?: string | null;
  channel_thumbnail_url?: string | null;
  author_name?: string | null;
  author?: string | null;
  thumbnail_url?: string | null;
  provider_name?: string | null;
  duration_seconds?: number | null;
  title?: string;
  youtube_chapters?: YoutubeChapter[];
  youtube_chapters_source?: string | null;
  video_id?: string;
}

export interface MatchedBelief {
  id: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
}

export interface Claim {
  id: string;
  claim: string;
  tone: string | null;
  doctrine_tags: string[];
  scripture_supports: { ref: string; note?: string }[];
  scripture_challenges: { ref: string; note?: string }[];
  match_relation: string | null;
  matched_belief_id: string | null;
  bias_flags: string[];
  verdict: string | null;
  deferred_at: string | null;
  user_note: string | null;
  /** Populated when claims were extracted per YouTube chapter (see `framework-analyze`). */
  chapter_start_seconds?: number | null;
  /** AI epistemology layers (empty until re-analyze). */
  epistemology?: ClaimEpistemology | null;
}

export type ArtifactMomentKind = "bookmark" | "note" | "belief_seed";

export interface ArtifactMoment {
  id: string;
  user_id: string;
  artifact_id: string;
  start_seconds: number;
  end_seconds: number | null;
  kind: ArtifactMomentKind;
  body: string | null;
  label: string | null;
  created_at: string;
}

