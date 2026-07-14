import { describe, expect, it } from "vitest";
import {
  JOURNAL_COMPOSE_DOCKED_PADDING,
  JOURNAL_COMPOSE_KEYBOARD_GUTTER,
  journalComposeCaretKeyboardInset,
  journalComposeMainPaddingBottom,
  journalComposeTypingBufferPx,
  journalComposeUsesVisualViewportLayout,
} from "./journalComposeKeyboardLayout";

describe("journal compose keyboard layout", () => {
  it("uses the visual viewport layout only for mobile keyboard sessions", () => {
    expect(
      journalComposeUsesVisualViewportLayout({
        isMobile: true,
        inMiniPhone: false,
        keyboardOpen: true,
      }),
    ).toBe(true);

    expect(
      journalComposeUsesVisualViewportLayout({
        isMobile: false,
        inMiniPhone: false,
        keyboardOpen: true,
      }),
    ).toBe(false);
  });

  it("does not double count the keyboard when the page already follows the visual viewport", () => {
    expect(journalComposeCaretKeyboardInset(284, true)).toBe(0);
    expect(journalComposeCaretKeyboardInset(284, false)).toBe(284);
  });

  it("keeps a bounded mobile typing buffer below the focused editor", () => {
    expect(journalComposeTypingBufferPx(500)).toBe(225);
    expect(journalComposeTypingBufferPx(240)).toBe(180);
    expect(journalComposeTypingBufferPx(900)).toBe(320);

    expect(
      journalComposeMainPaddingBottom({
        bodyFocused: true,
        hideBottomChrome: true,
        inMiniPhone: false,
        inlineChatMode: false,
        isMobile: true,
        keyboardOpen: true,
        viewportHeight: 500,
      }),
    ).toBe("calc(env(safe-area-inset-bottom) + 225px)");
  });

  it("preserves non-editor padding modes", () => {
    expect(
      journalComposeMainPaddingBottom({
        bodyFocused: false,
        hideBottomChrome: true,
        inMiniPhone: false,
        inlineChatMode: false,
        isMobile: true,
        keyboardOpen: true,
        viewportHeight: 500,
      }),
    ).toBe(JOURNAL_COMPOSE_KEYBOARD_GUTTER);

    expect(
      journalComposeMainPaddingBottom({
        bodyFocused: false,
        hideBottomChrome: false,
        inMiniPhone: false,
        inlineChatMode: false,
        isMobile: false,
        keyboardOpen: false,
        viewportHeight: 800,
      }),
    ).toBe(JOURNAL_COMPOSE_DOCKED_PADDING);
  });
});
