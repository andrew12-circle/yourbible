import { useEffect, useState } from "react";

/**
 * Changes after web fonts settle so hidden pagination measurements use the
 * same glyph widths and line wraps as the visible Bible page.
 */
export function useFontLoadRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const fontSet = document.fonts;
    if (!fontSet) return;

    let mounted = true;
    const bump = () => {
      if (mounted) setRevision((value) => value + 1);
    };

    void fontSet.ready.then(bump).catch(() => {});
    fontSet.addEventListener?.("loadingdone", bump);
    fontSet.addEventListener?.("loadingerror", bump);
    return () => {
      mounted = false;
      fontSet.removeEventListener?.("loadingdone", bump);
      fontSet.removeEventListener?.("loadingerror", bump);
    };
  }, []);

  return revision;
}
