import { motion } from "framer-motion";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function MorningGuidedCoach({ children, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-orange-500/5 px-4 py-4",
        className,
      )}
    >
      <p className={cn(lh.bodyLg, "text-[17px] leading-relaxed mb-0")}>{children}</p>
    </motion.div>
  );
}
