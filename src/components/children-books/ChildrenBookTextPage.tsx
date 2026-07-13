import { ChildrenBookGoldFlourish } from "@/components/children-books/ChildrenBookGoldFlourish";
import { SpreadPageSpineShade } from "@/components/children-books/SpreadPageSpineShade";
import { childrenBookPagePadding } from "@/lib/children-books/pageMargins";
import type { ChildrenBookPage } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

type ChildrenBookTextPageProps = {
  page: ChildrenBookPage;
  side: "left" | "right";
  singlePage: boolean;
  compactChrome?: boolean;
  className?: string;
};

export function ChildrenBookTextPage({
  page,
  side,
  singlePage,
  compactChrome,
  className,
}: ChildrenBookTextPageProps) {
  return (
    <article
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        "bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)]",
        className,
      )}
      style={childrenBookPagePadding(side, "text", singlePage, compactChrome)}
    >
      <SpreadPageSpineShade side={side} spread={!singlePage} />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.55), transparent 42%), radial-gradient(circle at 80% 85%, rgba(210,180,130,0.18), transparent 40%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-7 sm:px-10">
        <ChildrenBookGoldFlourish className="mb-6 shrink-0" />
        <p className="max-w-[22rem] text-left font-serif text-[1.05rem] leading-[1.75] text-foreground/88 sm:text-[1.12rem] sm:leading-[1.8]">
          {page.body}
        </p>
      </div>
    </article>
  );
}
