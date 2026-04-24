import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  /** Unique key per page — animation triggers when this changes */
  pageKey: string;
  /** "forward" flips right→left (turning to next page), "back" flips left→right */
  direction: "forward" | "back";
  /** Which side the page sits on within a spread (left/right). On mobile, this is the visible page. */
  side?: "left" | "right";
  children: ReactNode;
}

/**
 * 3D paper flip. The page that is LEAVING animates over the spine; the page
 * that is ARRIVING is revealed underneath (no entry animation, so we don't
 * see two pages flapping at once).
 *
 *   forward + right page → exits rotating from 0° to -180° around its left edge (sweeps right→left).
 *   forward + left page  → no flip (it stays — only the right page turns).
 *   back + left page     → exits rotating from 0° to +180° around its right edge (sweeps left→right).
 *   back + right page    → no flip.
 */
export function PageFlip({ pageKey, direction, side = "right", children }: Props) {
  const isRight = side === "right";
  // Only the side matching the turn direction actually flips.
  const flips =
    (direction === "forward" && isRight) ||
    (direction === "back" && !isRight);

  const exitRotate = flips ? (isRight ? -180 : 180) : 0;

  return (
    <div
      className="relative h-full w-full"
      style={{
        perspective: 2200,
        transformStyle: "preserve-3d",
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={pageKey}
          initial={false}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={
            flips
              ? { rotateY: exitRotate, opacity: 0.85 }
              : { opacity: 1 }
          }
          transition={{
            rotateY: { duration: 0.6, ease: [0.45, 0.05, 0.25, 1] },
            opacity: { duration: 0.35 },
          }}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: isRight ? "left center" : "right center",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            boxShadow: flips
              ? "inset 0 0 30px hsl(30 25% 35% / 0.1), 0 14px 28px hsl(0 0% 0% / 0.22)"
              : undefined,
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
