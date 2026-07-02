import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const PAGE_BOX_QUANT = 12;

function quantizePageBox(width: number, height: number) {
  const w = Math.round(width / PAGE_BOX_QUANT) * PAGE_BOX_QUANT;
  const h = Math.round(height / PAGE_BOX_QUANT) * PAGE_BOX_QUANT;
  return { w, h };
}

export function useReaderPageMeasurement(bookAbbr: string, chapter: number) {
  const [pageBox, setPageBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [firstPageHeight, setFirstPageHeight] = useState(0);
  const articleRoRef = useRef<ResizeObserver | null>(null);
  const measureRafRef = useRef<number | null>(null);
  const articleElsRef = useRef<{ first: HTMLElement | null; rest: HTMLElement | null }>({
    first: null,
    rest: null,
  });
  const measureFirstRef = useRef<(el: HTMLElement | null) => void>(() => {});
  const measureRestRef = useRef<(el: HTMLElement | null) => void>(() => {});
  const flipLockUntil = useRef(0);

  const applyArticleMeasureBox = useCallback((role: "first" | "rest", el: HTMLElement | null) => {
    if (!el || performance.now() < flipLockUntil.current) return;
    const box = quantizePageBox(el.clientWidth, el.clientHeight);
    if (role === "first" && box.h > 0) {
      setFirstPageHeight((prev) => (prev === box.h ? prev : box.h));
    }
    if (box.w > 0 && box.h > 0) {
      setPageBox((prev) => (prev.w === box.w && prev.h === box.h ? prev : box));
    } else if (role === "first" && box.w > 0) {
      setPageBox((prev) => (prev.w === box.w ? prev : { w: box.w, h: prev.h }));
    }
  }, []);

  const syncPageMeasurements = useCallback(() => {
    if (performance.now() < flipLockUntil.current) return;
    const firstEl = articleElsRef.current.first;
    const restEl = articleElsRef.current.rest;
    const nextFirst = firstEl
      ? quantizePageBox(firstEl.clientWidth, firstEl.clientHeight).h
      : 0;
    const restBox = restEl
      ? quantizePageBox(restEl.clientWidth, restEl.clientHeight)
      : null;
    if (nextFirst > 0) {
      setFirstPageHeight((prev) => (prev === nextFirst ? prev : nextFirst));
    }
    if (restBox && restBox.w > 0 && restBox.h > 0) {
      setPageBox((prev) =>
        prev.w === restBox.w && prev.h === restBox.h ? prev : restBox,
      );
    } else if (firstEl) {
      const firstBox = quantizePageBox(firstEl.clientWidth, firstEl.clientHeight);
      if (firstBox.w > 0 && firstBox.h > 0) {
        setPageBox((prev) =>
          prev.w === firstBox.w && prev.h === firstBox.h ? prev : firstBox,
        );
      } else if (firstBox.w > 0) {
        setPageBox((prev) =>
          prev.w === firstBox.w ? prev : { w: firstBox.w, h: prev.h },
        );
      }
    }
  }, []);

  const scheduleSyncPageMeasurements = useCallback(() => {
    if (measureRafRef.current != null) return;
    measureRafRef.current = requestAnimationFrame(() => {
      measureRafRef.current = null;
      syncPageMeasurements();
    });
  }, [syncPageMeasurements]);

  const attachArticleObservers = useCallback(() => {
    if (articleRoRef.current) {
      articleRoRef.current.disconnect();
      articleRoRef.current = null;
    }
    const { first, rest } = articleElsRef.current;
    if (!first && !rest) return;
    const ro = new ResizeObserver(() => scheduleSyncPageMeasurements());
    if (first) {
      ro.observe(first);
      if (first.parentElement) ro.observe(first.parentElement);
    }
    if (rest) {
      ro.observe(rest);
      if (rest.parentElement) ro.observe(rest.parentElement);
    }
    articleRoRef.current = ro;
    scheduleSyncPageMeasurements();
  }, [scheduleSyncPageMeasurements]);

  const bindArticleMeasure = useCallback(
    (role: "first" | "rest") => (el: HTMLElement | null) => {
      if (articleElsRef.current[role] === el) {
        if (el) applyArticleMeasureBox(role, el);
        return;
      }
      articleElsRef.current[role] = el;
      if (el) applyArticleMeasureBox(role, el);
      attachArticleObservers();
    },
    [applyArticleMeasureBox, attachArticleObservers],
  );

  measureFirstRef.current = bindArticleMeasure("first");
  measureRestRef.current = bindArticleMeasure("rest");

  const onMeasureFirstRef = useCallback((el: HTMLElement | null) => {
    measureFirstRef.current(el);
  }, []);

  const onMeasureRestRef = useCallback((el: HTMLElement | null) => {
    measureRestRef.current(el);
  }, []);

  useLayoutEffect(() => {
    scheduleSyncPageMeasurements();
    return () => {
      articleRoRef.current?.disconnect();
      articleRoRef.current = null;
    };
  }, [bookAbbr, chapter, scheduleSyncPageMeasurements]);

  useEffect(() => {
    const onResize = () => scheduleSyncPageMeasurements();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      vv?.removeEventListener("resize", onResize);
      if (measureRafRef.current != null) {
        cancelAnimationFrame(measureRafRef.current);
        measureRafRef.current = null;
      }
    };
  }, [scheduleSyncPageMeasurements]);

  const lockPageFlip = useCallback(() => {
    flipLockUntil.current = performance.now() + 420;
  }, []);

  const subsequentPageHeight = pageBox.h > 0 ? pageBox.h : 0;
  const paginatorFirstPageHeight =
    firstPageHeight > 0 ? firstPageHeight : subsequentPageHeight;
  const paginatorReady =
    (pageBox.w > 0 || firstPageHeight > 0) &&
    Math.max(subsequentPageHeight, paginatorFirstPageHeight, firstPageHeight) > 0;

  return {
    pageBox,
    firstPageHeight,
    subsequentPageHeight,
    paginatorFirstPageHeight,
    paginatorReady,
    onMeasureFirstRef,
    onMeasureRestRef,
    lockPageFlip,
  };
}
