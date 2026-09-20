import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, type ReactNode } from "react";

interface Props {
  pageKey: string;
  direction: "forward" | "back";
  side?: "left" | "right";
  enableSlide?: boolean;
  instant?: boolean;
  ready?: boolean;
  scopeKey?: string;
  children: ReactNode;
}
/** Hold a complete page only within its own edition/chapter, with interactions suspended. */
export function PageFlip({ pageKey, direction, side = "left", enableSlide = false, instant = true, ready = true, scopeKey = pageKey, children }: Props) {
  const reduceMotion = useReducedMotion();
  const previous = useRef<{ scopeKey: string; pageKey: string; children: ReactNode } | null>(null);
  useLayoutEffect(() => { if (ready) previous.current = { scopeKey, pageKey, children }; }, [ready, scopeKey, pageKey, children]);
  const held = !ready && previous.current?.scopeKey === scopeKey ? previous.current : null;
  const displayedKey = held?.pageKey ?? pageKey;
  const displayedChildren = held?.children ?? children;
  const x = enableSlide ? (direction === "forward" ? 14 : -14) * (side === "left" ? 1 : -1) : 0;
  return <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden bg-paper" aria-busy={!ready} {...(!ready ? { inert: "" } : {})}>
    {instant || reduceMotion || !ready ? <div key={displayedKey} className="h-full w-full min-h-0">{displayedChildren}</div> :
      <AnimatePresence initial={false} mode="sync"><motion.div key={displayedKey} className="absolute inset-0 h-full w-full overflow-hidden bg-paper" initial={{ opacity: 0, x }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -x, pointerEvents: "none" }} transition={{ duration: 0.18 }}>{displayedChildren}</motion.div></AnimatePresence>}
  </div>;
}
