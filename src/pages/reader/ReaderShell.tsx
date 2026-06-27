import type { ReactNode } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

type Props = {
  biblePane: ReactNode;
  notesPane?: ReactNode;
  companionPane?: ReactNode;
  /** When true, show Bible | Notes | AI three-column layout on wide screens. */
  threeColumn?: boolean;
  className?: string;
};

export function ReaderShell({
  biblePane,
  notesPane,
  companionPane,
  threeColumn = false,
  className,
}: Props) {
  const showSplit = threeColumn && companionPane != null;

  if (!showSplit) {
    return <div className={cn("flex min-h-0 flex-1 flex-col", className)}>{biblePane}</div>;
  }

  return (
    <PanelGroup direction="horizontal" className={cn("min-h-0 flex-1", className)}>
      <Panel defaultSize={58} minSize={40} className="min-h-0 flex flex-col">
        {biblePane}
      </Panel>
      {notesPane ? (
        <>
          <PanelResizeHandle className="w-1 bg-border/40 hover:bg-border transition-colors" />
          <Panel defaultSize={18} minSize={12} maxSize={28} className="min-h-0 hidden lg:flex flex-col border-l bg-paper/95">
            {notesPane}
          </Panel>
        </>
      ) : null}
      <PanelResizeHandle className="w-1 bg-border/40 hover:bg-border transition-colors hidden lg:block" />
      <Panel
        defaultSize={24}
        minSize={18}
        maxSize={36}
        className="min-h-0 hidden lg:flex flex-col border-l bg-background"
      >
        {companionPane}
      </Panel>
    </PanelGroup>
  );
}
