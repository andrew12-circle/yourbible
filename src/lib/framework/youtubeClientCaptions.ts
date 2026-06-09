import { fetchYoutubeCaptionsViaInvidious } from "@/lib/framework/youtubeInvidiousCaptions";
import { fetchYoutubeCaptionsInBrowser } from "@/lib/framework/youtubeTranscriptPlusClient";

export type ClientCaptionResolveResult = {
  text: string | null;
  attempts: string[];
};

/** Pull captions from the user's browser (residential IP) before hitting blocked edge servers. */
export async function resolveClientYoutubeCaptions(videoId: string): Promise<ClientCaptionResolveResult> {
  const attempts: string[] = [];

  const browser = await fetchYoutubeCaptionsInBrowser(videoId);
  if (browser.text?.trim()) {
    return { text: browser.text.trim(), attempts: ["browser: ok"] };
  }
  attempts.push(`browser: ${browser.error?.trim() || "empty"}`);

  const invidious = await fetchYoutubeCaptionsViaInvidious(videoId);
  if (invidious?.trim()) {
    return { text: invidious.trim(), attempts: [...attempts, "invidious: ok"] };
  }
  attempts.push("invidious: empty");

  return { text: null, attempts };
}
