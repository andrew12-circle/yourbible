/** Reflect-style workbook stored in `living_hope_workbook.content`. */

export interface IncomeLine {
  id: string;
  label: string;
  amount: string;
  priority?: number;
}

export interface WorkbookStory {
  id: string;
  text: string;
}

export interface WorkbookManifestoItem {
  id: string;
  text: string;
}

export interface WorkbookQuote {
  id: string;
  text: string;
}

export interface WorkbookRoutineItem {
  id: string;
  label: string;
  detail?: string;
}

export interface WorkbookBusinessTarget {
  id: string;
  name: string;
  kpis: string[];
}

export interface WorkbookMetric {
  id: string;
  label: string;
  unit?: string;
}

export interface LivingHopeWorkbookContent {
  vision_headline: string;
  vision_tagline: string;
  income_lines: IncomeLine[];
  income_total_label: string;
  stories: WorkbookStory[];
  manifesto: WorkbookManifestoItem[];
  quotes: WorkbookQuote[];
  lifestyle: string[];
  routine: WorkbookRoutineItem[];
  business_targets: WorkbookBusinessTarget[];
  financial_standards: string[];
  family_leadership: string[];
  rules_of_operation: string[];
  weekly_questions: string[];
  metrics: WorkbookMetric[];
}

export type WorkbookSection =
  | "vision"
  | "stories"
  | "manifesto"
  | "quotes"
  | "lifestyle"
  | "routine"
  | "business"
  | "standards"
  | "family"
  | "rules"
  | "weekly"
  | "metrics";

export type WorkbookPhase = "anchor" | "see" | "move";

export const WORKBOOK_PHASES: {
  key: WorkbookPhase;
  label: string;
  scripture: string;
  description: string;
}[] = [
  { key: "anchor", label: "Anchor", scripture: "Rom 12:2", description: "Identity — who God is making you" },
  { key: "see", label: "See", scripture: "Hab 2:2", description: "Vision — write it plainly" },
  { key: "move", label: "Move", scripture: "James 2:17", description: "Structure — how you build" },
];

export const WORKBOOK_SECTIONS: {
  key: WorkbookSection;
  label: string;
  hint: string;
  phase: WorkbookPhase;
  ritualOrder?: number;
}[] = [
  { key: "manifesto", label: "Manifesto", hint: "Who you are becoming — submitted to God.", phase: "anchor", ritualOrder: 1 },
  { key: "quotes", label: "Quotes", hint: "Anchors that pull you forward.", phase: "anchor" },
  { key: "vision", label: "Vision & income", hint: "Forward-only. Structure, not fantasy.", phase: "see", ritualOrder: 2 },
  { key: "stories", label: "Daily stories", hint: "Scenes to visualize each morning.", phase: "see", ritualOrder: 3 },
  { key: "lifestyle", label: "Lifestyle vision", hint: "Homes, margin, freedom, giving.", phase: "see" },
  { key: "family", label: "Family & leadership", hint: "Present, spiritual, legacy.", phase: "see" },
  { key: "routine", label: "Daily routine", hint: "Protect energy like capital.", phase: "move" },
  { key: "business", label: "Business targets", hint: "Operational KPIs per venture.", phase: "move" },
  { key: "standards", label: "Financial standards", hint: "Reserves, no scarcity mindset.", phase: "move" },
  { key: "rules", label: "Rules of operation", hint: "How you decide and build.", phase: "move" },
  { key: "weekly", label: "Weekly review", hint: "Sunday questions — move the machine.", phase: "move" },
  { key: "metrics", label: "Metrics", hint: "Track revenue, conversion, energy.", phase: "move" },
];

export function newId(): string {
  return crypto.randomUUID();
}

export function emptyWorkbook(): LivingHopeWorkbookContent {
  return {
    vision_headline: "",
    vision_tagline: "Not fantasy. Structure.",
    income_lines: [],
    income_total_label: "",
    stories: [],
    manifesto: [],
    quotes: [],
    lifestyle: [],
    routine: [],
    business_targets: [],
    financial_standards: [],
    family_leadership: [],
    rules_of_operation: [],
    weekly_questions: [
      "Did I move the machine forward?",
      "Did I avoid fear-based decisions?",
      "What bottleneck must be removed this week?",
      "Where did I leak time?",
      "What is the single highest leverage move next week?",
    ],
    metrics: [],
  };
}

export function mergeWorkbook(raw: unknown): LivingHopeWorkbookContent {
  const base = emptyWorkbook();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    ...base,
    vision_headline: String(o.vision_headline ?? base.vision_headline),
    vision_tagline: String(o.vision_tagline ?? base.vision_tagline),
    income_total_label: String(o.income_total_label ?? base.income_total_label),
    income_lines: parseIncomeLines(o.income_lines),
    stories: parseTextItems(o.stories, "text"),
    manifesto: parseTextItems(o.manifesto, "text"),
    quotes: parseTextItems(o.quotes, "text"),
    lifestyle: parseStringList(o.lifestyle),
    routine: parseRoutine(o.routine),
    business_targets: parseBusiness(o.business_targets),
    financial_standards: parseStringList(o.financial_standards),
    family_leadership: parseStringList(o.family_leadership),
    rules_of_operation: parseStringList(o.rules_of_operation),
    weekly_questions: parseStringList(o.weekly_questions).length
      ? parseStringList(o.weekly_questions)
      : base.weekly_questions,
    metrics: parseMetrics(o.metrics),
  };
}

function parseIncomeLines(raw: unknown): IncomeLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      id: String(x.id ?? newId()),
      label: String(x.label ?? ""),
      amount: String(x.amount ?? ""),
      priority: typeof x.priority === "number" ? x.priority : undefined,
    }));
}

function parseTextItems(raw: unknown, field: string): { id: string; text: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      id: String(x.id ?? newId()),
      text: String(x[field] ?? ""),
    }));
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => String(s)).filter((s) => s.length > 0);
}

function parseRoutine(raw: unknown): WorkbookRoutineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      id: String(x.id ?? newId()),
      label: String(x.label ?? ""),
      detail: x.detail ? String(x.detail) : undefined,
    }));
}

function parseBusiness(raw: unknown): WorkbookBusinessTarget[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      id: String(x.id ?? newId()),
      name: String(x.name ?? ""),
      kpis: Array.isArray(x.kpis) ? x.kpis.map((k) => String(k)) : [],
    }));
}

function parseMetrics(raw: unknown): WorkbookMetric[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      id: String(x.id ?? newId()),
      label: String(x.label ?? ""),
      unit: x.unit ? String(x.unit) : undefined,
    }));
}

/** ISO Monday of the week containing `d`. */
export function weekStartISO(d = new Date()): string {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const dayStr = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayStr}`;
}
