import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { fetchAssemblyAiTranscript } from "./transcriptProviders/assemblyai.ts";
import { fetchDeepgramTranscript } from "./transcriptProviders/deepgram.ts";
import { fetchWorkerTranscript, isWorkerConfigured } from "./transcriptProviders/youtubeTranscriptWorker.ts";
import { buildFetchResult, segmentsFromTimedText } from "./transcriptNormalize.ts";
import type { TranscriptFetchResult, TranscriptSegmentSource } from "./transcriptTypes.ts";
import { fetchInvidiousTranscript } from "./youtubeInvidiousTranscript.ts";
import { fetchCaptionsViaYouTubeOAuth } from "./youtubeOAuthCaptions.ts";
import { fetchTranscriptPlusCaptions } from "./youtubeTranscriptPlus.ts";
import {
  fetchInnertubeTranscript,
  fetchTimedTextTranscript,
} from "./youtubeTranscript.ts";

export const CAPTION_RACE_TIMEOUT_MS = Number(
  Deno.env.get("TRANSCRIPT_CAPTION_RACE_MS") ?? "4500",
);

type CaptionLane = {
  name: string;
  provider: string;
  run: () => Promise<string | null>;
};

type CaptionRaceResult = {
  rawText: string;
  provider: string;
} | null;

/** Resolve when the first lane returns non-empty text, or null after timeoutMs. */
export async function raceCaptionLanes(
  lanes: CaptionLane[],
  timeoutMs: number,
): Promise<{ winner: CaptionRaceResult; attempts: string[] }> {
  if (!lanes.length) return { winner: null, attempts: ["Captions: no lanes configured"] };

  const attempts: string[] = [];

  const winner = await new Promise<CaptionRaceResult>((resolve) => {
    let settled = false;
    let pending = lanes.length;

    const finish = (value: CaptionRaceResult) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    for (const lane of lanes) {
      lane
        .run()
        .then((text) => {
          const trimmed = text?.trim() ?? "";
          if (trimmed) {
            attempts.push(`${lane.name}: ok`);
            clearTimeout(timer);
            finish({ rawText: trimmed, provider: lane.provider });
          } else {
            attempts.push(`${lane.name}: empty`);
          }
        })
        .catch((e) => {
          attempts.push(`${lane.name}: ${String((e as Error).message ?? e)}`);
        })
        .finally(() => {
          pending -= 1;
          if (!settled && pending === 0) {
            clearTimeout(timer);
            finish(null);
          }
        });
    }
  });

  return { winner, attempts };
}

export function outcomeFromTimedText(
  rawText: string,
  source: TranscriptSegmentSource,
  provider: string,
): TranscriptFetchResult {
  const segments = segmentsFromTimedText(rawText, source);
  if (segments.length) return buildFetchResult(segments, source, provider);
  return buildFetchResult(
    [{
      seq: 0,
      start_seconds: 0,
      end_seconds: null,
      text: rawText.trim().slice(0, 50000),
      speaker: null,
      confidence: null,
      source,
    }],
    source,
    provider,
  );
}

export type BuildCaptionLanesOpts = {
  videoId: string;
  userId?: string;
  admin?: SupabaseClient | null;
  fetchWatchCaptions: () => Promise<string | null>;
};

export function buildCaptionLanes(opts: BuildCaptionLanesOpts): CaptionLane[] {
  const { videoId, userId, admin, fetchWatchCaptions } = opts;
  const lanes: CaptionLane[] = [];

  if (admin && userId) {
    lanes.push({
      name: "Captions (oauth)",
      provider: "youtube_oauth_captions",
      run: () => fetchCaptionsViaYouTubeOAuth(admin, userId, videoId),
    });
  }

  if (isWorkerConfigured()) {
    lanes.push({
      name: "Transcript worker",
      provider: "youtube_transcript_worker",
      run: async () => {
        const worker = await fetchWorkerTranscript(videoId);
        return worker.rawText || null;
      },
    });
  }

  lanes.push(
    {
      name: "Captions (watch-page)",
      provider: "youtube_watch_captions",
      run: fetchWatchCaptions,
    },
    {
      name: "Captions (timedtext)",
      provider: "youtube_timedtext",
      run: () => fetchTimedTextTranscript(videoId),
    },
    {
      name: "Captions (innertube)",
      provider: "youtube_innertube",
      run: () => fetchInnertubeTranscript(videoId),
    },
    {
      name: "Captions (transcript-plus)",
      provider: "youtube_transcript_plus",
      run: () => fetchTranscriptPlusCaptions(videoId),
    },
    {
      name: "Captions (invidious)",
      provider: "youtube_invidious",
      run: () => fetchInvidiousTranscript(videoId),
    },
  );

  return lanes;
}

export async function fetchAssemblyFallback(watchUrl: string): Promise<TranscriptFetchResult | null> {
  try {
    const assembly = await fetchAssemblyAiTranscript(watchUrl);
    return assembly.rawText ? assembly : null;
  } catch {
    return null;
  }
}

export async function fetchDeepgramFallback(
  videoId: string,
  resolveAudioUrl: (id: string) => Promise<string | null>,
): Promise<TranscriptFetchResult | null> {
  if (!Deno.env.get("DEEPGRAM_API_KEY")?.trim()) return null;
  const audioUrl = await resolveAudioUrl(videoId).catch(() => null);
  if (!audioUrl) return null;
  try {
    const deepgram = await fetchDeepgramTranscript(audioUrl);
    return deepgram.rawText ? deepgram : null;
  } catch {
    return null;
  }
}
