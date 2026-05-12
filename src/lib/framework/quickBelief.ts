import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface BeliefClassification {
  layer: "foundations" | "life" | "mechanics" | "emotional";
  topic: string;
  statement: string;
  confidence: number;
  tags: string[];
  related: { belief_id: string; relation: "agree" | "refines" | "conflicts"; severity?: number; note?: string }[];
  is_duplicate_of: string | null;
}

export async function classifyBelief(rawText: string, source?: string) {
  const { data, error } = await supabase.functions.invoke("framework-classify-belief", {
    body: { raw_text: rawText, source },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).classification as BeliefClassification;
}

/** Optional row filed under Influences (grouped `belief_sources` by type + label). */
export interface BeliefInfluenceAttachment {
  source_type: string;
  label: string;
  artifact_id?: string | null;
  metadata?: Json;
}

export interface SaveBeliefOptions {
  rawText: string;
  source?: string;
  classification: BeliefClassification;
  userId: string;
  /** e.g. YouTube channel when capturing a belief from a video / podcast episode */
  influenceAttachment?: BeliefInfluenceAttachment | null;
}

/** Saves the belief, sources, links and tensions. Returns the new belief id. */
export async function saveClassifiedBelief(opts: SaveBeliefOptions): Promise<string> {
  const { rawText, source, classification: c, userId, influenceAttachment } = opts;

  const { data: inserted, error: insErr } = await supabase
    .from("belief_nodes")
    .insert({
      user_id: userId,
      layer: c.layer,
      topic: c.topic,
      statement: c.statement,
      answer: rawText,
      confidence: c.confidence,
      tags: c.tags,
      is_core: false,
    })
    .select("id")
    .single();
  if (insErr || !inserted) throw insErr ?? new Error("Could not save belief");
  const beliefId = inserted.id as string;

  if (source && source.trim()) {
    await supabase.from("belief_sources").insert({
      user_id: userId,
      belief_id: beliefId,
      source_type: "quick_capture",
      label: source.trim().slice(0, 200),
    });
  }

  if (influenceAttachment?.label?.trim()) {
    const label = influenceAttachment.label.trim().slice(0, 200);
    const st = (influenceAttachment.source_type ?? "podcast").trim().slice(0, 64) || "podcast";
    const { error: infErr } = await supabase.from("belief_sources").insert({
      user_id: userId,
      belief_id: beliefId,
      source_type: st,
      label,
      artifact_id: influenceAttachment.artifact_id ?? null,
      metadata: (influenceAttachment.metadata ?? {}) as Json,
    });
    if (infErr) {
      await supabase.from("belief_nodes").delete().eq("id", beliefId).eq("user_id", userId);
      throw infErr;
    }
  }

  const linkRows = c.related
    .filter((r) => r.relation === "agree" || r.relation === "refines")
    .map((r) => ({
      user_id: userId,
      a_id: beliefId,
      b_id: r.belief_id,
      relation: r.relation === "refines" ? "refines" : "related",
    }));
  if (linkRows.length) {
    await supabase.from("belief_links").insert(linkRows);
  }

  const tensionRows = c.related
    .filter((r) => r.relation === "conflicts")
    .map((r) => ({
      user_id: userId,
      a_id: beliefId,
      b_id: r.belief_id,
      severity: typeof r.severity === "number" ? r.severity : 60,
      summary: r.note ?? "Possible conflict surfaced by quick belief capture.",
      layer: c.layer,
      status: "open" as const,
    }));
  if (tensionRows.length) {
    await supabase.from("belief_tensions").insert(tensionRows);
  }

  return beliefId;
}