import { Link } from "react-router-dom";
import { Sunrise, ChevronRight } from "lucide-react";
import type { MorningEntrySourceLink } from "@/lib/livingHope/morningEntryLinks";
import { cn } from "@/lib/utils";

type Props = {
  links: MorningEntrySourceLink[];
  className?: string;
};

/** Backlinks from morning formula journal entries to First Light and sibling entries. */
export function MorningEntrySourceBanner({ links, className }: Props) {
  if (!links.length) return null;

  return (
    <div
      className={cn(
        "mb-4 rounded-xl border border-amber-400/30 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200 mb-2">
        First Light
      </p>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              to={link.href}
              className="flex items-center gap-2 text-[14px] text-foreground hover:text-primary transition-colors"
            >
              <Sunrise className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{link.label}</span>
                {link.detail ? (
                  <span className="block text-[12px] text-muted-foreground truncate">{link.detail}</span>
                ) : null}
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
