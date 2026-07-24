import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  boardBackgroundKey,
  createItem,
  deleteItem,
  getOrCreateBoard,
  getSignedPhotoUrls,
  listItems,
  updateBoardBackground,
  updateItem,
  uploadVisionPhoto,
  type VisionBoardItemRow,
  type VisionBoardRow,
} from "@/lib/vision-board/api";
import {
  bringForward,
  sendBackward,
  type BackgroundKey,
  type NoteColor,
} from "@/lib/vision-board/boardGeometry";
import { formatSupabaseError } from "@/lib/supabase/errors";

const SAVE_DEBOUNCE_MS = 400;

export function useVisionBoard(userId: string | undefined) {
  const [board, setBoard] = useState<VisionBoardRow | null>(null);
  const [items, setItems] = useState<VisionBoardItemRow[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const noteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshUrls = useCallback(async (rows: VisionBoardItemRow[]) => {
    const paths = rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
    if (!paths.length) {
      setPhotoUrls({});
      return;
    }
    const urls = await getSignedPhotoUrls(paths);
    setPhotoUrls(urls);
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const b = await getOrCreateBoard(userId);
      const rows = await listItems(b.id);
      setBoard(b);
      setItems(rows);
      await refreshUrls(rows);
    } catch (e) {
      toast({
        title: "Could not load vision board",
        description: formatSupabaseError(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [refreshUrls, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timers = saveTimers.current;
    const notes = noteTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      notes.forEach((t) => clearTimeout(t));
    };
  }, []);

  const background = board ? boardBackgroundKey(board) : ("cork" as BackgroundKey);

  const patchItemLocal = useCallback((id: string, patch: Partial<VisionBoardItemRow>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const scheduleSave = useCallback((id: string, patch: Partial<VisionBoardItemRow>) => {
    const existing = saveTimers.current.get(id);
    if (existing) clearTimeout(existing);
    saveTimers.current.set(
      id,
      setTimeout(() => {
        saveTimers.current.delete(id);
        void updateItem(id, patch).catch((e) => {
          toast({
            title: "Could not save item",
            description: formatSupabaseError(e),
            variant: "destructive",
          });
        });
      }, SAVE_DEBOUNCE_MS),
    );
  }, []);

  const onTransformLive = useCallback(
    (id: string, patch: Partial<VisionBoardItemRow>) => {
      patchItemLocal(id, patch);
    },
    [patchItemLocal],
  );

  const onTransformCommit = useCallback(
    (id: string, patch: Partial<VisionBoardItemRow>) => {
      patchItemLocal(id, patch);
      scheduleSave(id, patch);
    },
    [patchItemLocal, scheduleSave],
  );

  const onNoteTextChange = useCallback(
    (id: string, text: string) => {
      patchItemLocal(id, { text });
      const existing = noteTimers.current.get(id);
      if (existing) clearTimeout(existing);
      noteTimers.current.set(
        id,
        setTimeout(() => {
          noteTimers.current.delete(id);
          void updateItem(id, { text }).catch((e) => {
            toast({
              title: "Could not save note",
              description: formatSupabaseError(e),
              variant: "destructive",
            });
          });
        }, SAVE_DEBOUNCE_MS),
      );
    },
    [patchItemLocal],
  );

  const onNoteColorChange = useCallback(
    (id: string, color: NoteColor) => {
      patchItemLocal(id, { note_color: color });
      void updateItem(id, { note_color: color }).catch((e) => {
        toast({
          title: "Could not save note color",
          description: formatSupabaseError(e),
          variant: "destructive",
        });
      });
    },
    [patchItemLocal],
  );

  const setBackground = useCallback(
    async (key: BackgroundKey) => {
      if (!board) return;
      setBoard({ ...board, background_key: key });
      try {
        const updated = await updateBoardBackground(board.id, key);
        setBoard(updated);
      } catch (e) {
        toast({
          title: "Could not change background",
          description: formatSupabaseError(e),
          variant: "destructive",
        });
        void load();
      }
    },
    [board, load],
  );

  const addNote = useCallback(async () => {
    if (!userId || !board) return;
    setBusy(true);
    try {
      const row = await createItem(userId, board.id, {
        type: "note",
        text: "",
        note_color: "yellow",
        existingItems: items,
      });
      setItems((prev) => [...prev, row]);
      setSelectedId(row.id);
    } catch (e) {
      toast({
        title: "Could not add note",
        description: formatSupabaseError(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [board, items, userId]);

  const addPin = useCallback(async () => {
    if (!userId || !board) return;
    setBusy(true);
    try {
      const row = await createItem(userId, board.id, {
        type: "pin",
        existingItems: items,
      });
      setItems((prev) => [...prev, row]);
      setSelectedId(row.id);
    } catch (e) {
      toast({
        title: "Could not add pin",
        description: formatSupabaseError(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [board, items, userId]);

  const requestAddPhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onPhotoFiles = useCallback(
    async (files: FileList | null) => {
      if (!userId || !board || !files?.length) return;
      setBusy(true);
      try {
        const file = files[0];
        const tempId = crypto.randomUUID();
        const path = await uploadVisionPhoto(userId, tempId, file);
        const row = await createItem(userId, board.id, {
          type: "photo",
          storage_path: path,
          existingItems: items,
        });
        setItems((prev) => [...prev, row]);
        setSelectedId(row.id);
        const urls = await getSignedPhotoUrls([path]);
        setPhotoUrls((prev) => ({ ...prev, ...urls }));
      } catch (e) {
        toast({
          title: "Could not add photo",
          description: formatSupabaseError(e),
          variant: "destructive",
        });
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [board, items, userId],
  );

  const removeSelected = useCallback(async () => {
    if (!selectedId) return;
    const item = items.find((i) => i.id === selectedId);
    if (!item) return;
    setBusy(true);
    try {
      await deleteItem(item.id, item.storage_path);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedId(null);
    } catch (e) {
      toast({
        title: "Could not delete item",
        description: formatSupabaseError(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [items, selectedId]);

  const bringSelectedForward = useCallback(async () => {
    if (!selectedId) return;
    const next = bringForward(items, selectedId);
    setItems((prev) =>
      prev.map((i) => {
        const z = next.find((n) => n.id === i.id)?.z_index;
        return z === undefined ? i : { ...i, z_index: z };
      }),
    );
    const changed = next.filter((n) => {
      const orig = items.find((i) => i.id === n.id);
      return orig && orig.z_index !== n.z_index;
    });
    await Promise.all(changed.map((c) => updateItem(c.id, { z_index: c.z_index })));
  }, [items, selectedId]);

  const sendSelectedBackward = useCallback(async () => {
    if (!selectedId) return;
    const next = sendBackward(items, selectedId);
    setItems((prev) =>
      prev.map((i) => {
        const z = next.find((n) => n.id === i.id)?.z_index;
        return z === undefined ? i : { ...i, z_index: z };
      }),
    );
    const changed = next.filter((n) => {
      const orig = items.find((i) => i.id === n.id);
      return orig && orig.z_index !== n.z_index;
    });
    await Promise.all(changed.map((c) => updateItem(c.id, { z_index: c.z_index })));
  }, [items, selectedId]);

  return {
    board,
    items,
    photoUrls,
    selectedId,
    setSelectedId,
    loading,
    busy,
    background,
    setBackground,
    onTransformLive,
    onTransformCommit,
    onNoteTextChange,
    onNoteColorChange,
    addNote,
    addPin,
    requestAddPhoto,
    onPhotoFiles,
    fileInputRef,
    removeSelected,
    bringSelectedForward,
    sendSelectedBackward,
  };
}
