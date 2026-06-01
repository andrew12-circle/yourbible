import { supabase } from "@/integrations/supabase/client";

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

export function createTranscriptProcessingToken(): string {
  return crypto.randomUUID();
}

export async function markYoutubeTranscriptFetchError(artifactId: string, message: string): Promise<void> {
  await supabase
    .from("artifacts")
    .update({ status: "error", error: message })
    .eq("id", artifactId);
}

export async function startYoutubeTranscriptFetch({
  artifactId,
  url,
  processingToken,
  markError = true,
}: StartYoutubeTranscriptFetchParams): Promise<TranscriptFetchResult> {
  try {
    const { data, error } = await supabase.functions.invoke("framework-fetch-transcript", {
      body: { artifact_id: artifactId, url, processing_token: processingToken },
    });
    if (error) throw error;
    const payloadError = responseError(data);
    if (payloadError) throw new Error(payloadError);
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
  const processingToken = createTranscriptProcessingToken();
  const { error } = await supabase
    .from("artifacts")
    .update({ status: "fetching", error: null, processing_token: processingToken })
    .eq("id", artifactId);
  if (error) {
    return { ok: false, error: `Could not queue transcript fetch: ${error.message}` };
  }
  return startYoutubeTranscriptFetch({ artifactId, url, processingToken });
}
