/**
 * Fetch YouTube captions in the browser (residential IP).
 * Supabase edge/datacenter IPs are blocked by YouTube for this path.
 */
import { transcriptPlusToTimedText } from "@/lib/framework/transcriptPlusFormat";

export async function fetchYoutubeCaptionsInBrowser(videoId: string): Promise<string | null> {
  try {
    const { fetchTranscript } = await import("youtube-transcript-plus");
    const segments = await fetchTranscript(videoId, { lang: "en" });
    return transcriptPlusToTimedText(segments);
  } catch {
    return null;
  }
}
