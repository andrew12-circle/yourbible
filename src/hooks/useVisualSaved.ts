import { useCallback, useEffect, useState } from "react";
import { parseSavedVisuals, savedVisualKey } from "@/lib/visualBible/explorerModel";
const read = (key: string) => { try { return parseSavedVisuals(localStorage.getItem(key)); } catch { return []; } };
export function useVisualSaved(ownerId?: string) {
  const key = savedVisualKey(ownerId);
  const [state, setState] = useState(() => ({ key, ids: read(key) }));
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => setState({ key, ids: read(key) });
    sync(); setError("");
    window.addEventListener("storage", sync);
    window.addEventListener("visual-saved-changed", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("visual-saved-changed", sync); };
  }, [key]);
  const toggle = useCallback((id: string) => {
    const current = read(key);
    if (!current.includes(id) && current.length >= 2000) { setError("Your saved collection is full. Remove a favorite before adding another."); return; }
    const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setState({ key, ids: next }); setError("");
      window.dispatchEvent(new Event("visual-saved-changed"));
    } catch { setError("This browser could not save your favorite. Your collection has not been changed."); }
  }, [key]);
  return { ids: state.key === key ? state.ids : [], toggle, error };
}
