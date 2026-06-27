import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import type { DocumentBlock } from "@/lib/bible/documentModel";

const EST_BLOCK_HEIGHT_PX = 72;
const OVERSCAN = 4;

export function ScriptureVirtualChapter({
  blocks,
  renderBlock,
  className,
}: {
  blocks: DocumentBlock[];
  renderBlock: (block: DocumentBlock, index: number) => ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const { start, end, paddingTop, paddingBottom } = useMemo(() => {
    const total = blocks.length;
    if (total === 0) {
      return { start: 0, end: 0, paddingTop: 0, paddingBottom: 0 };
    }
    const firstVisible = Math.max(0, Math.floor(scrollTop / EST_BLOCK_HEIGHT_PX) - OVERSCAN);
    const visibleCount = Math.ceil(viewportH / EST_BLOCK_HEIGHT_PX) + OVERSCAN * 2;
    const lastVisible = Math.min(total, firstVisible + visibleCount);
    return {
      start: firstVisible,
      end: lastVisible,
      paddingTop: firstVisible * EST_BLOCK_HEIGHT_PX,
      paddingBottom: Math.max(0, (total - lastVisible) * EST_BLOCK_HEIGHT_PX),
    };
  }, [blocks.length, scrollTop, viewportH]);

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ overflowY: "auto", height: "100%" }}
    >
      <div style={{ paddingTop, paddingBottom }}>
        {blocks.slice(start, end).map((block, i) => renderBlock(block, start + i))}
      </div>
    </div>
  );
}
