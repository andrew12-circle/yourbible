import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";

export type NativeKeyboardState = {
  open: boolean;
  reportedHeight: number;
};

const CLOSED_KEYBOARD: NativeKeyboardState = { open: false, reportedHeight: 0 };
let nativeKeyboardState = CLOSED_KEYBOARD;
const nativeKeyboardSubscribers = new Set<() => void>();

export function readNativeKeyboardState(): NativeKeyboardState {
  return nativeKeyboardState;
}

export function subscribeNativeKeyboardState(listener: () => void): () => void {
  nativeKeyboardSubscribers.add(listener);
  return () => nativeKeyboardSubscribers.delete(listener);
}

function publishNativeKeyboardState(next: NativeKeyboardState): void {
  if (
    next.open === nativeKeyboardState.open &&
    next.reportedHeight === nativeKeyboardState.reportedHeight
  ) {
    return;
  }
  nativeKeyboardState = next;
  nativeKeyboardSubscribers.forEach((listener) => listener());
}

/** Install the iOS keyboard contract once, before React mounts. */
export function installNativeKeyboard(): void {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;

  const root = document.documentElement;
  root.classList.add("capacitor-native");
  const syncStyle = () => {
    const style = root.classList.contains("dark") ? KeyboardStyle.Dark : KeyboardStyle.Light;
    void Keyboard.setStyle({ style }).catch(() => undefined);
  };

  void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => undefined);
  syncStyle();

  const themeObserver = new MutationObserver(syncStyle);
  themeObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

  void Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => {
    const reportedHeight = Math.max(0, Math.round(keyboardHeight));
    root.style.setProperty("--kb-inset", `${reportedHeight}px`);
    root.classList.add("kb-open");
    publishNativeKeyboardState({ open: true, reportedHeight });
  });
  void Keyboard.addListener("keyboardWillHide", () => {
    root.style.setProperty("--kb-inset", "0px");
    root.classList.remove("kb-open");
    publishNativeKeyboardState(CLOSED_KEYBOARD);
  });
}
