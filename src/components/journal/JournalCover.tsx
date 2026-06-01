import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Menu } from "lucide-react";
import { Journal } from "@/lib/journal/journals";
import { journalCoverObjectPosition } from "@/lib/journal/covers";
import { useJournalCoverBanner } from "@/hooks/useJournalCoverBanner";

interface Props {
  journal: Journal | null; // null = aggregate "All Entries"
  subtitle?: string;
  /** When set, replaces journal name / "All Entries" as the main cover title. */
  titleOverride?: string;
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
  titleOverride,
  tabs,
  right,
  onOpenRail,
  backTo = "/home",
}: Props) {
  const color = journal ? `hsl(${journal.color})` : "hsl(220 9% 46%)";
  const title = titleOverride ?? journal?.name ?? "All Entries";
  const { coverUrl, focal, hasPhoto } = useJournalCoverBanner(journal);

  const colorGradient = journal
    ? `radial-gradient(120% 140% at 0% 0%, hsl(${journal.color} / 0.92) 0%, hsl(${journal.color}) 55%, hsl(${journal.color} / 0.78) 100%)`
    : "radial-gradient(120% 140% at 0% 0%, hsl(220 14% 18%) 0%, hsl(220 14% 26%) 60%, hsl(220 14% 32%) 100%)";

  return (
    <header className="relative">
      <div className="relative pt-3 pb-12 px-5 overflow-hidden">
        {hasPhoto && coverUrl ? (
          <>
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                objectPosition: journalCoverObjectPosition({
                  cover_focal_x: focal.x,
                  cover_focal_y: focal.y,
                }),
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/15"
              aria-hidden
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: colorGradient }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(80% 50% at 100% 0%, rgba(255,255,255,0.18), transparent 60%)",
              }}
              aria-hidden
            />
          </>
        )}

        <div className="relative flex items-center justify-between text-white">
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

        <div className="relative mt-8">
          {subtitle && (
            <p className="text-[12px] uppercase tracking-[0.16em] text-white/75 font-semibold mb-2">
              {subtitle}
            </p>
          )}
          <h1 className="text-[44px] leading-[1.02] font-bold tracking-tight text-white drop-shadow-sm">
            {title}
          </h1>
        </div>
      </div>

      <div className="relative -mt-5 bg-background rounded-t-[22px] shadow-[0_-10px_30px_-18px_hsl(0_0%_0%/0.25)]">
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-6 px-5 pt-3.5 pb-0.5 overflow-x-auto scrollbar-hide">
            {tabs.map((t) => (
              <Link
                key={t.key}
                to={t.to}
                className={`relative pb-2.5 text-[14px] font-semibold tracking-tight transition-colors whitespace-nowrap ${
                  t.active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                style={t.active ? { color } : undefined}
              >
                {t.label}
                {t.active && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
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
