import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

interface Props {
  pageKey: string;
  direction: "forward" | "back";
  side?: "left" | "right";
  children: ReactNode;
}

/** Opacity crossfade between pages — no translation (avoids text sliding across spine). */
export function PageFlip({ pageKey, children }: Props) {
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    setAnimating(true);
  }, [pageKey]);

  return (
    <motion.div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={pageKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onAnimationComplete={(def) => {
            if (def !== "exit") setAnimating(false);
          }}
          className={
            "absolute inset-0 h-full w-full overflow-hidden " +
            (animating ? "[&_.selectable-text]:!select-none" : "")
          }
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
