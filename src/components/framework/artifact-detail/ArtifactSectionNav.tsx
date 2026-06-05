import type { ComponentType } from "react";
import { BookOpen, Bookmark, LayoutList, ListOrdered, Sparkles, Video } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { artifactSectionNavStickyBelowVideo } from "@/lib/framework/artifactLayoutCss";
import { artifactDesktopTabActive, sectionLabel } from "@/lib/framework/artifactSurfaces";

export type ArtifactNavSection = {
  id: string;
  hash: string;
  label: string;
  icon?: "index";
};

type Props = {
  sections: ArtifactNavSection[];
  activeHash: string;
  /** When true, pin below sticky video + framework header (phone/tablet window scroll). */
  stickyVideoLayout?: boolean;
  /** Premium desktop tabs with underline active state. */
  variant?: "default" | "desktop";
  className?: string;
};

const SECTION_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  overview: Sparkles,
  video: Video,
  chapters: LayoutList,
  teachings: BookOpen,
  claims: Sparkles,
  "claims-index": ListOrdered,
  capture: Bookmark,
};

function navigateToHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  window.location.hash = id;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ArtifactSectionNav({
  sections,
  activeHash,
  stickyVideoLayout = false,
  variant = "default",
  className,
}: Props) {
  if (!sections.length) return null;

  const isDesktopVariant = variant === "desktop";
  const resolvedHash = sections.some((s) => s.hash === activeHash)
    ? activeHash
    : sections[0].hash;

  return (
    <nav
      aria-label="On this page"
      className={cn(
        "-mx-0.5 hidden md:block",
        isDesktopVariant
          ? "mb-4 border-b border-border/50"
          : "mb-4 rounded-2xl border border-border/40 bg-muted/40 p-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-muted/30 sm:rounded-full sm:border-0 sm:p-1",
        stickyVideoLayout
          ? artifactSectionNavStickyBelowVideo
          : !isDesktopVariant && "sticky top-0 z-[15]",
        className,
      )}
    >
      <p className={cn(sectionLabel, "mb-1.5 px-2 pt-0.5 sm:hidden")}>On this page</p>

      <div className="px-1 md:hidden">
        <Select
          value={resolvedHash}
          onValueChange={(value) => navigateToHash(value)}
        >
          <SelectTrigger className="h-9 rounded-full bg-background/90 text-xs shadow-sm" aria-label="Jump to section">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.hash} className="text-xs">
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "scrollbar-hide hidden w-full overflow-x-auto md:flex",
          isDesktopVariant ? "gap-1" : "gap-0.5",
        )}
        role="tablist"
      >
        {sections.map((section) => {
          const active = resolvedHash === section.hash;
          const Icon = SECTION_ICONS[section.id] ?? (section.icon === "index" ? ListOrdered : null);
          return (
            <a
              key={section.id}
              href={section.hash}
              role="tab"
              aria-selected={active}
              aria-current={active ? "location" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium transition-all duration-200",
                isDesktopVariant
                  ? cn(
                      "border-b-2 border-transparent px-3 py-2.5 text-sm",
                      active ? artifactDesktopTabActive : "text-muted-foreground hover:text-foreground",
                    )
                  : cn(
                      "rounded-full px-3 py-1.5 text-xs",
                      active
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                    ),
              )}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    active && isDesktopVariant ? "text-primary opacity-100" : "opacity-75",
                  )}
                  aria-hidden
                />
              ) : null}
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
