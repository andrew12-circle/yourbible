/** Insert spoken transcript at the anchor where video recording started. */
export function insertTranscriptAtAnchor(body: string, anchorOffset: number, transcript: string): string {
  const t = transcript.trim();
  if (!t) return body;
  const safeAnchor = Math.max(0, Math.min(anchorOffset, body.length));
  const before = body.slice(0, safeAnchor).trimEnd();
  const after = body.slice(safeAnchor).trimStart();
  if (!before) return after ? `${t}\n\n${after}` : t;
  if (!after) return `${before}\n\n${t}`;
  return `${before}\n\n${t}\n\n${after}`;
}

export function clampAnchorOffset(body: string, offset: number): number {
  return Math.max(0, Math.min(offset, body.length));
}

/** Detect mistaken toolbar-click anchors that split a word (e.g. "finally a|ble"). */
export function isLikelyMisplacedVideoAnchor(body: string, anchor: number): boolean {
  if (!body.trim()) return false;
  if (anchor <= 0) return true;
  if (anchor >= body.length) return false;
  const before = body[anchor - 1];
  const after = body[anchor];
  return Boolean(before && after && /\w/.test(before) && /\w/.test(after));
}

/** Anchor used when rendering inline video — repairs legacy bad anchors in the UI. */
export function effectiveVideoAnchor(body: string, anchorOffset: number | null | undefined): number {
  const raw = anchorOffset ?? 0;
  const clamped = clampAnchorOffset(body, raw);
  if (isLikelyMisplacedVideoAnchor(body, clamped)) return body.length;
  return clamped;
}

export type VideoAnchorOptions = {
  /** Caret index in the full body string when the editor is focused. */
  caret?: number | null;
  /** True when a body textarea currently has focus (caret is meaningful). */
  bodyEditorFocused?: boolean;
};

/** Pick where an inline video belongs: at the caret while editing, otherwise after existing text. */
export function resolveVideoAnchorOffset(body: string, options: VideoAnchorOptions = {}): number {
  const len = body.length;
  const { caret, bodyEditorFocused } = options;

  if (bodyEditorFocused && caret != null) {
    // Caret at start with content usually means an unset selection (dictation, loaded entry), not "insert at top".
    if (caret === 0 && body.trim().length > 0) return len;
    return clampAnchorOffset(body, caret);
  }

  return len;
}
