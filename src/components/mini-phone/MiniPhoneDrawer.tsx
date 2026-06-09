import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMiniPhone } from "@/contexts/MiniPhoneContext";
import { useHomeApps } from "@/hooks/useHomeApps";
import {
  MINI_PHONE_COMPACT_BREAKPOINT,
  MiniPhoneSizeContext,
} from "@/hooks/useMiniPhoneSize";
import { MiniPhoneAppView } from "@/components/mini-phone/MiniPhoneAppView";
import { MiniPhoneHomeBar } from "@/components/mini-phone/MiniPhoneHomeBar";
import { MiniPhoneHomeGrid } from "@/components/mini-phone/MiniPhoneHomeGrid";

const POSITION_STORAGE_KEY = "mini-phone-position";
const SIZE_STORAGE_KEY = "mini-phone-size";

const DEFAULT_W = 288;
const DEFAULT_H = 624;
const MIN_W = 260;
const MIN_H = 420;
const MAX_W = 520;

function loadSize(): { w: number; h: number } {
  try {
    const raw = localStorage.getItem(SIZE_STORAGE_KEY);
    if (!raw) return { w: DEFAULT_W, h: DEFAULT_H };
    const parsed = JSON.parse(raw) as { w?: number; h?: number };
    return {
      w: Math.min(MAX_W, Math.max(MIN_W, parsed.w ?? DEFAULT_W)),
      h: Math.max(MIN_H, parsed.h ?? DEFAULT_H),
    };
  } catch {
    return { w: DEFAULT_W, h: DEFAULT_H };
  }
}

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // ignore
  }
  return null;
}

export function MiniPhoneDrawer() {
  const { isOpen, close, activeRoute } = useMiniPhone();
  const { apps, wallpaper, wallpaperTint, wallpaperBlur } = useHomeApps();
  const [size, setSize] = useState(loadSize);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(loadPosition);

  const dragState = useRef({ startX: 0, startY: 0, origX: 0, origY: 0, dragging: false });
  const resizeState = useRef({ resizing: false, startX: 0, startY: 0, origW: 0, origH: 0 });

  const sizeContext = useMemo(
    () => ({
      width: size.w,
      height: size.h,
      compact: size.w < MINI_PHONE_COMPACT_BREAKPOINT,
    }),
    [size.w, size.h],
  );

  const persistSize = useCallback((s: { w: number; h: number }) => {
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore
    }
  }, []);

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    resizeState.current = {
      resizing: true,
      startX: e.clientX,
      startY: e.clientY,
      origW: size.w,
      origH: size.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [size.w, size.h]);

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizeState.current.resizing) return;
    const dx = e.clientX - resizeState.current.startX;
    const dy = e.clientY - resizeState.current.startY;
    const maxH = window.innerHeight - 32;
    const nextW = Math.min(MAX_W, Math.max(MIN_W, resizeState.current.origW + dx));
    const nextH = Math.min(maxH, Math.max(MIN_H, resizeState.current.origH + dy));
    setSize({ w: nextW, h: nextH });
  }, []);

  const onResizePointerUp = useCallback(() => {
    if (!resizeState.current.resizing) return;
    resizeState.current.resizing = false;
    persistSize(size);
  }, [size, persistSize]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = (e.currentTarget.closest("[data-mini-phone-drawer]") as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      dragging: true,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const w = size.w;
    const h = Math.min(size.h, window.innerHeight - 32);
    const nextX = Math.min(window.innerWidth - w - 8, Math.max(8, dragState.current.origX + dx));
    const nextY = Math.min(window.innerHeight - h - 8, Math.max(8, dragState.current.origY + dy));
    setPos({ x: nextX, y: nextY });
  }, [size.w, size.h]);

  const onHandlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    try {
      const cur = (e.currentTarget.closest("[data-mini-phone-drawer]") as HTMLElement)?.getBoundingClientRect();
      if (cur) localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x: cur.left, y: cur.top }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => {
        if (!p) return p;
        const w = size.w;
        const h = Math.min(size.h, window.innerHeight - 32);
        const nx = Math.min(window.innerWidth - w - 8, Math.max(8, p.x));
        const ny = Math.min(window.innerHeight - h - 8, Math.max(8, p.y));
        if (nx === p.x && ny === p.y) return p;
        try {
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x: nx, y: ny }));
        } catch {
          // ignore
        }
        return { x: nx, y: ny };
      });
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [size.w, size.h]);

  if (!isOpen) return null;

  const positionStyle: React.CSSProperties = pos
    ? { left: `${pos.x}px`, top: `${pos.y}px`, width: `${size.w}px`, height: `${size.h}px` }
    : { right: "1.5rem", bottom: "6rem", width: `${size.w}px`, height: `${size.h}px` };

  return (
    <MiniPhoneSizeContext.Provider value={sizeContext}>
      <div
        data-mini-phone-drawer
        style={{
          ...positionStyle,
          background: "linear-gradient(145deg, #f5f5f7 0%, #b8b8bd 25%, #e8e8ec 50%, #8a8a90 75%, #d4d4d8 100%)",
        }}
        className={cn(
          "fixed z-[80] max-h-[calc(100vh-2rem)] rounded-[36px] p-[3px] shadow-[0_20px_45px_-12px_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(255,255,255,0.4)]",
          "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
        )}
      >
        <div className="relative w-full h-full rounded-[33px] bg-black p-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="relative w-full h-full rounded-[30px] bg-background overflow-hidden flex flex-col">
            <div className="absolute top-2.5 right-3.5 z-[6] flex items-center gap-1.5">
              <button
                type="button"
                onClick={close}
                className="h-4 w-4 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_1px_2px_0_rgba(0,0,0,0.25)] transition-colors"
                aria-label="Minimize phone"
                title="Minimize"
              >
                <Minus className="h-3 w-3 text-yellow-800" strokeWidth={3.5} />
              </button>
              <button
                type="button"
                onClick={close}
                className="h-4 w-4 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_1px_2px_0_rgba(0,0,0,0.25)] transition-colors"
                aria-label="Close phone"
                title="Close"
              >
                <X className="h-3 w-3 text-red-900" strokeWidth={3.5} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {activeRoute ? (
                <MiniPhoneAppView entryRoute={activeRoute} />
              ) : (
                <MiniPhoneHomeGrid
                  apps={apps}
                  wallpaper={wallpaper}
                  wallpaperTint={wallpaperTint}
                  wallpaperBlur={wallpaperBlur}
                />
              )}
            </div>

            <MiniPhoneHomeBar
              onDragPointerDown={onHandlePointerDown}
              onDragPointerMove={onHandlePointerMove}
              onDragPointerUp={onHandlePointerUp}
            />
          </div>

          <button
            type="button"
            aria-label="Resize phone"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            className="absolute bottom-1 right-1 h-5 w-5 cursor-se-resize opacity-40 hover:opacity-80 z-10"
            style={{ touchAction: "none" }}
          />
        </div>
      </div>
    </MiniPhoneSizeContext.Provider>
  );
}
