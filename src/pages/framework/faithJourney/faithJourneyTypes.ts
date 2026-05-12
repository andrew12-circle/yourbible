import type { LucideIcon } from "lucide-react";
import type { FrameworkLayer } from "@/data/framework";

/** Filter chips / legend categories */
export type JourneyCategory = "beliefs" | "journal" | "artifacts" | "influences" | "tensions";

type JourneyEventCommon = {
  id: string;
  timestamp: number;
  title: string;
  subtitle?: string;
  color: string;
  icon: LucideIcon;
  link: string;
  category: JourneyCategory;
};

export type JourneyEventBeliefCreated = JourneyEventCommon & {
  kind: "belief_created";
  beliefId: string;
  layer: FrameworkLayer;
};

export type JourneyEventBeliefRefined = JourneyEventCommon & {
  kind: "belief_refined";
  beliefId: string;
  layer: FrameworkLayer;
  versionId: string;
};

export type JourneyEventJournal = JourneyEventCommon & {
  kind: "journal";
  entryId: string;
};

export type JourneyEventArtifact = JourneyEventCommon & {
  kind: "artifact";
  artifactId: string;
  artifactKind: string;
};

export type JourneyEventInfluence = JourneyEventCommon & {
  kind: "influence";
  sourceKey: string;
  beliefId: string;
  sourceType: string;
};

export type JourneyEventTensionOpen = JourneyEventCommon & {
  kind: "tension_open";
  tensionId: string;
};

export type JourneyEventTensionResolved = JourneyEventCommon & {
  kind: "tension_resolved";
  tensionId: string;
};

export type JourneyEvent =
  | JourneyEventBeliefCreated
  | JourneyEventBeliefRefined
  | JourneyEventJournal
  | JourneyEventArtifact
  | JourneyEventInfluence
  | JourneyEventTensionOpen
  | JourneyEventTensionResolved;

export type JourneyCluster = {
  id: string;
  /** Anchor time on spine (ms) */
  anchorMs: number;
  events: JourneyEvent[];
};

export const JOURNEY_CATEGORY_LABELS: Record<JourneyCategory, string> = {
  beliefs: "Beliefs",
  journal: "Journal",
  artifacts: "Artifacts",
  influences: "Influences",
  tensions: "Tensions",
};
