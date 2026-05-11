import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Menu } from "lucide-react";
import { Journal } from "@/lib/journal/journals";

interface Props {
  journal: Journal | null; // null = aggregate "All Entries"
  subtitle?: string;
  /** Tabs to render under the cover. Pass an array of {label, to, key, active}. */
  tabs?: { key: string; label: string; to: string; active?: boolean }[];
  /** Optional right-side header buttons. */
  right?: ReactNode;
  /** Mobile menu trigger (open the rail in a sheet). */
  onOpenRail?: () => void;
  /** Where the back button goes on mobile (defaults to /journal). */
  backTo?: string;
}

export default function JournalCover({
  journal,
  subtitle,
  tabs,
  right,
  onOpenRail,
  backTo = "/home",
}: Props) {
  const color = journal ? `hsl(${journal.color})` : "hsl(220 9% 46%)";
  const title = journal?.name ?? "All Entries";

  return (
    <header className="relative">
      {/* Big colored cover */}
      <div
        className="relative pt-3 pb-10 px-5"
        style={{
          background: journal
            ? `linear-gradient(180deg, hsl(${journal.color}) 0%, hsl(${journal.color}) 100%)`
            : "linear-gradient(180deg, hsl(220 14% 22%) 0%, hsl(220 14% 28%) 100%)",
        }}
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenRail}
              className="md:hidden -ml-2 p-2 rounded-full hover:bg-white/15"
              aria-label="Journals"
            >
              <Menu className="w-[22px] h-[22px]" strokeWidth={2.2} />
            </button>
            <Link
              to={backTo}
              className="hidden md:flex items-center gap-0.5 -ml-2 px-1 h-9 text-white/90 hover:text-white text-[15px]"
            >
              <ChevronLeft className="w-5 h-5 -mr-0.5" strokeWidth={2.5} />
              Home
            </Link>
          </div>
          <div className="flex items-center gap-1 text-white">{right}</div>
        </div>

        <div className="mt-6">
          <h1 className="text-[40px] leading-none font-bold tracking-tight text-white drop-shadow-sm">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[14px] mt-2 text-white/85 font-medium tracking-wide">{subtitle}</p>
          )}
        </div>
      </div>

      {/* White card with tabs sliding up underneath */}
      <div className="relative -mt-6 bg-background rounded-t-[20px] shadow-[0_-8px_24px_-12px_hsl(0_0%_0%/0.15)]">
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-5 px-5 pt-3 pb-1 overflow-x-auto scrollbar-hide">
            {tabs.map((t) => (
              <Link
                key={t.key}
                to={t.to}
                className={`relative pb-2 text-[15px] font-medium transition-colors whitespace-nowrap ${
                  t.active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                style={t.active ? { color } : undefined}
              >
                {t.label}
                {t.active && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-[2.5px] rounded-full"
                    style={{ background: color }}
                  />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}