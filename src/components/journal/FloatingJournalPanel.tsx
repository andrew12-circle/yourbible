import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize2, GripHorizontal, Loader2, Clock, Minus, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PrivacyBlurInput } from "@/components/writing/PrivacyBlurInput";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { toast } from "@/hooks/use-toast";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import { JOURNAL_EXPAND_HANDOFF_KEY, type JournalExpandHandoffPayload } from "@/lib/journal/links";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import FloatingJournalResearchChatTab from "@/components/journal/FloatingJournalResearchChatTab";
import {
  artifactJournalReturnPath,
  handoffArtifactVideoForJournal,
} from "@/lib/framework/artifactJournalNavigation";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { DictInterimPreview } from "@/components/journal/DictInterimPreview";
import JournalPrivacyBlurToggle from "@/components/journal/JournalPrivacyBlurToggle";
import SketchPad from "@/components/journal/SketchPad";
import { JournalSketchInline } from "@/components/journal/JournalSketchInline";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { usePendingJournalSketch } from "@/hooks/usePendingJournalSketch";
import { cn } from "@/lib/utils";

const GLOBAL_FLOATING_DRAFT_KEY = "__global__";

const DEFAULT_W = 360;
const DEFAULT_H = 420;
/** Taller layout when researching a claim (Chat tab + claim card + composer visible). */
const CLAIM_RESEARCH_W = 460;
const CLAIM_RESEARCH_H_MIN = 580;
const CLAIM_RESEARCH_H_VH = 0.82;
const CLAIM_RESEARCH_H_MAX = 920;
const MIN_W = 280;
const MIN_H = 220;
const PANEL_MARGIN = 8;
const TEXTAREA_AUTOSIZE_MAX = 360;
/** Floating journal chrome (non–Bible reader). */
const JOURNAL_PANEL_HEADER_BG = "#000000";

function panelStorageKey(userId: string) {
  return `yb_journal_panel_v1_${userId}`;
}

function draftStorageKey(userId: string, artifactId: string | undefined) {
  const key = artifactId?.trim() || GLOBAL_FLOATING_DRAFT_KEY;
  return `yb_journal_floating_draft_v1_${userId}_${key}`;
}

