import { supabase } from "@/integrations/supabase/client";

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

export interface SaveBeliefOptions {
  rawText: string;
  source?: string;
  classification: BeliefClassification;
  userId: string;
}

/** Saves the belief, sources, links and tensions. Returns the new belief id. */
export async function saveClassifiedBelief(opts: SaveBeliefOptions): Promise<string> {
  const { rawText, source, classification: c, userId } = opts;

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