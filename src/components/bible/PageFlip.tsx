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
 * 3D paper flip animation. The page pivots on its inner edge (where the spine is).
 *   - Right page: pivots on left (spine) → rotates from 0° to -180° going forward.
 *   - Left page: pivots on right (spine) → rotates from 0° to 180° going forward.
 */
export function PageFlip({ pageKey, direction, side = "right", children }: Props) {
  const isRight = side === "right";
  const sign = direction === "forward" ? -1 : 1;

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
          initial={{
            rotateY: isRight ? sign * 90 : sign * -90,
            opacity: 0.6,
          }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{
            rotateY: isRight ? sign * -90 : sign * 90,
            opacity: 0.4,
          }}
          transition={{
            rotateY: { duration: 0.55, ease: [0.45, 0.05, 0.25, 1] },
            opacity: { duration: 0.3 },
          }}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: isRight ? "left center" : "right center",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            // Subtle paper shadow during flip
            boxShadow:
              "inset 0 0 30px hsl(30 25% 35% / 0.1), 0 12px 24px hsl(0 0% 0% / 0.18)",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
