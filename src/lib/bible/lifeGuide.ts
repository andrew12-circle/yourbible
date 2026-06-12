import { supabase } from "@/integrations/supabase/client";

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

export interface LifeGuideSession {
  id: string;
  issue: string;
  result: LifeGuideResult;
  createdAt: string;
}

const LS_RECENT_KEY = "yb.lifeGuideRecent";
const MAX_RECENT = 12;

export function readRecentLifeGuides(): LifeGuideSession[] {
  try {
    const raw = localStorage.getItem(LS_RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LifeGuideSession[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function pushRecentLifeGuide(issue: string, result: LifeGuideResult): LifeGuideSession[] {
  const session: LifeGuideSession = {
    id: crypto.randomUUID(),
    issue,
    result,
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

export async function fetchLifeGuide(issue: string, bibleId: string): Promise<LifeGuideResult> {
  const { data, error } = await supabase.functions.invoke("bible-life-guide", {
    body: { issue: issue.trim(), bibleId },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as LifeGuideResult;
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
