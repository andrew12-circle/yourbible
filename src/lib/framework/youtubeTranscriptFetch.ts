import { normalizePastedTranscript } from "@/lib/normalizePastedTranscript";
import { getYouTubeVideoId } from "@/lib/youtube";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";
import { resolveClientYoutubeCaptions } from "@/lib/framework/youtubeClientCaptions";
import { markManualYoutubeFetch } from "@/lib/framework/youtubeFetchCoordinator";

type StartYoutubeTranscriptFetchParams = {
  artifactId: string;
  url: string;
  processingToken: string;
  markError?: boolean;
};

type TranscriptFetchResult = {
  ok: boolean;
  error?: string;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message);
  }
  return String(err || "Unknown error");
}

function responseError(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("error" in data)) return null;
  const value = (data as { error?: unknown }).error;
  return typeof value === "string" && value.trim() ? value : null;
}

function isStaleTokenResponse(error: unknown): boolean {
  if (!(error instanceof FunctionsHttpError)) return false;
  const ctx = error.context;
  return ctx instanceof Response && ctx.status === 409;
}

export function createTranscriptProcessingToken(): string {
  return crypto.randomUUID();
}

export async function markYoutubeTranscriptFetchError(artifactId: string, message: string): Promise<void> {
  await supabase
    .from("artifacts")
    .update({ status: "error", error: message })
    .eq("id", artifactId);
}

type FetchTranscriptBody = {
  artifact_id: string;
  url: string;
  processing_token: string;
  pre_fetched_captions?: string;
};

async function invokeFetchTranscript(body: FetchTranscriptBody): Promise<void> {
  const { data, error } = await supabase.functions.invoke("framework-fetch-transcript", { body });
  if (error) {
    if (isStaleTokenResponse(error)) {
      throw Object.assign(new Error("stale request"), { staleToken: true });
    }
    const msg = await edgeFunctionErrorMessage("framework-fetch-transcript", error, data);
    throw new Error(msg);
  }
  const payloadError = responseError(data);
  if (payloadError) throw new Error(payloadError);
}

async function readProcessingToken(artifactId: string): Promise<string | null> {
  const { data } = await supabase
    .from("artifacts")
    .select("processing_token")
    .eq("id", artifactId)
    .maybeSingle();
  const token = data?.processing_token;
  return typeof token === "string" && token.trim() ? token : null;
}

/** Send browser-fetched captions to the edge function for segment indexing + analyze. */
async function submitPrefetchedCaptions(
  artifactId: string,
  url: string,
  rawText: string,
  processingToken: string,
): Promise<TranscriptFetchResult> {
  const normalized = normalizePastedTranscript(rawText);
  let token = processingToken;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await invokeFetchTranscript({
        artifact_id: artifactId,
        url,
        processing_token: token,
        pre_fetched_captions: normalized,
      });
      return { ok: true };
    } catch (err) {
      const stale = err instanceof Error && "staleToken" in err && (err as { staleToken?: boolean }).staleToken;
      if (!stale || attempt > 0) throw err;
      const fresh = await readProcessingToken(artifactId);
      if (!fresh) throw err;
      token = fresh;
    }
  }

  return { ok: true };
}

/**
 * Fetch captions from the user's browser (residential IP).
 * Falls back to Invidious mirrors, then the server-side ladder.
 */
async function tryClientCaptionFetch(
  artifactId: string,
  url: string,
  processingToken: string,
): Promise<TranscriptFetchResult | null> {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    const resolved = await resolveClientYoutubeCaptions(videoId);
    if (resolved.text) {
      return submitPrefetchedCaptions(artifactId, url, resolved.text, processingToken);
    }
    console.warn("Client caption fetch:", resolved.attempts.join("; "));
  } catch (err) {
    console.warn("Client caption fetch error:", err);
  }
  return null;
}

/** Optional captions warmed in the browser before submit (see useYoutubeCaptionPrefetch). */
export async function startYoutubeTranscriptFetchWithPrefetch({
  artifactId,
  url,
  processingToken,
  prefetchedRawText,
  markError = true,
}: StartYoutubeTranscriptFetchParams & { prefetchedRawText?: string | null }): Promise<TranscriptFetchResult> {
  const warmed = prefetchedRawText?.trim();
  if (warmed) {
    try {
      return await submitPrefetchedCaptions(artifactId, url, warmed, processingToken);
    } catch (err) {
      console.warn("Prefetched caption submit failed, falling back to full fetch:", err);
    }
  }
  return startYoutubeTranscriptFetch({ artifactId, url, processingToken, markError });
}

export async function startYoutubeTranscriptFetch({
  artifactId,
  url,
  processingToken,
  markError = true,
}: StartYoutubeTranscriptFetchParams): Promise<TranscriptFetchResult> {
  try {
    const clientResult = await tryClientCaptionFetch(artifactId, url, processingToken);
    if (clientResult) return clientResult;

    let token = processingToken;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await invokeFetchTranscript({ artifact_id: artifactId, url, processing_token: token });
        return { ok: true };
      } catch (err) {
        const stale = err instanceof Error && "staleToken" in err && (err as { staleToken?: boolean }).staleToken;
        if (!stale || attempt > 0) throw err;
        const fresh = await readProcessingToken(artifactId);
        if (!fresh) throw err;
        token = fresh;
      }
    }
    return { ok: true };
  } catch (err) {
    const message = `Could not start transcript fetch: ${errorMessage(err)}`;
    if (markError) await markYoutubeTranscriptFetchError(artifactId, message);
    return { ok: false, error: message };
  }
}

/** Re-invoke fetch with the artifact's current token (no token rotation). */
export async function resumeYoutubeTranscriptFetch(
  artifactId: string,
  url: string,
): Promise<TranscriptFetchResult> {
  const { data, error } = await supabase
    .from("artifacts")
    .select("processing_token")
    .eq("id", artifactId)
    .maybeSingle();
  if (error) {
    return { ok: false, error: `Could not read artifact: ${error.message}` };
  }
  const token =
    typeof data?.processing_token === "string" && data.processing_token.trim()
      ? data.processing_token
      : null;
  if (token) {
    return startYoutubeTranscriptFetch({
      artifactId,
      url,
      processingToken: token,
      markError: false,
    });
  }
  return restartYoutubeTranscriptFetch(artifactId, url);
}

export async function restartYoutubeTranscriptFetch(
  artifactId: string,
  url: string,
): Promise<TranscriptFetchResult> {
  markManualYoutubeFetch(artifactId);

  const videoId = getYouTubeVideoId(url);
  const prefetchedRawText = videoId
    ? (await resolveClientYoutubeCaptions(videoId).catch(() => ({ text: null, attempts: [] }))).text
    : null;

  const processingToken = createTranscriptProcessingToken();
  const { error } = await supabase
    .from("artifacts")
    .update({ status: "fetching", error: null, processing_token: processingToken })
    .eq("id", artifactId);
  if (error) {
    return { ok: false, error: `Could not queue transcript fetch: ${error.message}` };
  }

  return startYoutubeTranscriptFetchWithPrefetch({
    artifactId,
    url,
    processingToken,
    prefetchedRawText,
  });
}
