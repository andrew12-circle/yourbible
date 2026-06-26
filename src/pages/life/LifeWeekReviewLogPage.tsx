import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { BookOpen, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  LIFE_WEEK_REVIEW_SUBJECTS,
  listAllLifeWeekReviews,
  type LifeWeekReviewSubject,
} from "@/lib/lifeWeekReview";
import {
  countGroupedSubjects,
  groupLifeWeekReviews,
  subjectDisplayName,
  type LifeWeekReviewGroup,
} from "@/lib/lifeWeekReviewLog";
import {
  syncLifeWeekReviewToJournal,
} from "@/lib/lifeWeekReviewJournal";
import { formatLifeWeekRange } from "@/lib/lifeWeeks";
import { parseFamilyFromLayout } from "@/lib/lifeWeeksFamily";
import MobilePageShell from "@/components/shell/MobilePageShell";
import { HubPageLayout } from "@/components/shell/HubPageLayout";
import { cn } from "@/lib/utils";
import { mobileCenteredScreen } from "@/lib/shell/mobileShellClasses";

type Synopsis = {
  title: string;
  summary: string;
  patterns: { heading: string; body: string }[];
  opportunities: string[];
  questions: string[];
};

function formatClosedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function ReviewGroupCard({
  group,
  names,
  birthDates,
}: {
  group: LifeWeekReviewGroup;
  names: Partial<Record<LifeWeekReviewSubject, string>>;
  birthDates: Partial<Record<LifeWeekReviewSubject, string>>;
}) {
  const subjectCount = countGroupedSubjects(group);
  const selfEntry = group.entries.self;

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Closed {formatClosedDate(group.completedAt)}
          </p>
          {selfEntry && birthDates.self && (
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatLifeWeekRange(birthDates.self, selfEntry.week_index)}
            </p>
          )}
        </div>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
          {subjectCount} of {LIFE_WEEK_REVIEW_SUBJECTS.length} reflections
        </span>
      </div>

      <ul className="mt-4 space-y-4">
        {LIFE_WEEK_REVIEW_SUBJECTS.map((subject) => {
          const entry = group.entries[subject];
          if (!entry) return null;
          const birth = birthDates[subject];
          const rangeLabel =
            birth != null ? formatLifeWeekRange(birth, entry.week_index) : entry.week_start;
          return (
            <li key={subject} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-3">
              <p className="text-xs font-semibold text-foreground">
                {subjectDisplayName(subject, names)}
              </p>
              <p className="text-[11px] text-muted-foreground">{rangeLabel}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {entry.reflection}
              </p>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function LifeWeekReviewLogContent() {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(true);
  const [groups, setGroups] = useState<LifeWeekReviewGroup[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [synopsis, setSynopsis] = useState<Synopsis | null>(null);
  const [syncing, setSyncing] = useState(false);

  const familyMembers = useMemo(() => parseFamilyFromLayout(profile?.layout), [profile?.layout]);
  const names = useMemo((): Partial<Record<LifeWeekReviewSubject, string>> => {
    const map: Partial<Record<LifeWeekReviewSubject, string>> = {
      self: profile?.display_name?.trim() || "Me",
    };
    for (const member of familyMembers) {
      map[member.id] = member.name;
    }
    return map;
  }, [profile?.display_name, familyMembers]);

  const birthDates = useMemo((): Partial<Record<LifeWeekReviewSubject, string>> => {
    const map: Partial<Record<LifeWeekReviewSubject, string>> = {};
    if (profile?.date_of_birth) map.self = profile.date_of_birth;
    for (const member of familyMembers) {
      if (member.birthDate) map[member.id] = member.birthDate;
    }
    return map;
  }, [profile?.date_of_birth, familyMembers]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const entries = await listAllLifeWeekReviews(user.id);
      setGroups(groupLifeWeekReviews(entries));
    } catch (e) {
      toast({
        title: "Couldn't load week reviews",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const analyze = async () => {
    setAnalyzing(true);
    const entries = await listAllLifeWeekReviews(user!.id);
    const reviews = entries.map((e) => ({
      subject: e.subject,
      person: subjectDisplayName(e.subject, names),
      week_start: e.week_start,
      week_index: e.week_index,
      reflection: e.reflection,
      completed_at: e.completed_at,
    }));
    const { data, error } = await supabase.functions.invoke<Synopsis & { ok?: boolean; error?: string }>(
      "life-week-review-analyze",
      { body: { weeks: 12, reviews } },
    );
    setAnalyzing(false);
    if (error || data?.error) {
      toast({
        title: "Analysis failed",
        description: error?.message ?? data?.error ?? "Try again after more close-outs.",
        variant: "destructive",
      });
      return;
    }
    if (data) {
      setSynopsis(data);
      toast({ title: "Synopsis ready" });
    }
  };

  const syncAllToJournal = async () => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      let synced = 0;
      for (const group of groups) {
        for (const subject of LIFE_WEEK_REVIEW_SUBJECTS) {
          const entry = group.entries[subject];
          if (!entry) continue;
          const birth = birthDates[subject];
          const weekRangeLabel =
            birth != null ? formatLifeWeekRange(birth, entry.week_index) : entry.week_start;
          await syncLifeWeekReviewToJournal(user.id, {
            subject,
            personName: subjectDisplayName(subject, names),
            weekIndex: entry.week_index,
            weekNumber: entry.week_index + 1,
            weekRangeLabel,
            weekStart: entry.week_start,
            reflection: entry.reflection,
            completedAt: entry.completed_at,
          });
          synced += 1;
        }
      }
      toast({
        title: synced ? "Synced to journal" : "Nothing to sync",
        description: synced
          ? `${synced} reflection${synced === 1 ? "" : "s"} saved to Week reviews.`
          : undefined,
      });
    } catch (e) {
      toast({
        title: "Sync failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (busy) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-prose text-sm text-muted-foreground">
          Every time you close out a week — for yourself, Lilly, or Caroline — your reflection
          lands here. Look back at what you said, then ask AI for patterns in how you&apos;re
          spending your time.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void syncAllToJournal()} disabled={syncing || groups.length === 0}>
            {syncing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <BookOpen className="mr-1 h-3.5 w-3.5" />}
            Sync to journal
          </Button>
          <Button type="button" size="sm" onClick={() => void analyze()} disabled={analyzing || groups.length < 1}>
            <Sparkles className={cn("mr-1 h-3.5 w-3.5", analyzing && "animate-pulse")} />
            {analyzing ? "Analyzing…" : "AI synopsis"}
          </Button>
        </div>
      </div>

      {synopsis && (
        <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold">{synopsis.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{synopsis.summary}</p>
          {synopsis.patterns?.length > 0 && (
            <ul className="mt-4 space-y-3">
              {synopsis.patterns.map((p) => (
                <li key={p.heading}>
                  <p className="text-sm font-medium">{p.heading}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                </li>
              ))}
            </ul>
          )}
          {synopsis.opportunities?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Try next</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {synopsis.opportunities.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          {synopsis.questions?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sit with</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm italic text-muted-foreground">
                {synopsis.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          <BookOpen className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>No week close-outs yet.</p>
          <p className="mt-1">When a new week starts, you&apos;ll be prompted to reflect on the week that just ended.</p>
          <Button type="button" variant="link" asChild className="mt-3">
            <Link to="/home">Back to Overview</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => (
            <li key={group.groupKey}>
              <ReviewGroupCard group={group} names={names} birthDates={birthDates} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LifeWeekReviewLogPage() {
  const { user, loading } = useAuth();
  const { showHubShell } = useAppShellMode();

  if (loading) {
    return (
      <div className={mobileCenteredScreen("bg-background")}>
        <Loader2 className="h-6 w-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  if (showHubShell) {
    return (
      <HubPageLayout
        title="Week review log"
        description="Reflections from closing out each week — you, Lilly, and Caroline"
        mainClassName="max-w-3xl"
      >
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 px-2">
            <Link to="/home">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Overview
            </Link>
          </Button>
        </div>
        <LifeWeekReviewLogContent />
      </HubPageLayout>
    );
  }

  return (
    <MobilePageShell
      mainPaddingBottom="pb-safe-16"
      headerClassName="flex items-center gap-2 border-border/60 bg-background/80 px-3 py-3 sm:px-4"
      header={
        <>
          <Button variant="ghost" size="icon" asChild className="-ml-1 h-9 w-9 shrink-0" aria-label="Back">
            <Link to="/home">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-base font-semibold tracking-tight">Week review log</h1>
        </>
      }
    >
      <LifeWeekReviewLogContent />
    </MobilePageShell>
  );
}
