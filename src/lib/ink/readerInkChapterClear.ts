import { supabase } from "@/integrations/supabase/client";
import { clearAllLocalReaderInkForChapter } from "@/lib/ink/localInkStore";

export async function clearReaderInkChapter(
  userId: string | undefined,
  book: string,
  chapter: number,
): Promise<void> {
  clearAllLocalReaderInkForChapter(book, chapter);
  if (!userId) return;
  const { error } = await supabase
    .from("reader_page_ink")
    .delete()
    .eq("user_id", userId)
    .eq("book", book)
    .eq("chapter", chapter);
  if (error) console.warn("[readerInkChapterClear] delete failed", error.message);
}
