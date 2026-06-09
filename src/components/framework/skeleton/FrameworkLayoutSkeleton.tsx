import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FrameworkShimmerBlock } from "./FrameworkShimmerBlock";

interface Props {
  children: ReactNode;
  /** Shimmer width for the title placeholder in the header row. */
  titleClassName?: string;
  /** Match workspace / library / immersive main padding when needed. */
  mainClassName?: string;
}

export function FrameworkLayoutSkeleton({
  children,
  titleClassName = "h-7 w-36 max-w-[45%]",
  mainClassName,
}: Props) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-30 shrink-0 border-b border-border/40 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/78">
        <div className="mx-auto flex max-w-none items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <FrameworkShimmerBlock className="h-9 w-9 shrink-0 rounded-lg" />
          <FrameworkShimmerBlock className={cn("min-w-0 flex-1", titleClassName)} />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-1.5">
            <FrameworkShimmerBlock className="h-9 w-9 rounded-lg" />
            <FrameworkShimmerBlock className="hidden h-9 w-[4.5rem] rounded-lg sm:block" />
          </div>
        </div>
      </header>
      <main
        className={cn(
          "mx-auto max-w-none px-4 pt-8 pb-[calc(2rem+var(--safe-area-inset-bottom))] sm:px-5 sm:py-10",
          mainClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}
