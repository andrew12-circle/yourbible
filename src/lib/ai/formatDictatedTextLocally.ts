/** Best-effort formatter when the AI gateway is unavailable. */
export function formatDictatedTextLocally(text: string): string {
  let s = text.trim().replace(/\s+/g, " ");
  if (!s) return text;

  const capitalize = (chunk: string) => {
    const t = chunk.trim();
    if (!t) return "";
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  // Insert sentence breaks before common spoken pivots (only when the run is long).
  const pivotRe =
    /\s+(and then|so|but|however|also|because|when i|when we|now|okay|all right)\s+/gi;
  const parts: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pivotRe.exec(s)) !== null) {
    const idx = m.index;
    const segment = s.slice(last, idx).trim();
    if (segment.length >= 80) {
      parts.push(capitalize(segment.endsWith(".") ? segment : `${segment}.`));
      last = idx + m[0].length;
    }
  }
  const tail = s.slice(last).trim();
  if (parts.length === 0) {
    const one = capitalize(tail);
    return /[.!?]$/.test(one) ? one : `${one}.`;
  }
  if (tail) {
    parts.push(capitalize(/[.!?]$/.test(tail) ? tail : `${tail}.`));
  }
  return parts.join("\n\n");
}
