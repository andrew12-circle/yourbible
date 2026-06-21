import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import type { ToolbarSelection } from "@/components/bible/SelectionToolbar";

type Args = {
  pinnedSelection: () => ToolbarSelection | null;
  clearWindowSelection: () => void;
  persistHighlightColor: (cssVar: string) => void;
  setMarkTool: (tool: "highlight" | "underline") => void;
  setMarkRanges: (
    ranges: ToolbarSelection["ranges"],
    cssVar: string,
    kind: "highlight",
    verseLengths: Map<number, number>,
  ) => Promise<void>;
  setMarks: (
    verses: number[],
    cssVar: string | null,
    kind: "highlight" | "underline",
  ) => Promise<void>;
  verseLengths: Map<number, number>;
  ulFor: (verse: number) => unknown;
  setNoteOpen: (v: { verse: number } | null) => void;
};

export function useReaderSelectionMarks({
  pinnedSelection,
  clearWindowSelection,
  persistHighlightColor,
  setMarkTool,
  setMarkRanges,
  setMarks,
  verseLengths,
  ulFor,
  setNoteOpen,
}: Args) {
  const applyHighlightToSelection = useCallback(
    async (cssVar: string) => {
      const sel = pinnedSelection();
      if (!sel || sel.verses.length === 0) return;
      persistHighlightColor(cssVar);
      try {
        if (sel.ranges.length > 0) {
          await setMarkRanges(sel.ranges, cssVar, "highlight", verseLengths);
        } else {
          await setMarks(sel.verses, cssVar, "highlight");
        }
      } catch (err) {
        console.error(err);
        toast({
          variant: "destructive",
          title: "Couldn't save highlight",
          description: err instanceof Error ? err.message : "Please try again.",
        });
        return;
      }
      clearWindowSelection();
    },
    [
      pinnedSelection,
      persistHighlightColor,
      setMarkRanges,
      verseLengths,
      setMarks,
      clearWindowSelection,
    ],
  );

  const applyUnderlineToSelection = useCallback(async () => {
    const sel = pinnedSelection();
    if (!sel) return;
    setMarkTool("underline");
    const allUnderlined = sel.verses.every((v) => !!ulFor(v));
    try {
      await setMarks(sel.verses, allUnderlined ? null : "--leather", "underline");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Couldn't save underline",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return;
    }
    clearWindowSelection();
  }, [pinnedSelection, setMarkTool, ulFor, setMarks, clearWindowSelection]);

  const clearMarksOnSelection = useCallback(async () => {
    const sel = pinnedSelection();
    if (!sel) return;
    try {
      await Promise.all([
        setMarks(sel.verses, null, "highlight"),
        setMarks(sel.verses, null, "underline"),
      ]);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Couldn't clear mark",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return;
    }
    clearWindowSelection();
  }, [pinnedSelection, setMarks, clearWindowSelection]);

  const noteOnSelection = useCallback(() => {
    const sel = pinnedSelection();
    if (!sel) return;
    setNoteOpen({ verse: sel.verses[0] });
    clearWindowSelection();
  }, [pinnedSelection, setNoteOpen, clearWindowSelection]);

  return {
    applyHighlightToSelection,
    applyUnderlineToSelection,
    clearMarksOnSelection,
    noteOnSelection,
  };
}
