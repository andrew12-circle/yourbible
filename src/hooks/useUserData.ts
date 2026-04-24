import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Highlight {
  id: string; book: string; chapter: number; verse: number; color: string; label: string | null;
}
export interface Note {
  id: string; book: string; chapter: number; verse: number; body: string;
}
export interface Bookmark {
  id: string; label: string; color: "red" | "gold" | "blue";
  book: string; chapter: number; verse: number | null; position: 1 | 2 | 3;
}

export function useChapterData(book: string, chapter: number) {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const reload = useCallback(async () => {
    if (!user) { setHighlights([]); setNotes([]); return; }
    const [{ data: h }, { data: n }] = await Promise.all([
      supabase.from("highlights").select("*").eq("user_id", user.id).eq("book", book).eq("chapter", chapter),
      supabase.from("notes").select("*").eq("user_id", user.id).eq("book", book).eq("chapter", chapter),
    ]);
    setHighlights((h ?? []) as Highlight[]);
    setNotes((n ?? []) as Note[]);
  }, [user, book, chapter]);

  useEffect(() => { reload(); }, [reload]);

  const setHighlight = async (verse: number, color: string | null) => {
    if (!user) return;
    const existing = highlights.find(h => h.verse === verse);
    if (color === null && existing) {
      await supabase.from("highlights").delete().eq("id", existing.id);
    } else if (existing && color) {
      await supabase.from("highlights").update({ color }).eq("id", existing.id);
    } else if (color) {
      await supabase.from("highlights").insert({ user_id: user.id, book, chapter, verse, color });
    }
    reload();
  };

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

  return { highlights, notes, setHighlight, upsertNote, deleteNote, reload };
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
