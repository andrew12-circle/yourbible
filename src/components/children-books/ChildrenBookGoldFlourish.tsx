import { cn } from "@/lib/utils";

export function ChildrenBookGoldFlourish({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-2", className)} aria-hidden>
      <span className="h-px w-10 bg-gradient-to-r from-transparent via-amber-700/35 to-amber-600/70" />
      <span className="font-display text-sm text-amber-700/75">✦</span>
      <span className="h-px w-10 bg-gradient-to-l from-transparent via-amber-700/35 to-amber-600/70" />
    </div>
  );
}
