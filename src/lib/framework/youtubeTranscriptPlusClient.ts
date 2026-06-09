/**
 * Fetch YouTube captions in the browser (residential IP).
 * Supabase edge/datacenter IPs are blocked by YouTube for this path.
 */
import { transcriptPlusToTimedText } from "@/lib/framework/transcriptPlusFormat";

export type BrowserCaptionFetchResult = {
  text: string | null;
  error?: string;
};

export async function fetchYoutubeCaptionsInBrowser(videoId: string): Promise<BrowserCaptionFetchResult> {
  try {
    const { fetchTranscript } = await import("youtube-transcript-plus");
    const segments = await fetchTranscript(videoId, { lang: "en" });
    const text = transcriptPlusToTimedText(segments);
    return { text: text?.trim() ? text : null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: null, error: message };
  }
}
