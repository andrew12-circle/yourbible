import { supabase } from "@/integrations/supabase/client";

export async function fetchYouTubeAudioStreamUrl(videoId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    "framework-youtube-audio-url",
    { body: { video_id: videoId } },
  );
  if (error || !data?.url) return null;
  return data.url;
}
