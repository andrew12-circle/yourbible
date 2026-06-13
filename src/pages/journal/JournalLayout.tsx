import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import MobilePageShell from "@/components/shell/MobilePageShell";

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
    <MobilePageShell
      headerClassName="backdrop-blur-2xl bg-background/70 border-border/60"
      header={
        <div className="mx-auto flex h-11 max-w-3xl items-center gap-1 px-4">
          <Link
            to={back}
            className="-ml-2 flex h-9 items-center gap-0.5 px-1 text-[17px] font-normal text-primary"
          >
            <ChevronLeft className="-mr-0.5 h-5 w-5" strokeWidth={2.5} />
            Back
          </Link>
          <div className="flex-1 truncate text-center text-[15px] font-semibold tracking-tight">
            {!largeTitle && title}
          </div>
          <div className="flex items-center gap-1 text-primary">{right}</div>
        </div>
      }
      mainClassName="mx-auto max-w-3xl px-4 pt-3"
    >
      {largeTitle && (
        <h1 className="mb-3 font-display text-[34px] leading-tight tracking-tight">{title}</h1>
      )}
      {children}
    </MobilePageShell>
  );
}
