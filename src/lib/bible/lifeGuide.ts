import { supabase } from "@/integrations/supabase/client";
import { getDefaultJournalId } from "@/lib/journal/journals";

export interface LifeGuidePassage {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  literal_meaning: string;
  do_this: string;
}

export interface LifeGuideResult {
  topic: string;
  summary: string;
  passages: LifeGuidePassage[];
  action_steps: string[];
  prayer: string;
}

export interface LifeGuideFollowUp {
  question: string;
  answer: string;
  action_hint?: string;
  new_passages?: LifeGuidePassage[];
}

export interface LifeGuideSession {
  id: string;
  issue: string;
  result: LifeGuideResult;
  followups: LifeGuideFollowUp[];
  createdAt: string;
}

export interface LifeGuideFollowUpResponse {
  answer: string;
  action_hint?: string;
  new_passages?: LifeGuidePassage[];
}

const LS_RECENT_KEY = "yb.lifeGuideRecent";
const MAX_RECENT = 12;

export function readRecentLifeGuides(): LifeGuideSession[] {
  try {
    const raw = localStorage.getItem(LS_RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LifeGuideSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT).map((s) => ({
      ...s,
      followups: Array.isArray(s.followups) ? s.followups : [],
    }));
  } catch {
    return [];
  }
}

export function pushRecentLifeGuide(
  issue: string,
  result: LifeGuideResult,
  followups: LifeGuideFollowUp[] = [],
): LifeGuideSession[] {
  const session: LifeGuideSession = {
    id: crypto.randomUUID(),
    issue,
    result,
    followups,
    createdAt: new Date().toISOString(),
  };
  const next = [session, ...readRecentLifeGuides().filter((s) => s.issue !== issue)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(LS_RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function updateRecentLifeGuideFollowups(
  issue: string,
  result: LifeGuideResult,
  followups: LifeGuideFollowUp[],
): LifeGuideSession[] {
  const existing = readRecentLifeGuides();
  const idx = existing.findIndex((s) => s.issue === issue);
  const session: LifeGuideSession = idx >= 0
    ? { ...existing[idx]!, result, followups }
    : {
      id: crypto.randomUUID(),
      issue,
      result,
      followups,
      createdAt: new Date().toISOString(),
    };
  const next = [session, ...existing.filter((s) => s.issue !== issue)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(LS_RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export async function fetchLifeGuide(issue: string, bibleId: string): Promise<LifeGuideResult> {
  const { data, error } = await supabase.functions.invoke("bible-life-guide", {
    body: { action: "search", issue: issue.trim(), bibleId },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as LifeGuideResult;
}

export async function fetchLifeGuideFollowUp(opts: {
  issue: string;
  bibleId: string;
  question: string;
  guide: LifeGuideResult;
  history: LifeGuideFollowUp[];
}): Promise<LifeGuideFollowUpResponse> {
  const { data, error } = await supabase.functions.invoke("bible-life-guide", {
    body: {
      action: "followup",
      issue: opts.issue.trim(),
      bibleId: opts.bibleId,
      question: opts.question.trim(),
      guide: opts.guide,
      history: opts.history.map((h) => ({ question: h.question, answer: h.answer })),
    },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as LifeGuideFollowUpResponse;
}

export function formatLifeGuideJournalBody(
  issue: string,
  result: LifeGuideResult,
  followups: LifeGuideFollowUp[] = [],
): string {
  const lines: string[] = [
    "## What I'm facing",
    issue,
    "",
    `## What Scripture says — ${result.topic}`,
    result.summary,
    "",
    "## Passages (literal instruction)",
  ];

  for (const p of result.passages) {
    lines.push(
      "",
      `### ${p.reference}`,
      `> ${p.text}`,
      "",
      `**Literal meaning:** ${p.literal_meaning}`,
      "",
      `**Do this:** ${p.do_this}`,
    );
  }

  if (result.action_steps.length > 0) {
    lines.push("", "## Action plan this week");
    for (const [i, step] of result.action_steps.entries()) {
      lines.push(`${i + 1}. ${step}`);
    }
  }

  if (result.prayer) {
    lines.push("", "## Prayer", result.prayer);
  }

  if (followups.length > 0) {
    lines.push("", "## Follow-up questions");
    for (const f of followups) {
      lines.push("", `**Q:** ${f.question}`, "", f.answer);
      if (f.action_hint) lines.push("", `*Do today:* ${f.action_hint}`);
      for (const p of f.new_passages ?? []) {
        lines.push("", `— ${p.reference}: ${p.do_this}`);
      }
    }
  }

  return lines.join("\n");
}

export async function saveLifeGuideToJournal(
  userId: string,
  issue: string,
  result: LifeGuideResult,
  followups: LifeGuideFollowUp[] = [],
): Promise<string> {
  const journalId = await getDefaultJournalId(userId);
  const body = formatLifeGuideJournalBody(issue, result, followups);
  const tag = result.topic.toLowerCase().replace(/\s+/g, "-").slice(0, 40);

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      journal_id: journalId,
      title: `Life Manual: ${result.topic}`,
      body,
      tags: ["life-manual", tag].filter(Boolean),
      entry_kind: "listening",
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Journal entry was not created");
  return data.id;
}

export async function saveLifeGuideToPlaybook(
  userId: string,
  issue: string,
  result: LifeGuideResult,
): Promise<string> {
  const scriptures = result.passages.map((p) => p.reference);
  const sourceSnippet = [
    issue.slice(0, 400),
    ...result.passages.slice(0, 3).map((p) => `${p.reference}: ${p.text.slice(0, 120)}`),
  ].join("\n");

  const { data: teaching, error: tErr } = await supabase
    .from("teachings")
    .insert({
      user_id: userId,
      title: `Life Manual: ${result.topic}`,
      category: "practice",
      status: "accepted",
      summary: result.summary,
      scriptures,
      source_snippet: sourceSnippet.slice(0, 220),
      decided_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (tErr) throw tErr;
  if (!teaching?.id) throw new Error("Teaching was not created");

  const steps = result.action_steps.map((text, i) => ({
    text,
    cadence: i === 0 ? "daily" : "weekly",
    done: false,
  }));

  const watchOuts = result.passages
    .slice(0, 4)
    .map((p) => `Don't skip ${p.reference} — ${p.literal_meaning.slice(0, 100)}`);

  const { data: playbook, error: pErr } = await supabase
    .from("playbook_items")
    .insert({
      user_id: userId,
      teaching_id: teaching.id,
      title: `Scripture: ${result.topic}`,
      why: result.summary,
      steps: steps as never,
      scriptures,
      watch_outs: watchOuts,
      status: "active",
    })
    .select("id")
    .maybeSingle();

  if (pErr) throw pErr;
  if (!playbook?.id) throw new Error("Playbook item was not created");
  return playbook.id;
}

export const LIFE_GUIDE_STARTERS = [
  "I'm anxious about money and the future",
  "Someone hurt me and I can't forgive them",
  "I'm tempted to lie to avoid trouble",
  "My marriage is struggling",
  "I lost my job and feel hopeless",
  "I'm angry and keep lashing out",
  "I feel alone and nobody understands",
  "I don't know how to parent my difficult child",
] as const;

export const LIFE_GUIDE_FOLLOWUP_PROMPTS = [
  "What should I do first today?",
  "Which verse applies most to my exact situation?",
  "What if I've already tried this and it didn't work?",
  "How do I obey this when I don't feel like it?",
] as const;
