import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Minus, Maximize2, GripHorizontal, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import { JOURNAL_EXPAND_HANDOFF_KEY, type JournalExpandHandoffPayload } from "@/lib/journal/links";

const DEFAULT_W = 360;
const DEFAULT_H = 420;
const MIN_W = 280;
const MIN_H = 220;
const PANEL_MARGIN = 8;
const TEXTAREA_AUTOSIZE_MAX = 360;

function panelStorageKey(userId: string) {
  return `yb_journal_panel_v1_${userId}`;
}

function draftStorageKey(userId: string, artifactId: string) {
  return `yb_journal_floating_draft_v1_${userId}_${artifactId}`;
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

type PanelPersist = {
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
};

export type FloatingJournalPanelProps = {
  userId: string;
  artifactId: string;
  artifactTitle: string;
  artifactKind: string;
  /** When provided, "Insert timestamp" uses live playback position (e.g. YouTube IFrame API). */
  getPlaybackSeconds?: () => number | null;
  onClose: () => void;
};

export default function FloatingJournalPanel({
  userId,
  artifactId,
  artifactTitle,
  artifactKind,
  getPlaybackSeconds,
  onClose,
}: FloatingJournalPanelProps) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftDebounceRef = useRef<number | null>(null);
  const geomRef = useRef<PanelPersist>({
    x: 0,
    y: 0,
    w: DEFAULT_W,
    h: DEFAULT_H,
    minimized: false,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const [geom, setGeom] = useState<PanelPersist>(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    return {
      x: w - DEFAULT_W - PANEL_MARGIN,
      y: h - DEFAULT_H - PANEL_MARGIN,
      w: DEFAULT_W,
      h: DEFAULT_H,
      minimized: false,
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

  // Restore geometry + draft
  useLayoutEffect(() => {
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
        setGeom({ x, y, w, h, minimized: !!p.minimized });
      }
    } catch {
      /* ignore */
    }

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
  }, [userId, artifactId]);

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

  // Focus when expanded
  useEffect(() => {
    if (geom.minimized) return;
    const t = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [geom.minimized]);

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
        const full: PanelPersist = {
          x,
          y,
          w,
          h,
          minimized: patch.minimized !== undefined ? patch.minimized : next.minimized,
        };
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
    if (!root || geom.minimized) return;
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
      const w = clamp(startW + dx, MIN_W, maxW);
      const h = clamp(startH + dy, MIN_H, maxH);
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
  }, [geom.minimized, syncGeom]);

  // Keep panel in viewport on window resize
  useEffect(() => {
    const onResize = () => {
      setGeom((prev) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
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
    if (!el || geom.minimized) return;
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, 120), TEXTAREA_AUTOSIZE_MAX);
    el.style.height = `${next}px`;
  }, [body, geom.minimized, geom.h, geom.w]);

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

  const toggleMinimize = () => {
    setGeom((g) => {
      const next = { ...g, minimized: !g.minimized };
      persistPanel(next);
      return next;
    });
  };

  const expandToFullEditor = () => {
    const payload: JournalExpandHandoffPayload = {
      title: title.trim() || artifactTitle || null,
      body,
      tags: artifactKind === "youtube" ? ["artifact", "youtube"] : ["artifact"],
    };
    try {
      localStorage.setItem(JOURNAL_EXPAND_HANDOFF_KEY, JSON.stringify(payload));
    } catch {
      toast({ title: "Could not hand off draft", variant: "destructive" });
      return;
    }
    navigate("/journal/new", { state: { journalHandoff: payload } });
  };

  const handleClose = () => {
    try {
      localStorage.setItem(draftStorageKey(userId, artifactId), JSON.stringify({ title, body }));
    } catch {
      /* ignore */
    }
    persistPanel(geomRef.current);
    onClose();
  };

  const saveEntry = async () => {
    if (!body.trim() && !title.trim()) {
      toast({ title: "Write something first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const journalId = await getDefaultJournalId(userId);
      const ctx = await getCurrentContext();
      const ts = new Date();
      const payload = {
        user_id: userId,
        journal_id: journalId,
        title: title.trim() || null,
        body,
        mood: null as number | null,
        tags: artifactKind === "youtube" ? ["artifact", "youtube"] : ["artifact"],
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
      const { error: linkErr } = await supabase.from("journal_entry_links").insert({
        user_id: userId,
        entry_id: entryId,
        target_kind: "artifact",
        target_ref: { id: artifactId },
      });
      if (linkErr) {
        toast({ title: "Entry saved; link failed", description: linkErr.message, variant: "destructive" });
      } else {
        toast({ title: "Journal entry saved" });
      }
      try {
        localStorage.removeItem(draftStorageKey(userId, artifactId));
      } catch {
        /* ignore */
      }
    } finally {
      setSaving(false);
    }
  };

  const showTimestamp = typeof getPlaybackSeconds === "function";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-labelledby="floating-journal-title"
      className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-paper-edge/70 bg-paper/90 shadow-leather ring-1 ring-black/5 dark:border-border dark:bg-card dark:shadow-xl dark:ring-white/10"
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.w,
        height: geom.minimized ? undefined : geom.h,
        maxHeight: geom.minimized ? undefined : `calc(100vh - ${PANEL_MARGIN * 2}px)`,
      }}
    >
      <header
        data-journal-panel-drag
        className="leather-texture relative z-10 flex shrink-0 cursor-move select-none items-start gap-2 border-b border-black/15 px-3 py-2.5 text-paper dark:border-border dark:!bg-muted dark:[background-image:none] dark:[&::after]:hidden"
      >
        <GripHorizontal
          className="mt-0.5 h-4 w-4 shrink-0 text-paper/55 dark:text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 flex-1 pr-1">
          <h2 id="floating-journal-title" className="font-display text-[15px] font-semibold leading-tight tracking-tight text-paper dark:text-foreground">
            Journal
          </h2>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-paper/65 dark:text-muted-foreground">
            {artifactTitle || "Artifact"}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-paper/50 dark:text-muted-foreground/90">
            {dateLine}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-paper/90 hover:bg-white/10 hover:text-paper dark:text-foreground dark:hover:bg-muted"
            aria-label={geom.minimized ? "Restore panel" : "Minimize panel"}
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize();
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-paper/90 hover:bg-white/10 hover:text-paper dark:text-foreground dark:hover:bg-muted"
            aria-label="Open full journal editor"
            onClick={(e) => {
              e.stopPropagation();
              expandToFullEditor();
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-paper/90 hover:bg-white/10 hover:text-paper dark:text-foreground dark:hover:bg-muted"
            aria-label="Close and keep local draft"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {!geom.minimized && (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-paper dark:bg-muted/25">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-3.5">
            {showTimestamp && (
              <div className="mb-2 flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-paper-edge/80 bg-paper/70 text-foreground shadow-none hover:bg-paper-warm/80 dark:border-border dark:bg-background/80"
                  onClick={insertTimestamp}
                >
                  <Clock className="mr-1 h-3.5 w-3.5" />
                  Insert timestamp
                </Button>
              </div>
            )}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="mb-2 h-auto shrink-0 border-0 bg-transparent px-1 py-1.5 text-lg font-display shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0 dark:placeholder:text-muted-foreground/50"
            />
            <div className="relative min-h-0 flex-1 overflow-y-auto rounded-md border border-paper-edge/60 bg-gradient-paper shadow-soft dark:border-border dark:bg-muted/40 dark:[background-image:none] dark:shadow-none">
              {/* Ruled lines (~1.65em) aligned with leading-relaxed body copy */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] dark:hidden"
                style={{
                  backgroundImage:
                    "linear-gradient(to bottom, hsl(var(--paper-edge) / 0.28) 1px, transparent 1px)",
                  backgroundSize: "100% 1.65em",
                  backgroundPosition: "0 0.4em",
                }}
              />
              <Textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write while you watch…"
                className="relative z-[1] min-h-[120px] w-full resize-none overflow-hidden border-0 bg-transparent px-3 py-2.5 font-serif text-[15px] leading-relaxed text-foreground shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0 dark:placeholder:text-muted-foreground/45"
                rows={4}
              />
            </div>
            <div className="mt-3 flex shrink-0 gap-2 border-t border-paper-edge/40 pt-3 dark:border-border/60">
              <Button type="button" className="flex-1" onClick={saveEntry} disabled={saving}>
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
          </div>
          <button
            type="button"
            data-journal-panel-resize
            aria-label="Resize journal panel"
            className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize touch-none rounded-tl-md border border-transparent bg-paper-edge/35 hover:bg-paper-edge/55 dark:bg-muted/50 dark:hover:bg-muted/75"
          />
        </div>
      )}
    </div>
  );
}
