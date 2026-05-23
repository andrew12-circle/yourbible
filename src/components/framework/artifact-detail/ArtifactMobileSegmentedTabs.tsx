import { BookOpen, FileText, StickyNote } from "lucide-react";
import type { ReactNode } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  trailing?: ReactNode;
};

const triggerClass = cn(
  "group inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border-0 px-2",
  "text-xs font-medium shadow-none transition-colors",
  "text-foreground/55 hover:text-foreground/80",
  "data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-foreground",
  "data-[state=active]:shadow-[0_1px_4px_rgba(0,0,0,0.12)] data-[state=active]:ring-1 data-[state=active]:ring-border/70",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

const iconClass = "h-3.5 w-3.5 shrink-0 opacity-70 group-data-[state=active]:opacity-100";

export default function ArtifactMobileSegmentedTabs({ className, trailing }: Props) {
  return (
    <div
      className={cn(
        "mx-3 my-1 flex h-10 w-[calc(100%-1.5rem)] items-center gap-1",
        className,
      )}
    >
      <TabsList className="grid h-full min-w-0 flex-1 grid-cols-3 gap-1 rounded-full border border-border/60 bg-muted p-1 text-foreground">
        <TabsTrigger value="study" className={triggerClass}>
          <BookOpen className={iconClass} aria-hidden />
          Study
        </TabsTrigger>
        <TabsTrigger value="transcript" className={triggerClass}>
          <FileText className={iconClass} aria-hidden />
          Transcript
        </TabsTrigger>
        <TabsTrigger value="notes" className={triggerClass}>
          <StickyNote className={iconClass} aria-hidden />
          Notes
        </TabsTrigger>
      </TabsList>
      {trailing}
    </div>
  );
}
