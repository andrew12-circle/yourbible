import { ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { sectionLabel } from "@/lib/framework/artifactSurfaces";

export type ArtifactNavSection = {
  id: string;
  hash: string;
  label: string;
  icon?: "index";
};

type Props = {
  sections: ArtifactNavSection[];
  activeHash: string;
  className?: string;
};

export default function ArtifactSectionNav({ sections, activeHash, className }: Props) {
  if (!sections.length) return null;

  return (
    <nav
      aria-label="On this page"
      className={cn(
        "sticky top-0 z-[15] -mx-0.5 mb-4 rounded-full bg-muted/40 p-1 backdrop-blur-md supports-[backdrop-filter]:bg-muted/30",
        className,
      )}
    >
      <p className={cn(sectionLabel, "mb-1.5 px-3 pt-1 sm:hidden")}>On this page</p>
      <div
        className="flex w-full gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {sections.map((section) => {
          const active = activeHash === section.hash;
          return (
            <a
              key={section.id}
              href={section.hash}
              role="tab"
              aria-selected={active}
              aria-current={active ? "location" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {section.icon === "index" ? (
                <ListOrdered className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              ) : null}
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
