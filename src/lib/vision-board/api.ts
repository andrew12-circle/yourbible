import { getSignedPhotoUrl, getSignedPhotoUrls } from "@/lib/journal/photos";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { throwSupabaseError } from "@/lib/supabase/errors";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  defaultSizeForType,
  nextZIndex,
  normalizeBackgroundKey,
  normalizeNoteColor,
  type BackgroundKey,
  type NoteColor,
  type VisionBoardItemType,
} from "@/lib/vision-board/boardGeometry";

export type VisionBoardRow = Tables<"vision_boards">;
export type VisionBoardItemRow = Tables<"vision_board_items">;

export { getSignedPhotoUrl, getSignedPhotoUrls };

export async function getOrCreateBoard(userId: string): Promise<VisionBoardRow> {
  const { data: existing, error: selErr } = await supabase
    .from("vision_boards")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) throwSupabaseError(selErr);
  if (existing) return existing;

  const insert: TablesInsert<"vision_boards"> = {
    user_id: userId,
    background_key: "cork",
  };
  const { data, error } = await supabase.from("vision_boards").insert(insert).select().single();
  if (error) throwSupabaseError(error);
  return data;
}

export async function updateBoardBackground(
  boardId: string,
  backgroundKey: BackgroundKey,
): Promise<VisionBoardRow> {
  const { data, error } = await supabase
    .from("vision_boards")
    .update({ background_key: backgroundKey })
    .eq("id", boardId)
    .select()
    .single();
  if (error) throwSupabaseError(error);
  return data;
}

export async function listItems(boardId: string): Promise<VisionBoardItemRow[]> {
  const { data, error } = await supabase
    .from("vision_board_items")
    .select("*")
    .eq("board_id", boardId)
    .order("z_index", { ascending: true });
  if (error) throwSupabaseError(error);
  return data ?? [];
}

export async function createItem(
  userId: string,
  boardId: string,
  input: {
    type: VisionBoardItemType;
    text?: string | null;
    note_color?: NoteColor | null;
    storage_path?: string | null;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    z_index?: number;
    existingItems?: { z_index: number }[];
  },
): Promise<VisionBoardItemRow> {
  const size = defaultSizeForType(input.type);
  const row: TablesInsert<"vision_board_items"> = {
    user_id: userId,
    board_id: boardId,
    type: input.type,
    text: input.text ?? (input.type === "note" ? "" : null),
    note_color: input.type === "note" ? normalizeNoteColor(input.note_color) : null,
    storage_path: input.storage_path ?? null,
    x: input.x ?? BOARD_WIDTH / 2 - size.width / 2,
    y: input.y ?? BOARD_HEIGHT / 2 - size.height / 2,
    width: input.width ?? size.width,
    height: input.height ?? size.height,
    rotation: input.rotation ?? (input.type === "note" ? -3 + Math.random() * 6 : 0),
    z_index: input.z_index ?? nextZIndex(input.existingItems ?? []),
  };
  const { data, error } = await supabase.from("vision_board_items").insert(row).select().single();
  if (error) throwSupabaseError(error);
  return data;
}

export async function updateItem(
  id: string,
  patch: TablesUpdate<"vision_board_items">,
): Promise<VisionBoardItemRow> {
  const { data, error } = await supabase
    .from("vision_board_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throwSupabaseError(error);
  return data;
}

export async function deleteItem(id: string, storagePath?: string | null): Promise<void> {
  if (storagePath) {
    await supabase.storage.from("journal-photos").remove([storagePath]);
  }
  const { error } = await supabase.from("vision_board_items").delete().eq("id", id);
  if (error) throwSupabaseError(error);
}

export async function uploadVisionPhoto(
  userId: string,
  itemId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp|heic|gif)$/i.test(ext) ? ext : "jpg";
  const path = `${userId}/vision-board/${itemId}.${safeExt}`;
  const { error } = await supabase.storage
    .from("journal-photos")
    .upload(path, file, { upsert: true, contentType: file.type || `image/${safeExt}` });
  if (error) throw error;
  return path;
}

export function boardBackgroundKey(board: VisionBoardRow): BackgroundKey {
  return normalizeBackgroundKey(board.background_key);
}
