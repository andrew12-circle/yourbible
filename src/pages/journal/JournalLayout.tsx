import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

/**
 * Legacy layout kept for routes that embed a minimal back header outside JournalShell.
 * Prefer JournalShell for new journal sub-pages.
 */
export default function JournalLayout({
  title,
  back = "/journal",
  right,
  children,
  largeTitle = true,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
  children: ReactNode;
  largeTitle?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-background/70 border-b border-border/60 pt-[calc(var(--safe-area-inset-top)+0.5rem)]">
        <div className="max-w-3xl mx-auto px-4 h-11 flex items-center gap-1">
          <Link
            to={back}
            className="-ml-2 px-1 h-9 flex items-center gap-0.5 text-primary text-[17px] font-normal"
          >
            <ChevronLeft className="w-5 h-5 -mr-0.5" strokeWidth={2.5} />
            Back
          </Link>
          <div className="flex-1 text-center text-[15px] font-semibold tracking-tight truncate">
            {!largeTitle && title}
          </div>
          <div className="flex items-center gap-1 text-primary">{right}</div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 pt-3 pb-safe-28">
        {largeTitle && (
          <h1 className="font-display text-[34px] leading-tight tracking-tight mb-3">
            {title}
          </h1>
        )}
        {children}
      </main>
    </div>
  );
}