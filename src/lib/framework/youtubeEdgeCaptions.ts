import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export type EdgeCaptionResolveResult = {
  text: string | null;
  source?: string;
  attempts: string[];
};

/** Resolve captions via edge (worker + server tiers). Browser YouTube fetch is CORS-blocked. */
export async function resolveYoutubeCaptionsViaEdge(videoId: string): Promise<EdgeCaptionResolveResult> {
  const attempts: string[] = [];
  const { data, error } = await supabase.functions.invoke("framework-prefetch-youtube-captions", {
    body: { video_id: videoId },
  });

  if (error) {
    const msg = await edgeFunctionErrorMessage("framework-prefetch-youtube-captions", error, data);
    attempts.push(`edge: ${msg}`);
    return { text: null, attempts };
  }

  if (data && typeof data === "object" && "text" in data) {
    const text = (data as { text?: unknown }).text;
    const source = (data as { source?: unknown }).source;
    if (typeof text === "string" && text.trim()) {
      return {
        text: text.trim(),
        source: typeof source === "string" ? source : undefined,
        attempts: [`edge: ${typeof source === "string" ? source : "ok"}`],
      };
    }
  }

  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    attempts.push(`edge: ${typeof err === "string" ? err : "no captions"}`);
  } else {
    attempts.push("edge: empty response");
  }

  return { text: null, attempts };
}
