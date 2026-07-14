const TYPING_BUFFER_MIN_PX = 180;
const TYPING_BUFFER_MAX_PX = 320;
const TYPING_BUFFER_VIEWPORT_RATIO = 0.45;

export const JOURNAL_COMPOSE_KEYBOARD_GUTTER =
  "calc(env(safe-area-inset-bottom) + 0.75rem)";
export const JOURNAL_COMPOSE_RESTING_GUTTER =
  "max(env(safe-area-inset-bottom), 0.75rem)";
export const JOURNAL_COMPOSE_DOCKED_PADDING =
  "calc(env(safe-area-inset-bottom) + var(--journal-entry-dock-h, 9.5rem) + 0.75rem)";

type VisualViewportLayoutOptions = {
  isMobile: boolean;
  inMiniPhone: boolean;
  keyboardOpen: boolean;
};

type MainPaddingOptions = VisualViewportLayoutOptions & {
  bodyFocused: boolean;
  hideBottomChrome: boolean;
  inlineChatMode: boolean;
  viewportHeight: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function journalComposeUsesVisualViewportLayout({
  isMobile,
  inMiniPhone,
  keyboardOpen,
}: VisualViewportLayoutOptions): boolean {
  return (isMobile || inMiniPhone) && keyboardOpen;
}

export function journalComposeCaretKeyboardInset(
  keyboardInset: number,
  usesVisualViewportLayout: boolean,
): number {
  return usesVisualViewportLayout ? 0 : keyboardInset;
}

export function journalComposeTypingBufferPx(viewportHeight: number): number {
  const measured =
    Number.isFinite(viewportHeight) && viewportHeight > 0
      ? viewportHeight
      : TYPING_BUFFER_MIN_PX / TYPING_BUFFER_VIEWPORT_RATIO;
  return clamp(
    Math.round(measured * TYPING_BUFFER_VIEWPORT_RATIO),
    TYPING_BUFFER_MIN_PX,
    TYPING_BUFFER_MAX_PX,
  );
}

export function journalComposeMainPaddingBottom({
  bodyFocused,
  hideBottomChrome,
  inMiniPhone,
  inlineChatMode,
  isMobile,
  keyboardOpen,
  viewportHeight,
}: MainPaddingOptions): string {
  if (!hideBottomChrome) return JOURNAL_COMPOSE_DOCKED_PADDING;

  const needsTypingBuffer = (isMobile || inMiniPhone) && bodyFocused && !inlineChatMode;
  if (needsTypingBuffer) {
    return `calc(env(safe-area-inset-bottom) + ${journalComposeTypingBufferPx(viewportHeight)}px)`;
  }

  return keyboardOpen ? JOURNAL_COMPOSE_KEYBOARD_GUTTER : JOURNAL_COMPOSE_RESTING_GUTTER;
}
