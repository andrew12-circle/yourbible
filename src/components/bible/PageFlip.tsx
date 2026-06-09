import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  pageKey: string;
  direction: "forward" | "back";
  side?: "left" | "right";
  /** Subtle horizontal slide — single-page mobile only; spread stays fade-only. */
  enableSlide?: boolean;
  children: ReactNode;
}

const DURATION = 0.36;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SLIDE_PX = 14;

function slideForTurn(
  direction: "forward" | "back",
  side: "left" | "right",
  phase: "enter" | "exit",
): number {
  const forward = direction === "forward";
  const outward = side === "left" ? -1 : 1;
  if (phase === "enter") {
    return forward ? -outward * SLIDE_PX : outward * SLIDE_PX;
  }
  return forward ? outward * SLIDE_PX : -outward * SLIDE_PX;
}

/** Crossfade between pages; optional gentle slide on single-page turns. */
export function PageFlip({
  pageKey,
  direction,
  side = "left",
  enableSlide = false,
  children,
}: Props) {
  const reduceMotion = useReducedMotion();
  const slide = enableSlide && !reduceMotion;
  const enterX = slide ? slideForTurn(direction, side, "enter") : 0;
  const exitX = slide ? slideForTurn(direction, side, "exit") : 0;
  const transition = reduceMotion
    ? { duration: 0.01 }
    : { duration: DURATION, ease: EASE };

  return (
    <motion.div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden bg-paper">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={pageKey}
          initial={{ opacity: 0, x: enterX }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: exitX, pointerEvents: "none" }}
          transition={transition}
          className="absolute inset-0 h-full w-full overflow-hidden bg-paper will-change-[opacity,transform]"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
