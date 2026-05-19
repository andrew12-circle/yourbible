import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  pageKey: string;
  direction: "forward" | "back";
  side?: "left" | "right";
  children: ReactNode;
}

/** Light crossfade between pages (digital reader — no 3D curl). */
export function PageFlip({ pageKey, children }: Props) {
  return (
    <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pageKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute inset-0 h-full w-full overflow-hidden"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
