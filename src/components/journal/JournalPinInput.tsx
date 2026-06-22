import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PIN_LENGTH, normalizePin } from "@/lib/crypto/journalPinCrypto";

type Props = {
  value: string;
  onChange: (pin: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** Shown on error (e.g. wrong PIN). */
  error?: boolean;
};

/** Six-digit PIN entry — one hidden input drives OTP-style cells. */
export function JournalPinInput({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
  className,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const digits = normalizePin(value).padEnd(PIN_LENGTH, " ").split("").slice(0, PIN_LENGTH);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleChange = useCallback(
    (raw: string) => {
      const next = normalizePin(raw);
      onChange(next);
      if (next.length === PIN_LENGTH) onComplete?.(next);
    },
    [onChange, onComplete],
  );

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={PIN_LENGTH}
        disabled={disabled}
        value={normalizePin(value)}
        onChange={(e) => handleChange(e.target.value)}
        className="absolute inset-0 h-full w-full opacity-0 cursor-text"
        aria-label="6-digit journal PIN"
      />
      <div
        className="flex justify-center gap-2 sm:gap-3"
        onClick={() => inputRef.current?.focus()}
        role="presentation"
      >
        {digits.map((d, i) => (
          <div
            key={i}
            className={cn(
              "flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-xl border-2 text-lg font-semibold tabular-nums transition-colors",
              error
                ? "border-destructive bg-destructive/5"
                : d.trim()
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30",
              !disabled && "hover:border-primary/40",
            )}
          >
            {d.trim() ? "•" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
