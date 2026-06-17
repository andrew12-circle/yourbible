/** Map a cursor index from old text to new text after a light edit (e.g. spell fix). */
export function mapCursorAfterEdit(oldText: string, newText: string, cursor: number): number {
  if (oldText === newText) return cursor;
  if (cursor <= 0) return 0;
  if (cursor >= oldText.length) return newText.length;

  let prefix = 0;
  const maxPrefix = Math.min(oldText.length, newText.length, cursor);
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix += 1;

  if (cursor <= prefix) return cursor;

  let oldSuffix = 0;
  let newSuffix = 0;
  while (
    oldSuffix < oldText.length - prefix &&
    newSuffix < newText.length - prefix &&
    oldText[oldText.length - 1 - oldSuffix] === newText[newText.length - 1 - newSuffix]
  ) {
    oldSuffix += 1;
    newSuffix += 1;
  }

  const oldMiddleLen = oldText.length - prefix - oldSuffix;
  const newMiddleLen = newText.length - prefix - newSuffix;
  const cursorInMiddle = cursor - prefix;

  if (cursorInMiddle >= oldMiddleLen) {
    return prefix + newMiddleLen + (cursor - prefix - oldMiddleLen);
  }

  if (oldMiddleLen === 0) return prefix + cursorInMiddle;
  const ratio = cursorInMiddle / oldMiddleLen;
  return prefix + Math.round(ratio * newMiddleLen);
}
