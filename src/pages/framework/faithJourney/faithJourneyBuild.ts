import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookMarked,
  CheckCircle2,
  FileStack,
  FileText,
  MessageSquare,
  Mic,
  PenLine,
  Sparkles,
  Users,
  Youtube,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { LAYER_META, type FrameworkLayer } from "@/data/framework";
import type { JourneyCategory, JourneyCluster, JourneyEvent } from "./faithJourneyTypes";

const MS_DAY = 24 * 60 * 60 * 1000;
const VERSION_WINDOW_MS = 7 * MS_DAY;
export const CLUSTER_WINDOW_MS = 18 * 60 * 60 * 1000;

const JOURNAL_AMBER = "#D97706";
const INFLUENCE_INDIGO = "#6366F1";
const TENSION_OPEN_AMBER = "#F59E0B";
const TENSION_RESOLVED_GREEN = "#22C55E";

const ARTIFACT_TONES: Record<string, string> = {
  youtube: "#DC2626",
  pdf: "#475569",
  chat_export: "#7C3AED",
  voice: "#16A34A",
  audio: "#16A34A",
  text: "#2563EB",
  text_file: "#2563EB",
  podcast: "#0D9488",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function statementFromSnapshot(snapshot: Json): string | null {
  if (!isRecord(snapshot)) return null;
  const st = snapshot.statement;
  return typeof st === "string" ? st : null;
}

function layerFromSnapshot(snapshot: Json): FrameworkLayer | null {
  if (!isRecord(snapshot)) return null;
  const l = snapshot.layer;
  if (l === "foundations" || l === "life" || l === "mechanics" || l === "emotional") return l;
  return null;
}

export function artifactTone(kind: string): string {
  return ARTIFACT_TONES[kind] ?? "#64748B";
}

function artifactIcon(kind: string): LucideIcon {
  if (kind === "youtube") return Youtube;
  if (kind === "chat_export") return MessageSquare;
  if (kind === "voice" || kind === "audio" || kind === "podcast") return Mic;
  if (kind === "pdf" || kind === "text_file") return FileText;
  return FileStack;
}

function asLayer(layer: string): FrameworkLayer {
  if (layer === "foundations" || layer === "life" || layer === "mechanics" || layer === "emotional") {
    return layer;
  }
  return "foundations";
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function journalTimestamp(entryAtTs: string | null, createdAt: string): number {
  if (entryAtTs && entryAtTs.trim()) {
    const n = new Date(entryAtTs).getTime();
    if (!Number.isNaN(n)) return n;
  }
  return new Date(createdAt).getTime();
}

export type BeliefNodeRow = {
  id: string;
  layer: string;
  topic: string;
  statement: string;
  created_at: string;
};

export type BeliefVersionRow = {
  id: string;
  belief_id: string;
  created_at: string;
  snapshot: Json;
};

export type JournalRow = {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string | null;
  created_at: string;
};

export type ArtifactRow = {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  created_at: string;
};

export type BeliefSourceRow = {
  id: string;
  belief_id: string;
  source_type: string;
  label: string;
  created_at: string;
};

export type BeliefTensionRow = {
  id: string;
  status: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

function dedupeVersionsByBeliefAndWindow(versions: BeliefVersionRow[]): BeliefVersionRow[] {
  const byBelief = new Map<string, BeliefVersionRow[]>();
  for (const v of versions) {
    const arr = byBelief.get(v.belief_id) ?? [];
    arr.push(v);
    byBelief.set(v.belief_id, arr);
  }
  const out: BeliefVersionRow[] = [];
  for (const [, rows] of byBelief) {
    const sorted = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let lastKept = -Infinity;
    for (const v of sorted) {
      const t = new Date(v.created_at).getTime();
      if (lastKept < 0 || t - lastKept >= VERSION_WINDOW_MS) {
        out.push(v);
        lastKept = t;
      }
    }
  }
  return out;
}

function influenceKey(sourceType: string, label: string): string {
  return `${sourceType}\u0000${label.trim().toLowerCase()}`;
}

export function buildJourneyEvents(input: {
  beliefs: BeliefNodeRow[];
  beliefVersions: BeliefVersionRow[];
  journals: JournalRow[];
  artifacts: ArtifactRow[];
  beliefSources: BeliefSourceRow[];
  tensions: BeliefTensionRow[];
}): JourneyEvent[] {
  const beliefLayer = new Map<string, FrameworkLayer>();
  for (const b of input.beliefs) {
    beliefLayer.set(b.id, asLayer(b.layer));
  }

  const events: JourneyEvent[] = [];

  for (const b of input.beliefs) {
    const layer = asLayer(b.layer);
    const t = new Date(b.created_at).getTime();
    events.push({
      kind: "belief_created",
      id: `belief:${b.id}`,
      timestamp: t,
      title: truncate(b.statement || b.topic, 72),
      subtitle: b.topic,
      color: LAYER_META[layer].tone,
      icon: Sparkles,
      link: `/framework/beliefs/${b.id}`,
      category: "beliefs",
      beliefId: b.id,
      layer,
    });
  }

  const cappedVersions = dedupeVersionsByBeliefAndWindow(input.beliefVersions);
  for (const v of cappedVersions) {
    const layer = beliefLayer.get(v.belief_id) ?? "foundations";
    const st = statementFromSnapshot(v.snapshot);
    const t = new Date(v.created_at).getTime();
    const snapLayer = layerFromSnapshot(v.snapshot);
    const useLayer = snapLayer ?? layer;
    events.push({
      kind: "belief_refined",
      id: `belief-version:${v.id}`,
      timestamp: t,
      title: "Belief refined",
      subtitle: truncate(st ?? "Updated belief", 80),
      color: LAYER_META[useLayer].tone,
      icon: PenLine,
      link: `/framework/beliefs/${v.belief_id}`,
      category: "beliefs",
      beliefId: v.belief_id,
      layer: useLayer,
      versionId: v.id,
    });
  }

  for (const j of input.journals) {
    const t = journalTimestamp(j.entry_at_ts, j.created_at);
    const title = (j.title && j.title.trim()) || truncate(j.body.replace(/\s+/g, " "), 56);
    events.push({
      kind: "journal",
      id: `journal:${j.id}`,
      timestamp: t,
      title,
      subtitle: "Journal entry",
      color: JOURNAL_AMBER,
      icon: BookMarked,
      link: `/journal/${j.id}`,
      category: "journal",
      entryId: j.id,
    });
  }

  for (const a of input.artifacts) {
    const t = new Date(a.created_at).getTime();
    const title = (a.title && a.title.trim()) || `${a.kind} artifact`;
    events.push({
      kind: "artifact",
      id: `artifact:${a.id}`,
      timestamp: t,
      title: truncate(title, 72),
      subtitle: a.status === "ready" ? "Artifact" : `Artifact · ${a.status}`,
      color: artifactTone(a.kind),
      icon: artifactIcon(a.kind),
      link: `/framework/artifacts/${a.id}`,
      category: "artifacts",
      artifactId: a.id,
      artifactKind: a.kind,
    });
  }

  const seenInfluence = new Set<string>();
  const sortedSources = [...input.beliefSources].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  for (const s of sortedSources) {
    const key = influenceKey(s.source_type, s.label);
    if (seenInfluence.has(key)) continue;
    seenInfluence.add(key);
    const t = new Date(s.created_at).getTime();
    events.push({
      kind: "influence",
      id: `influence:${key}`,
      timestamp: t,
      title: truncate(s.label, 72),
      subtitle: `Influence · ${s.source_type}`,
      color: INFLUENCE_INDIGO,
      icon: Users,
      link: `/framework/beliefs/${s.belief_id}`,
      category: "influences",
      sourceKey: key,
      beliefId: s.belief_id,
      sourceType: s.source_type,
    });
  }

  for (const ten of input.tensions) {
    const tOpen = new Date(ten.created_at).getTime();
    events.push({
      kind: "tension_open",
      id: `tension-open:${ten.id}`,
      timestamp: tOpen,
      title: "Tension noticed",
      subtitle: truncate(ten.summary, 80),
      color: TENSION_OPEN_AMBER,
      icon: AlertTriangle,
      link: "/framework/tensions",
      category: "tensions",
      tensionId: ten.id,
    });
    if (ten.status === "resolved") {
      const tRes = new Date(ten.updated_at).getTime();
      if (!Number.isNaN(tRes) && tRes > tOpen) {
        events.push({
          kind: "tension_resolved",
          id: `tension-resolved:${ten.id}`,
          timestamp: tRes,
          title: "Tension resolved",
          subtitle: truncate(ten.summary, 80),
          color: TENSION_RESOLVED_GREEN,
          icon: CheckCircle2,
          link: "/framework/tensions",
          category: "tensions",
          tensionId: ten.id,
        });
      }
    }
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

export function clusterJourneyEvents(events: JourneyEvent[], windowMs: number = CLUSTER_WINDOW_MS): JourneyCluster[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const clusters: JourneyCluster[] = [];
  let cur: JourneyEvent[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const e = sorted[i]!;
    const prev = cur[cur.length - 1]!;
    if (e.timestamp - prev.timestamp <= windowMs) {
      cur.push(e);
    } else {
      clusters.push(makeCluster(cur));
      cur = [e];
    }
  }
  clusters.push(makeCluster(cur));
  return clusters;
}

function makeCluster(events: JourneyEvent[]): JourneyCluster {
  const anchorMs = events.reduce((s, e) => s + e.timestamp, 0) / events.length;
  const first = events[0]!;
  const id = `c-${Math.round(anchorMs)}-${first.id}-${events.length}`;
  return { id, anchorMs, events };
}

export function filterEventsByCategories(events: JourneyEvent[], on: Record<JourneyCategory, boolean>): JourneyEvent[] {
  return events.filter((e) => on[e.category]);
}

export function uniqueInfluenceCount(sources: BeliefSourceRow[]): number {
  const seen = new Set<string>();
  for (const s of sources) {
    seen.add(influenceKey(s.source_type, s.label));
  }
  return seen.size;
}

export function paddedTimeRangeFromClusters(
  clusters: JourneyCluster[],
  padRatio = 0.07,
): { min: number; max: number } {
  if (clusters.length === 0) {
    const n = Date.now();
    return { min: n - MS_DAY * 45, max: n + MS_DAY };
  }
  const times = clusters.flatMap((c) => c.events.map((e) => e.timestamp));
  const minT = Math.min(...times);
  let maxT = Math.max(...times);
  if (maxT <= minT) maxT = minT + MS_DAY;
  const span = maxT - minT;
  const pad = Math.max(span * padRatio, MS_DAY * 2);
  return { min: minT - pad, max: maxT + pad };
}
