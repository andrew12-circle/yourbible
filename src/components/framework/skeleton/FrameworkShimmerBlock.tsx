import { cn } from "@/lib/utils";

export function FrameworkShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
