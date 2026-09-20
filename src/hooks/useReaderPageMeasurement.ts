import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Never round up and give the paginator more room than the actual page. */
export function quantizePageBox(width: number, height: number) {
  return { w: Math.max(0, Math.floor(width)), h: Math.max(0, Math.floor(height)) };
}
export function useReaderPageMeasurement(bookAbbr: string, chapter: number) {
  const [pageBox, setPageBox] = useState({ w: 0, h: 0 });
  const [firstPageHeight, setFirstPageHeight] = useState(0);
  const els = useRef<{ first: HTMLElement | null; rest: HTMLElement | null }>({ first: null, rest: null });
  const observer = useRef<ResizeObserver | null>(null);
  const raf = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockUntil = useRef(0);
  const scheduleRef = useRef<() => void>(() => {});
  const sync = useCallback(() => {
    if (performance.now() < lockUntil.current) { scheduleRef.current(); return; }
    const first = els.current.first;
    const rest = els.current.rest;
    const firstBox = first ? quantizePageBox(first.clientWidth, first.clientHeight) : null;
    const restBox = rest ? quantizePageBox(rest.clientWidth, rest.clientHeight) : null;
    if (firstBox && firstBox.h > 0) setFirstPageHeight((old) => old === firstBox.h ? old : firstBox.h);
    const next = restBox && restBox.w > 0 && restBox.h > 0 ? restBox : firstBox;
    if (next && next.w > 0 && next.h > 0) setPageBox((old) => old.w === next.w && old.h === next.h ? old : next);
  }, []);
  const schedule = useCallback(() => {
    if (timer.current != null || raf.current != null) return;
    const remaining = lockUntil.current - performance.now();
    if (remaining > 0) {
      timer.current = setTimeout(() => { timer.current = null; scheduleRef.current(); }, Math.ceil(remaining) + 1);
      return;
    }
    raf.current = requestAnimationFrame(() => { raf.current = null; sync(); });
  }, [sync]);
  scheduleRef.current = schedule;
  const attach = useCallback(() => {
    observer.current?.disconnect();
    if (typeof ResizeObserver !== "undefined") {
      observer.current = new ResizeObserver(schedule);
      for (const el of [els.current.first, els.current.rest]) {
        if (!el) continue;
        observer.current.observe(el);
        if (el.parentElement) observer.current.observe(el.parentElement);
      }
    }
    schedule();
  }, [schedule]);
  const onMeasureFirstRef = useCallback((el: HTMLElement | null) => { els.current.first = el; attach(); }, [attach]);
  const onMeasureRestRef = useCallback((el: HTMLElement | null) => { els.current.rest = el; attach(); }, [attach]);
  useLayoutEffect(() => {
    // Reattach after chapter-effect cleanup, even when React reuses the article.
    attach();
    return () => observer.current?.disconnect();
  }, [bookAbbr, chapter, attach]);
  useEffect(() => {
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      viewport?.removeEventListener("resize", schedule);
      observer.current?.disconnect();
      if (raf.current != null) cancelAnimationFrame(raf.current);
      if (timer.current != null) clearTimeout(timer.current);
      raf.current = null; timer.current = null;
    };
  }, [schedule]);
  const lockPageFlip = useCallback(() => { lockUntil.current = performance.now() + 420; schedule(); }, [schedule]);
  const subsequentPageHeight = pageBox.h;
  const paginatorFirstPageHeight = firstPageHeight || subsequentPageHeight;
  return { pageBox, firstPageHeight, subsequentPageHeight, paginatorFirstPageHeight, paginatorReady: pageBox.w > 0 && paginatorFirstPageHeight > 0, onMeasureFirstRef, onMeasureRestRef, lockPageFlip };
}
