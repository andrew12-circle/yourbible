import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MarkKind = "highlight" | "underline";
export interface Highlight {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  /** CSS var name (e.g. "--hl-amber"). For underlines this is the ink color. */
  color: string;
  label: string | null;
  kind: MarkKind;
  /** Character range in verse text; both null = whole verse. */
  start_offset: number | null;
  end_offset: number | null;
}

export type MarkRange = {
  verse: number;
  start: number;
  end: number;
};
export interface Note {
  id: string; book: string; chapter: number; verse: number; body: string;
}
export interface Bookmark {
  id: string; label: string; color: "red" | "gold" | "blue";
  book: string; chapter: number; verse: number | null; position: 1 | 2 | 3;
}

export function useChapterData(book: string, chapter: number, enabled = true) {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const reload = useCallback(async () => {
    if (!enabled || !user) { setHighlights([]); setNotes([]); return; }
    const [{ data: h }, { data: n }] = await Promise.all([
      supabase.from("highlights").select("*").eq("user_id", user.id).eq("book", book).eq("chapter", chapter),
      supabase.from("notes").select("*").eq("user_id", user.id).eq("book", book).eq("chapter", chapter),
    ]);
    // Old rows have no `kind` — treat them as highlights.
    setHighlights(
      ((h ?? []) as Highlight[]).map(x => ({
        ...x,
        kind: x.kind ?? "highlight",
        start_offset: x.start_offset ?? null,
        end_offset: x.end_offset ?? null,
      })),
    );
    setNotes((n ?? []) as Note[]);
  }, [user, book, chapter, enabled]);

  useEffect(() => { reload(); }, [reload]);

  /**
   * Set or clear a mark on a verse. `kind` defaults to "highlight" so older
   * call sites keep working. Pass `color = null` to remove the mark.
   */
  const setMark = async (
    verse: number,
    color: string | null,
    kind: MarkKind = "highlight",
  ) => {
    if (!user) return;
    const existing = highlights.find(h => h.verse === verse && h.kind === kind);
    if (color === null && existing) {
      await supabase.from("highlights").delete().eq("id", existing.id);
    } else if (existing && color) {
      await supabase.from("highlights").update({ color }).eq("id", existing.id);
    } else if (color) {
      await supabase.from("highlights").insert({
        user_id: user.id,
        book,
        chapter,
        verse,
        color,
        kind,
        start_offset: null,
        end_offset: null,
      });
    }
    reload();
  };

  /**
   * Apply highlight/underline spans from a text selection (per-verse offsets).
   * Replaces existing marks of the same kind on touched verses.
   */
  const setMarkRanges = async (
    ranges: MarkRange[],
    color: string,
    kind: MarkKind = "highlight",
    verseLengths?: Map<number, number>,
  ) => {
    if (!user || ranges.length === 0) return;
    const verses = [...new Set(ranges.map(r => r.verse))];
    const { error: delErr } = await supabase
      .from("highlights")
      .delete()
      .eq("user_id", user.id)
      .eq("book", book)
      .eq("chapter", chapter)
      .eq("kind", kind)
      .in("verse", verses);
    if (delErr) throw delErr;

    const rows = ranges.map(r => {
      const len = verseLengths?.get(r.verse);
      const isWhole =
        len != null && r.start <= 0 && r.end >= len;
      return {
        user_id: user.id,
        book,
        chapter,
        verse: r.verse,
        color,
        kind,
        start_offset: isWhole ? null : r.start,
        end_offset: isWhole ? null : r.end,
      };
    });
    const { error: insErr } = await supabase.from("highlights").insert(rows);
    if (insErr) throw insErr;
    await reload();
  };

  /** Apply the same mark to many verses in one go (drag-select). */
  const setMarks = async (
    verses: number[],
    color: string | null,
    kind: MarkKind = "highlight",
  ) => {
    if (!user || verses.length === 0) return;
    const { error: delErr } = await supabase
      .from("highlights")
      .delete()
      .eq("user_id", user.id)
      .eq("book", book)
      .eq("chapter", chapter)
      .eq("kind", kind)
      .in("verse", verses);
    if (delErr) throw delErr;

    if (color !== null) {
      const rows = verses.map(v => ({
        user_id: user.id,
        book,
        chapter,
        verse: v,
        color,
        kind,
        start_offset: null,
        end_offset: null,
      }));
      const { error: insErr } = await supabase.from("highlights").insert(rows);
      if (insErr) throw insErr;
    }
    await reload();
  };

  // Back-compat alias for callers that only deal with highlights.
  const setHighlight = (verse: number, color: string | null) =>
    setMark(verse, color, "highlight");

  const upsertNote = async (verse: number, body: string) => {
    if (!user) return;
    const existing = notes.find(n => n.verse === verse);
    if (existing) await supabase.from("notes").update({ body }).eq("id", existing.id);
    else await supabase.from("notes").insert({ user_id: user.id, book, chapter, verse, body });
    reload();
  };

  const deleteNote = async (verse: number) => {
    const existing = notes.find(n => n.verse === verse);
    if (!existing) return;
    await supabase.from("notes").delete().eq("id", existing.id);
    reload();
  };

  return {
    highlights,
    notes,
    setHighlight,
    setMark,
    setMarks,
    setMarkRanges,
    upsertNote,
    deleteNote,
    reload,
  };
}

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("bookmarks").select("*").eq("user_id", user.id).order("position");
    setBookmarks((data ?? []) as Bookmark[]);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const setBookmark = async (b: Omit<Bookmark, "id">) => {
    if (!user) return;
    // Upsert by (user_id, position)
    const existing = bookmarks.find(x => x.position === b.position);
    if (existing) {
      await supabase.from("bookmarks").update({
        label: b.label, color: b.color, book: b.book, chapter: b.chapter, verse: b.verse,
      }).eq("id", existing.id);
    } else {
      await supabase.from("bookmarks").insert({ ...b, user_id: user.id });
    }
    reload();
  };

  const removeBookmark = async (position: 1 | 2 | 3) => {
    if (!user) return;
    await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("position", position);
    reload();
  };

  return { bookmarks, setBookmark, removeBookmark, reload };
}
