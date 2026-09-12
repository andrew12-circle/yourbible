/** Reapply two independent edits. Overlapping replacements require user review. */
export function mergeJournalText(base: string, local: string, remote: string): string | null {
  if (local === base || local === remote) return remote;
  if (remote === base) return local;
  const original = Array.from(base);
  const change = (text: string) => {
    const next = Array.from(text);
    let start = 0;
    while (start < original.length && start < next.length && original[start] === next[start]) start += 1;
    let end = original.length;
    let tail = next.length;
    while (end > start && tail > start && original[end - 1] === next[tail - 1]) { end -= 1; tail -= 1; }
    return { start, end, added: next.slice(start, tail) };
  };
  const left = change(local);
  const right = change(remote);
  // Two inserts at the same caret are ambiguous; do not choose an order silently.
  if (left.start === right.start && left.end === left.start && right.end === right.start) return null;
  if (!(left.end <= right.start || right.end <= left.start)) return null;
  const changes = [left, right].sort((a, b) => b.start - a.start);
  let result = [...original];
  for (const edit of changes) result = result.slice(0, edit.start).concat(edit.added, result.slice(edit.end));
  return result.join("");
}

function insert(body: string, anchor: number, text: string): string {
  const offset = Math.max(0, Math.min(anchor, body.length));
  return [body.slice(0, offset).trimEnd(), text.trim(), body.slice(offset).trimStart()].filter(Boolean).join("\n\n");
}

/** Prepared transcript text only. Never rebuild a journal from an old recording snapshot. */
export function mergeVideoTranscriptSafely(options: {
  current: string; transcript: string; previousTranscript?: string;
  anchor: number; snap: { body: string; anchor: number } | null;
}): string {
  const text = options.transcript.trim();
  if (!text) return options.current;
  const current = options.current;
  // A retry after an acknowledged merge must not replay the same complete paragraph.
  if (current.trim() === text || (`\n\n${current.trim()}\n\n`).includes(`\n\n${text}\n\n`)) return current;
  const { snap } = options;
  if (snap && options.previousTranscript?.trim()) {
    const prior = insert(snap.body, snap.anchor, options.previousTranscript);
    const final = insert(snap.body, snap.anchor, text);
    const merged = mergeJournalText(prior, current, final);
    if (merged !== null) return merged;
    // The user edited the caption itself. Preserve that text and append the full
    // new transcript rather than silently replacing a human edit.
  }
  const offset = snap && current === snap.body ? snap.anchor : current.length;
  return insert(current, offset, text);
}