function formatPlaybackTimestamp(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function claimResearchPanelGeom(_prev: PanelPersist): PanelPersist {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = clamp(CLAIM_RESEARCH_W, MIN_W, vw - PANEL_MARGIN * 2);
  const h = clamp(
    Math.min(CLAIM_RESEARCH_H_MAX, Math.round(vh * CLAIM_RESEARCH_H_VH)),
    Math.min(CLAIM_RESEARCH_H_MIN, vh - PANEL_MARGIN * 2),
    vh - PANEL_MARGIN * 2,
  );
  const x = clamp(vw - w - PANEL_MARGIN, PANEL_MARGIN, vw - w - PANEL_MARGIN);
  const y = clamp(Math.round((vh - h) / 2), PANEL_MARGIN, vh - h - PANEL_MARGIN);
  return { x, y, w, h };
}

type PanelPersist = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type FloatingJournalPanelProps = {
  userId: string;
  artifactId?: string;
  artifactTitle?: string;
  /** Defaults when omitted (no artifact route context). */
  artifactKind?: string;
  /** When provided, "Insert timestamp" uses live playback position (e.g. YouTube IFrame API). */
  getPlaybackSeconds?: () => number | null;
  /** Navy + gold chrome for Bible reader (`/read/*`). */
  readerTheme?: boolean;
  onClose: () => void;
};

export default function FloatingJournalPanel({
  userId,
  artifactId,
  artifactTitle,
  artifactKind = "text",
  getPlaybackSeconds,
  readerTheme = false,
  onClose,
}: FloatingJournalPanelProps) {
  const navigate = useNavigate();
  const floatingClaimResearch = useFloatingJournalStore((s) => s.floatingClaimResearch);
  const routeArtifact = useFloatingJournalStore((s) => s.routeArtifact);
  const [panelTab, setPanelTab] = useState<"write" | "chat">("write");
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftDebounceRef = useRef<number | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const geomRef = useRef<PanelPersist>({
    x: 0,
    y: 0,
    w: DEFAULT_W,
    h: DEFAULT_H,
  });
  const claimResearchRef = useRef(false);
  claimResearchRef.current = Boolean(floatingClaimResearch);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const {
    sketchOpen,
    setSketchOpen,
    previewUrl,
    hasPendingSketch,
    handleSketchSave,
    clearPendingSketch,
    attachSketchToEntry,
  } = usePendingJournalSketch();
  const sketchDraftKey = `floating:${artifactId?.trim() || GLOBAL_FLOATING_DRAFT_KEY}`;

  const [geom, setGeom] = useState<PanelPersist>(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    return {
      x: w - DEFAULT_W - PANEL_MARGIN,
      y: h - DEFAULT_H - PANEL_MARGIN,
      w: DEFAULT_W,
      h: DEFAULT_H,
    };
  });

  geomRef.current = geom;

  const dateLine = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  useEffect(() => {
    if (!floatingClaimResearch) {
      setPanelTab("write");
      return;
    }
    setTitle(floatingClaimResearch.journalTitle);
    setBody(floatingClaimResearch.claimMarkdown);
    setPanelTab(floatingClaimResearch.initialTab ?? "chat");
  }, [floatingClaimResearch]);

  useEffect(() => {
    if (!artifactId) return;
    floatingJournalInsertRef.current = {
      artifactId,
      append: (markdown: string) => {
        const ta = textareaRef.current;
        const focused = ta && document.activeElement === ta;
        const s = focused ? ta.selectionStart : null;
        const e = focused ? ta.selectionEnd : null;
        setBody((prev) => {
          if (s != null && e != null) {
            const next = `${prev.slice(0, s)}${markdown}${prev.slice(e)}`;
            const pos = s + markdown.length;
            requestAnimationFrame(() => {
              const el = textareaRef.current;
              if (!el) return;
              el.focus();
              el.setSelectionRange(pos, pos);
            });
            return next;
          }
          const sep =
            prev.length === 0 ? "" : prev.endsWith("\n\n") ? "" : prev.endsWith("\n") ? "\n" : "\n\n";
          const next = `${prev}${sep}${markdown}`;
          requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (!el) return;
            el.focus();
            const pos = next.length;
            el.setSelectionRange(pos, pos);
          });
          return next;
        });
      },
    };
    return () => {
      if (floatingJournalInsertRef.current?.artifactId === artifactId) {
        floatingJournalInsertRef.current = null;
      }
    };
  }, [artifactId]);

  const persistPanel = useCallback(
    (next: PanelPersist) => {
      try {
        localStorage.setItem(panelStorageKey(userId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [userId],
  );

  // Restore geometry + draft (claim research uses expanded layout instead of saved size).
  useLayoutEffect(() => {
    if (floatingClaimResearch) {
      setGeom((prev) => {
        const next = claimResearchPanelGeom(prev);
        persistPanel(next);
        return next;
      });
    } else {
      try {
        const raw = localStorage.getItem(panelStorageKey(userId));
        if (raw) {
          const p = JSON.parse(raw) as Partial<PanelPersist>;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const w = clamp(Number.isFinite(Number(p.w)) && p.w != null ? Number(p.w) : DEFAULT_W, MIN_W, vw - PANEL_MARGIN * 2);
          const h = clamp(Number.isFinite(Number(p.h)) && p.h != null ? Number(p.h) : DEFAULT_H, MIN_H, vh - PANEL_MARGIN * 2);
          const nx = Number(p.x);
          const ny = Number(p.y);
          const x = clamp(Number.isFinite(nx) ? nx : vw - w - PANEL_MARGIN, PANEL_MARGIN, vw - w - PANEL_MARGIN);
          const y = clamp(Number.isFinite(ny) ? ny : vh - h - PANEL_MARGIN, PANEL_MARGIN, vh - h - PANEL_MARGIN);
          setGeom({ x, y, w, h });
        }
      } catch {
        /* ignore */
      }
    }

    if (floatingClaimResearch) return;

    try {
      const d = localStorage.getItem(draftStorageKey(userId, artifactId));
      if (d) {
        const j = JSON.parse(d) as { title?: string; body?: string };
        if (typeof j.body === "string") setBody(j.body);
        if (typeof j.title === "string") setTitle(j.title);
      }
    } catch {
      /* ignore */
    }
  }, [userId, artifactId, floatingClaimResearch?.claimId, persistPanel]);

  // Debounced draft persistence
  useEffect(() => {
    if (draftDebounceRef.current) window.clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(draftStorageKey(userId, artifactId), JSON.stringify({ title, body }));
      } catch {
        /* ignore */
      }
    }, 350);
    return () => {
      if (draftDebounceRef.current) window.clearTimeout(draftDebounceRef.current);
    };
  }, [title, body, userId, artifactId]);

  // Focus when open (write tab only)
  useEffect(() => {
    if (floatingClaimResearch && panelTab === "chat") return;
    const t = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [floatingClaimResearch, panelTab]);

  const syncGeom = useCallback(
    (patch: Partial<PanelPersist>) => {
      setGeom((prev) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const next = { ...prev, ...patch };
        const w = clamp(next.w, MIN_W, vw - PANEL_MARGIN * 2);
        const h = clamp(next.h, MIN_H, vh - PANEL_MARGIN * 2);
        const x = clamp(next.x, PANEL_MARGIN, vw - w - PANEL_MARGIN);
        const y = clamp(next.y, PANEL_MARGIN, vh - h - PANEL_MARGIN);
        const full: PanelPersist = { x, y, w, h };
        persistPanel(full);
        return full;
      });
    },
    [persistPanel],
  );

  // Drag header (stable listeners; origin from geomRef)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const header = root.querySelector<HTMLElement>("[data-journal-panel-drag]");
    if (!header) return;

    const drag = { active: false, sx: 0, sy: 0, ox: 0, oy: 0 };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest("button")) return;
      drag.active = true;
      drag.sx = e.clientX;
      drag.sy = e.clientY;
      drag.ox = geomRef.current.x;
      drag.oy = geomRef.current.y;
      header.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      syncGeom({ x: drag.ox + dx, y: drag.oy + dy });
    };

    const onUp = (e: PointerEvent) => {
      if (!drag.active) return;
      drag.active = false;
      try {
        header.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    header.addEventListener("pointerdown", onDown);
    header.addEventListener("pointermove", onMove);
    header.addEventListener("pointerup", onUp);
    header.addEventListener("pointercancel", onUp);
    return () => {
      header.removeEventListener("pointerdown", onDown);
      header.removeEventListener("pointermove", onMove);
      header.removeEventListener("pointerup", onUp);
      header.removeEventListener("pointercancel", onUp);
    };
  }, [syncGeom]);

  // Resize grip
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const grip = root.querySelector<HTMLElement>("[data-journal-panel-resize]");
    if (!grip) return;

    let active = false;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      active = true;
      startX = e.clientX;
      startY = e.clientY;
      const g = geomRef.current;
      startW = g.w;
      startH = g.h;
      grip.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const g = geomRef.current;
      const maxW = vw - g.x - PANEL_MARGIN;
      const maxH = vh - g.y - PANEL_MARGIN;
      const minH = claimResearchRef.current ? Math.min(CLAIM_RESEARCH_H_MIN, maxH) : MIN_H;
      const w = clamp(startW + dx, MIN_W, maxW);
      const h = clamp(startH + dy, minH, maxH);
      syncGeom({ w, h });
    };

    const onUp = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      try {
        grip.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    grip.addEventListener("pointerdown", onDown);
    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onUp);
    grip.addEventListener("pointercancel", onUp);
    return () => {
      grip.removeEventListener("pointerdown", onDown);
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onUp);
      grip.removeEventListener("pointercancel", onUp);
    };
  }, [syncGeom]);

  // Keep panel in viewport on window resize
  useEffect(() => {
    const onResize = () => {
      setGeom((prev) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (claimResearchRef.current) {
          const next = claimResearchPanelGeom(prev);
          persistPanel(next);
          return next;
        }
        const w = clamp(prev.w, MIN_W, vw - PANEL_MARGIN * 2);
        const h = clamp(prev.h, MIN_H, vh - PANEL_MARGIN * 2);
        const x = clamp(prev.x, PANEL_MARGIN, vw - w - PANEL_MARGIN);
        const y = clamp(prev.y, PANEL_MARGIN, vh - h - PANEL_MARGIN);
        const next: PanelPersist = { ...prev, x, y, w, h };
        persistPanel(next);
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [persistPanel]);

  // Textarea height follows content (capped); outer wrapper scrolls if needed
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, 120), TEXTAREA_AUTOSIZE_MAX);
    el.style.height = `${next}px`;
  }, [body, geom.h, geom.w]);

  const insertTimestamp = () => {
    const ta = textareaRef.current;
    if (!getPlaybackSeconds) return;
    const sec = getPlaybackSeconds();
    if (sec == null || !Number.isFinite(sec)) {
      toast({ title: "Playback time unavailable", variant: "destructive" });
      return;
    }
    const stamp = `[${formatPlaybackTimestamp(sec)}]`;
    if (!ta) {
      setBody((b) => `${b}${b && !b.endsWith("\n") ? "\n" : ""}${stamp}`);
      return;
    }
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    setBody((prev) => `${prev.slice(0, s)}${stamp}${prev.slice(e)}`);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = s + stamp.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  /** Collapse to the right-edge journal tab (GlobalJournalLauncher); draft + geometry kept. */
  const minimizeToTab = () => {
    try {
      localStorage.setItem(draftStorageKey(userId, artifactId), JSON.stringify({ title, body }));
    } catch {
      /* ignore */
    }
    persistPanel(geomRef.current);
    useFloatingJournalStore.getState().setLauncherTucked(false);
    onClose();
  };

  const saveTags =
    !artifactId ? [] : artifactKind === "youtube" ? ["artifact", "youtube"] : ["artifact"];

  const expandToFullEditor = () => {
    const returnTo = artifactId ? artifactJournalReturnPath(artifactId) : undefined;
    const videoId = routeArtifact?.youTubeVideoId;
    if (artifactId && videoId && getPlaybackSeconds) {
      handoffArtifactVideoForJournal({
        artifactId,
        youTubeVideoId: videoId,
        title: artifactTitle ?? routeArtifact?.title ?? null,
        getPlaybackSeconds: () => getPlaybackSeconds() ?? 0,
        getIsPlaying: () => false,
        persistSeconds: () => {},
      });
    }
    const payload: JournalExpandHandoffPayload = {
      title: title.trim() || artifactTitle || null,
      body,
      tags: saveTags,
      returnTo,
    };
    try {
      localStorage.setItem(JOURNAL_EXPAND_HANDOFF_KEY, JSON.stringify(payload));
    } catch {
      toast({ title: "Could not hand off draft", variant: "destructive" });
      return;
    }
    navigate("/journal/new", { state: { journalHandoff: payload } });
  };

  const saveEntry = async () => {
    if (!body.trim() && !title.trim() && !hasPendingSketch) {
      toast({ title: "Write something first", variant: "destructive" });
      return;
    }
    dictateRef.current?.stop();
    setSaving(true);
    try {
      const journalId = await getDefaultJournalId(userId);
      const ctx = await getCurrentContext().catch(() => ({
        location_name: null as string | null,
        lat: null as number | null,
        lng: null as number | null,
        weather: null as string | null,
        weather_temp_c: null as number | null,
        weather_icon: null as string | null,
      }));
      const ts = new Date();
      const payload = {
        user_id: userId,
        journal_id: journalId,
        title: title.trim() || null,
        body,
        mood: null as number | null,
        tags: saveTags,
        verse_ref: null as string | null,
        belief_id: null as string | null,
        prompt_id: null as string | null,
        location_name: ctx.location_name?.trim() || null,
        lat: ctx.lat,
        lng: ctx.lng,
        weather: ctx.weather,
        weather_temp_c: ctx.weather_temp_c,
        weather_icon: ctx.weather_icon,
        analyze_for_mirror: false,
        entry_at_ts: ts.toISOString(),
        entry_at: ts.toISOString().slice(0, 10),
      };

      const { data, error } = await supabase.from("journal_entries").insert(payload).select("id").maybeSingle();
      if (error || !data?.id) {
        toast({ title: "Save failed", description: error?.message, variant: "destructive" });
        return;
      }
      const entryId = data.id;
      let linkErr: { message: string } | null = null;
      if (artifactId) {
        const { error } = await supabase.from("journal_entry_links").insert({
          user_id: userId,
          entry_id: entryId,
          target_kind: "artifact",
          target_ref: { id: artifactId },
        });
        if (error) linkErr = error;
      }
      if (linkErr) {
        toast({ title: "Entry saved; link failed", description: linkErr.message, variant: "destructive" });
      }
      if (hasPendingSketch) {
        await attachSketchToEntry(userId, entryId, {
          onBody: (nextBody) => setBody(nextBody),
          onTitle: (nextTitle) => setTitle(nextTitle),
        });
      }
      if (!linkErr) {
        toast({ title: "Journal entry saved" });
      }
      try {
        localStorage.removeItem(draftStorageKey(userId, artifactId));
      } catch {
        /* ignore */
      }
      setTitle("");
      setBody("");
    } finally {
      setSaving(false);
    }
  };

  const showTimestamp = typeof getPlaybackSeconds === "function";

  const writeTabEditor = (
    <>
      <p className="mb-2 shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {dateLine}
      </p>
      {showTimestamp && (
        <div className="mb-2 flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-border bg-background text-foreground shadow-none hover:bg-muted/80 dark:border-neutral-700 dark:bg-neutral-900/80 dark:hover:bg-neutral-800/90"
            onClick={insertTimestamp}
          >
            <Clock className="mr-1 h-3.5 w-3.5" />
            Insert timestamp
          </Button>
        </div>
      )}
      <PrivacyBlurInput
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="mb-2 h-auto shrink-0 border-0 bg-transparent px-0.5 py-1 text-lg font-sans font-semibold shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0 dark:placeholder:text-muted-foreground/50"
      />
      <div className="mb-2 flex shrink-0 items-center justify-end gap-1">
        <JournalPrivacyBlurToggle />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-muted-foreground hover:text-foreground"
          onClick={() => {
            dictateRef.current?.stop();
            setSketchOpen(true);
          }}
        >
          <PenLine className="mr-1 h-3.5 w-3.5" />
          Handwrite
        </Button>
        <DictateButton
          ref={dictateRef}
          userId={userId}
          size="sm"
          className="text-foreground hover:text-foreground dark:text-foreground dark:hover:text-foreground"
          onAppend={(chunk) => setBody((b) => mergeDictatedText(b, chunk))}
          onInterim={setDictInterim}
        />
      </div>
      {previewUrl ? (
        <JournalSketchInline
          sketches={[{ id: "pending", storage_path: "", url: previewUrl }]}
          className="mb-2 shrink-0"
          onOpenSketch={() => {
            dictateRef.current?.stop();
            setSketchOpen(true);
          }}
          onRemove={clearPendingSketch}
        />
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-none">
        <PolishedTextarea
          ref={textareaRef}
          polishResetKey={artifactId ?? "floating-journal"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write while you watch…"
          className="relative z-[1] min-h-[120px] w-full resize-none overflow-hidden border-0 bg-transparent px-3 py-2.5 font-sans text-[15px] leading-relaxed text-foreground shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0 dark:placeholder:text-muted-foreground/45"
          rows={4}
        />
        <DictInterimPreview
          text={dictInterim}
          className="relative z-[1] px-3 pb-2 text-xs italic leading-relaxed text-muted-foreground/80"
        />
      </div>
      <div
        className={cn(
          "mt-3 flex shrink-0 gap-2 border-t pt-3",
          readerTheme ? "border-gold/20" : "border-border dark:border-neutral-800",
        )}
      >
        <Button
          type="button"
          variant={readerTheme ? "default" : "secondary"}
          className={cn(
            "flex-1",
            readerTheme &&
              "bg-navy text-gold hover:bg-navy-deep hover:text-gold-bright border border-gold/25 shadow-none",
          )}
          onClick={saveEntry}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </>
  );

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-labelledby="floating-journal-title"
      className={cn(
        "fixed z-50 flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card shadow-[0_14px_44px_-10px_rgba(15,23,42,0.22)]",
        readerTheme
          ? "border-gold/25 shadow-leather"
          : "border-border dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-[0_18px_50px_-14px_rgba(0,0,0,0.65)]",
      )}
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.w,
        height: geom.h,
        maxHeight: `calc(100vh - ${PANEL_MARGIN * 2}px)`,
      }}
    >
      <header
        data-journal-panel-drag
        className={cn(
          "relative z-10 flex min-h-[44px] shrink-0 cursor-move select-none items-center gap-2 border-b px-3 py-2",
          readerTheme
            ? "border-gold/25 bg-navy text-gold-bright"
            : "border-white/20 text-white",
        )}
        style={readerTheme ? undefined : { backgroundColor: JOURNAL_PANEL_HEADER_BG }}
      >
        <GripHorizontal
          className={cn(
            "h-4 w-4 shrink-0",
            readerTheme ? "text-gold/85" : "text-white/85",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 pr-1">
          <h2
            id="floating-journal-title"
            className={cn(
              "font-display text-[15px] font-semibold leading-none tracking-tight",
              readerTheme ? "text-gold-bright" : "text-white",
            )}
          >
            Journal
          </h2>
          <p
            className={cn(
              "mt-1 truncate text-[11px] leading-tight",
              readerTheme ? "text-gold/80" : "text-white/80",
            )}
          >
            {artifactTitle?.trim() || (artifactId ? "Artifact" : "Quick note")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_1px_2px_0_rgba(0,0,0,0.25)] transition-colors hover:bg-yellow-500"
            aria-label="Minimize to journal tab"
            title="Minimize to tab"
            onClick={(e) => {
              e.stopPropagation();
              minimizeToTab();
            }}
          >
            <Minus className="h-3 w-3 text-yellow-800" strokeWidth={3.5} />
          </button>
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_1px_2px_0_rgba(0,0,0,0.25)] transition-colors hover:bg-green-600"
            aria-label="Open full journal editor"
            title="Expand"
            onClick={(e) => {
              e.stopPropagation();
              expandToFullEditor();
            }}
          >
            <Maximize2 className="h-2.5 w-2.5 text-green-950" strokeWidth={3.5} />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-card dark:bg-neutral-950">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5">
            {floatingClaimResearch ? (
              <>
                <div className="mb-2 flex shrink-0 gap-1 rounded-lg border border-border bg-muted/35 p-1 dark:bg-muted/20">
                  <Button
                    type="button"
                    size="sm"
                    variant={panelTab === "write" ? "secondary" : "ghost"}
                    className="h-8 flex-1 text-xs"
                    onClick={() => setPanelTab("write")}
                  >
                    Write
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={panelTab === "chat" ? "secondary" : "ghost"}
                    className="h-8 flex-1 text-xs"
                    onClick={() => setPanelTab("chat")}
                  >
                    Chat
                  </Button>
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden">
                  {panelTab === "write" ? (
                    writeTabEditor
                  ) : (
                    <FloatingJournalResearchChatTab userId={userId} research={floatingClaimResearch} />
                  )}
                </div>
              </>
            ) : (
              writeTabEditor
            )}
          </div>
          <button
            type="button"
            data-journal-panel-resize
            aria-label="Resize journal panel"
            className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize touch-none rounded-tl-md border border-border bg-muted/50 hover:bg-muted dark:border-neutral-700 dark:bg-neutral-800/80 dark:hover:bg-neutral-700"
          />
      </div>

      <SketchPad
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        draftKey={sketchDraftKey}
        onSave={handleSketchSave}
        onUnsavedExit={handleSketchSave}
      />
    </div>
  );
}



