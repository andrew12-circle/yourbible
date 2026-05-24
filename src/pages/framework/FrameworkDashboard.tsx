import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Plus,
  FileStack,
  AlertTriangle,
  Sparkles,
  CircleHelp,
  Landmark,
  Compass,
  Eye,
  Heart,
  Network,
  ClipboardList,
  Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ALL_LAYERS,
  FRAMEWORK_QUESTIONS,
  LAYER_META,
  type FrameworkLayer,
} from "@/data/framework";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import QuickBeliefDialog from "@/components/framework/QuickBeliefDialog";
import IdentityCard from "@/components/framework/IdentityCard";
import { toast } from "@/hooks/use-toast";
import { ArtifactShelf } from "./artifacts/ArtifactShelf";
import { cn } from "@/lib/utils";
import {
  artifactDisplayTitle,
  type Row as ArtifactRow,
} from "./artifacts/artifactLibraryModel";

interface BeliefRow {
  id: string;
  layer: string;
  topic: string;
}

const LAYER_ICONS: Record<FrameworkLayer, LucideIcon> = {
  foundations: Landmark,
  life: Compass,
  mechanics: Eye,
  emotional: Heart,
};

interface SecondaryActionProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

function SecondaryAction({ to, icon: Icon, label }: SecondaryActionProps) {
  return (
    <Link
      to={to}
      className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-background hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

/**
 * Book-with-map emblem — pure SVG.
 * Open book on the left page (lines of text) → topographic contour rings on
 * the right page with a dotted "journey" arc tying them together. The motif
 * carries the app's "living map of beliefs, rooted in scripture" identity
 * without leaning on the leather/paper reader theme.
 */
function BookMapEmblem() {
  return (
    <div className="relative w-full aspect-[5/4] text-foreground/80">
      <svg
        viewBox="0 0 320 256"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden
      >
        <ellipse cx="160" cy="232" rx="118" ry="7" fill="currentColor" opacity="0.08" />
        <path
          d="M158 60 L40 78 L46 220 L158 212 Z"
          fill="hsl(var(--card))"
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M162 60 L280 78 L274 220 L162 212 Z"
          fill="hsl(var(--card))"
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M160 60 L160 212"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1"
        />
        <g stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" strokeLinecap="round">
          <path d="M60 104 L142 98" />
          <path d="M60 124 L142 118" />
          <path d="M60 144 L130 140" />
          <path d="M60 164 L138 160" />
          <path d="M60 184 L118 182" />
        </g>
        <g stroke="hsl(var(--primary))" strokeOpacity="0.55" strokeWidth="1.1" fill="none">
          <ellipse cx="222" cy="140" rx="44" ry="34" />
          <ellipse cx="222" cy="140" rx="30" ry="22" />
          <ellipse cx="222" cy="140" rx="16" ry="11" />
        </g>
        <circle cx="222" cy="140" r="3.25" fill="hsl(var(--primary))" />
        <path
          d="M82 188 Q150 110, 218 140"
          stroke="currentColor"
          strokeOpacity="0.42"
          strokeWidth="1.2"
          strokeDasharray="2 4"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="82" cy="188" r="2.5" fill="currentColor" opacity="0.55" />
      </svg>
    </div>
  );
}

export default function FrameworkDashboard() {
  const { user, loading } = useAuth();
  const [beliefs, setBeliefs] = useState<BeliefRow[]>([]);
  const [recentArtifacts, setRecentArtifacts] = useState<ArtifactRow[]>([]);
  const [openTensions, setOpenTensions] = useState(0);
  const [playbookActiveCount, setPlaybookActiveCount] = useState(0);
  const [busy, setBusy] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const beliefsP = supabase
        .from("belief_nodes")
        .select("id,layer,topic")
        .eq("user_id", user.id);
      const tensionsP = supabase
        .from("belief_tensions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "open");
      const withMetaP = supabase
        .from("artifacts")
        .select("id,title,kind,status,created_at,metadata,url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      const playbookActiveP = supabase
        .from("playbook_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");

      const [{ data: b }, { count: tCount }, withMeta, { count: pbCount }] = await Promise.all([
        beliefsP,
        tensionsP,
        withMetaP,
        playbookActiveP,
      ]);
      setBeliefs((b as BeliefRow[]) ?? []);
      setOpenTensions(tCount ?? 0);
      setPlaybookActiveCount(pbCount ?? 0);

      if (!withMeta.error) {
        setRecentArtifacts((withMeta.data as ArtifactRow[]) ?? []);
      } else {
        const fallback = await supabase
          .from("artifacts")
          .select("id,title,kind,status,created_at,url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8);
        setRecentArtifacts((fallback.data as ArtifactRow[]) ?? []);
      }
      setBusy(false);
    })();
  }, [user]);

  const deleteArtifact = useCallback(
    async (id: string, title: string | null) => {
      if (!user) return;
      const confirmed = window.confirm(
        `Delete artifact "${title || "Untitled"}"? This cannot be undone.`,
      );
      if (!confirmed) return;
      setDeletingId(id);
      const { error } = await supabase
        .from("artifacts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        setDeletingId(null);
        return;
      }
      setRecentArtifacts((prev) => prev.filter((row) => row.id !== id));
      setDeletingId(null);
      toast({ title: "Artifact deleted" });
    },
    [user],
  );

  const renameArtifact = useCallback(
    async (id: string) => {
      if (!user) return;
      const r = recentArtifacts.find((x) => x.id === id);
      if (!r) return;
      const current = artifactDisplayTitle(r);
      const next = window.prompt("Rename artifact", current);
      if (next == null) return;
      const t = next.trim();
      if (!t || t === current) return;
      const { error } = await supabase
        .from("artifacts")
        .update({ title: t })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) {
        toast({ title: "Rename failed", description: error.message, variant: "destructive" });
        return;
      }
      setRecentArtifacts((prev) =>
        prev.map((row) => (row.id === id ? { ...row, title: t } : row)),
      );
      toast({ title: "Artifact renamed" });
    },
    [user, recentArtifacts],
  );

  const recentShelfRows = useMemo(
    () => recentArtifacts.slice(0, 8),
    [recentArtifacts],
  );

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const totalBeliefs = beliefs.length;
  const hasRecentArtifacts = !busy && recentShelfRows.length > 0;

  const libraryRecentlyAdded = (
    <section
      className={cn(
        "rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-6 shadow-sm ring-1 ring-border/30 animate-fade-up",
        hasRecentArtifacts ? "mb-8 sm:mb-10" : "mt-10 sm:mt-12",
      )}
      style={{
        animationDelay: hasRecentArtifacts ? "0ms" : "220ms",
        animationFillMode: "backwards",
      }}
    >
      <div className="mb-4 flex items-baseline justify-between gap-4 sm:mb-5">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
            Library
          </div>
          <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Recently added
          </h2>
        </div>
        <Link
          to="/framework/artifacts"
          className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm"
        >
          View all
        </Link>
      </div>
      {busy ? null : recentShelfRows.length === 0 ? (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center text-sm leading-relaxed text-muted-foreground">
          <FileStack className="mx-auto mb-3 h-5 w-5 text-muted-foreground/60" aria-hidden />
          Paste a sermon, podcast transcript, or your own journal entry and see how it lines up with what you
          believe.
        </div>
      ) : (
        <ArtifactShelf
          shelfKey="overview-recent"
          title=""
          rows={recentShelfRows}
          deletingId={deletingId}
          onDelete={deleteArtifact}
          onRename={renameArtifact}
        />
      )}
    </section>
  );

  return (
    <FrameworkLayout title="Overview">
      {hasRecentArtifacts ? libraryRecentlyAdded : null}

      <section
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-background shadow-sm animate-fade-up"
        style={hasRecentArtifacts ? { animationDelay: "60ms", animationFillMode: "backwards" } : undefined}
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 100% 0%, hsl(var(--primary) / 0.10) 0%, transparent 60%)," +
            "radial-gradient(ellipse 70% 50% at 0% 100%, hsl(38 80% 70% / 0.18) 0%, transparent 65%)," +
            "linear-gradient(180deg, hsl(40 40% 97%) 0%, hsl(0 0% 100%) 70%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
          aria-hidden
        />
        <div className="relative grid gap-8 p-6 sm:gap-10 sm:p-10 lg:p-12 sm:grid-cols-[1.15fr,1fr] sm:items-center">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 mb-3 sm:mb-4">
              Your Framework
            </div>
            <h2 className="font-serif text-3xl sm:text-[2.5rem] lg:text-[2.75rem] leading-[1.05] tracking-tight text-foreground text-balance">
              Where your beliefs live.
            </h2>
            <p className="mt-3 sm:mt-4 text-[15px] sm:text-base leading-relaxed text-muted-foreground max-w-[34rem] text-balance">
              A living map of what you actually believe — examined, sourced,
              and tested against scripture. Start with one belief, then run
              sermons, podcasts, and journal entries through the analyzer.
            </p>
            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Button
                size="lg"
                onClick={() => setQuickOpen(true)}
                className="rounded-2xl shadow-sm h-11 px-5 text-[15px]"
              >
                <Sparkles className="w-4 h-4" />
                Capture a belief
              </Button>
              <Link
                to="/framework/beliefs"
                className="group inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm"
              >
                <span>
                  Or browse{" "}
                  <span className="tabular-nums">{totalBeliefs}</span>{" "}
                  belief{totalBeliefs === 1 ? "" : "s"}
                </span>
                <ChevronRight
                  className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
          <div className="relative -mx-2 sm:mx-0">
            <BookMapEmblem />
          </div>
        </div>
      </section>

      <IdentityCard />

      <QuickBeliefDialog open={quickOpen} onOpenChange={setQuickOpen} />

      <nav
        aria-label="Quick actions"
        className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2 animate-fade-up"
        style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
      >
        <SecondaryAction to="/framework/artifacts" icon={FileStack} label="Artifacts" />
        <SecondaryAction
          to="/framework/playbook"
          icon={ClipboardList}
          label={playbookActiveCount > 0 ? `Playbook (${playbookActiveCount} active)` : "Playbook"}
        />
        <SecondaryAction
          to="/framework/artifacts/new?mode=youtube"
          icon={Plus}
          label="Add artifact"
        />
        <SecondaryAction
          to="/framework/live"
          icon={Radio}
          label="Live stream"
        />
        <SecondaryAction
          to="/framework/artifacts/new?mode=text&template=question"
          icon={CircleHelp}
          label="Question inbox"
        />
        <SecondaryAction
          to="/framework/beliefs"
          icon={Network}
          label={`All beliefs (${totalBeliefs})`}
        />
        <SecondaryAction
          to="/framework/tensions"
          icon={AlertTriangle}
          label={openTensions ? `Tensions (${openTensions})` : "Tensions"}
        />
      </nav>

      <section
        className="relative mt-10 sm:mt-12 overflow-hidden rounded-3xl border border-border/60 p-5 sm:p-7 animate-fade-up"
        style={{
          backgroundImage:
            "linear-gradient(180deg, hsl(40 42% 97%) 0%, hsl(40 30% 99%) 100%)",
          boxShadow:
            "inset 0 1px 0 hsl(0 0% 100% / 0.7), 0 1px 2px hsl(220 20% 20% / 0.03)",
          animationDelay: "140ms",
          animationFillMode: "backwards",
        }}
      >
        <div className="mb-5 sm:mb-6 flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
              Chapter 01 · The Interview
            </div>
            <h3 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              Begin the belief interview
            </h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-[34rem]">
              Four layers. Answer at your own pace — your map grows as you go.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {ALL_LAYERS.map((layer, idx) => {
            const meta = LAYER_META[layer];
            const LayerIcon = LAYER_ICONS[layer];
            const total = FRAMEWORK_QUESTIONS[layer].length;
            const answered = beliefs.filter((b) => b.layer === layer).length;
            const pct = total ? Math.round((answered / total) * 100) : 0;
            return (
              <Link
                key={layer}
                to={`/framework/interview/${layer}`}
                className="group block rounded-2xl border border-border/60 bg-background/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background animate-fade-up"
                style={{
                  animationDelay: `${180 + idx * 60}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div
                      className="text-[11px] font-medium uppercase tracking-wide mb-1"
                      style={{ color: meta.tone }}
                    >
                      Layer
                    </div>
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className="rounded-xl p-1.5 shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                        style={{ backgroundColor: `${meta.tone}18` }}
                        aria-hidden
                      >
                        <LayerIcon
                          className="w-5 h-5"
                          strokeWidth={1.75}
                          style={{ color: meta.tone }}
                        />
                      </div>
                      <div className="text-lg font-semibold leading-snug tracking-tight text-foreground min-w-0 pt-0.5">
                        {meta.title}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 shrink-0 text-muted-foreground/70 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-transform duration-200"
                    aria-hidden
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {meta.subtitle}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-muted/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out opacity-90"
                      style={{ width: `${pct}%`, background: meta.tone }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums font-medium shrink-0">
                    {answered}/{total}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {!hasRecentArtifacts ? libraryRecentlyAdded : null}
    </FrameworkLayout>
  );
}
