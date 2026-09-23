import { supabase } from "@/integrations/supabase/client";

export type SceneNarrationResult = {
  audioUrl: string;
  storagePath: string;
  fingerprint: string;
  cached: boolean;
  voiceId: string;
  modelId: string;
};

export async function getOrCreateSceneNarration(input: {
  sceneId: string;
  text: string;
  voiceId?: string;
}): Promise<SceneNarrationResult> {
  const { data, error } = await supabase.functions.invoke("morning-scene-tts", {
    body: {
      scene_id: input.sceneId,
      text: input.text,
      ...(input.voiceId ? { voice_id: input.voiceId } : {}),
    },
  });

  if (error) throw error;
  if (!data?.audio_url || !data?.storage_path || !data?.fingerprint) {
    throw new Error(data?.error || "Scene narration was not created");
  }

  return {
    audioUrl: String(data.audio_url),
    storagePath: String(data.storage_path),
    fingerprint: String(data.fingerprint),
    cached: Boolean(data.cached),
    voiceId: String(data.voice_id || ""),
    modelId: String(data.model_id || ""),
  };
}
