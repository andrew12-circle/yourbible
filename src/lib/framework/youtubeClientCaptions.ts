import { resolveYoutubeCaptionsViaEdge } from "@/lib/framework/youtubeEdgeCaptions";
import { fetchYoutubeCaptionsViaInvidious } from "@/lib/framework/youtubeInvidiousCaptions";
import { fetchYoutubeCaptionsInBrowser } from "@/lib/framework/youtubeTranscriptPlusClient";

export type ClientCaptionResolveResult = {
  text: string | null;
  attempts: string[];
};

/** Pull captions before the full transcript job runs (edge worker/race, then browser fallbacks). */
export async function resolveClientYoutubeCaptions(videoId: string): Promise<ClientCaptionResolveResult> {
  const attempts: string[] = [];

  const edge = await resolveYoutubeCaptionsViaEdge(videoId);
  attempts.push(...edge.attempts);
  if (edge.text?.trim()) {
    return { text: edge.text.trim(), attempts };
  }

  const browser = await fetchYoutubeCaptionsInBrowser(videoId);
  if (browser.text?.trim()) {
    return { text: browser.text.trim(), attempts: [...attempts, "browser: ok"] };
  }
  attempts.push(`browser: ${browser.error?.trim() || "empty"}`);

  const invidious = await fetchYoutubeCaptionsViaInvidious(videoId);
  if (invidious?.trim()) {
    return { text: invidious.trim(), attempts: [...attempts, "invidious: ok"] };
  }
  attempts.push("invidious: empty");

  return { text: null, attempts };
}
