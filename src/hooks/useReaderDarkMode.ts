import { useCallback, useEffect, useState } from "react";
import {
  READER_DARK_CHANGE_EVENT,
  readReaderDarkPreference,
  writeReaderDarkMode,
  writeReaderDarkPreference,
  type ReaderDarkPreference,
} from "@/lib/bible/readerDarkMode";

const NIGHT_MODE_QUERY = "(prefers-color-scheme: dark)";

/** Bible page tone: follows the device by default; moon/sun toggles override. */
export function useReaderDarkMode() {
  const [preference, setPreference] = useState<ReaderDarkPreference>(readReaderDarkPreference);
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia?.(NIGHT_MODE_QUERY).matches === true : false,
  );

  useEffect(() => {
    const mq = window.matchMedia?.(NIGHT_MODE_QUERY);
    if (!mq) return;
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onPrefChange = (event: Event) => {
      const detail = (event as CustomEvent<ReaderDarkPreference>).detail;
      setPreference(detail ?? readReaderDarkPreference());
    };
    window.addEventListener(READER_DARK_CHANGE_EVENT, onPrefChange);
    return () => window.removeEventListener(READER_DARK_CHANGE_EVENT, onPrefChange);
  }, []);

  const readerDark =
    preference === "dark" ? true : preference === "light" ? false : systemDark;

  const setReaderDarkPreference = useCallback((next: ReaderDarkPreference) => {
    writeReaderDarkPreference(next);
    setPreference(next);
  }, []);

  const toggleReaderDark = useCallback(() => {
    setPreference((prev) => {
      const currentlyDark = prev === "dark" ? true : prev === "light" ? false : systemDark;
      const next = !currentlyDark;
      writeReaderDarkMode(next);
      return next ? "dark" : "light";
    });
  }, [systemDark]);

  return {
    readerDark,
    preference,
    setReaderDarkPreference,
    toggleReaderDark,
  };
}
