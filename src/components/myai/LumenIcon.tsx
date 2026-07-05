import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Fire mark for Lumen AI — light and warmth. */
export function LumenIcon({ className }: { className?: string }) {
  return <Flame className={cn("shrink-0", className)} strokeWidth={1.75} aria-hidden />;
}
