import { EyeOff, ScanEye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";

type Props = {
  /** Icon-only toolbar button (default). */
  variant?: "icon" | "switch";
  className?: string;
  /** Light text for gradient journal headers. */
  tone?: "default" | "onCover";
};

export default function JournalPrivacyBlurToggle({
  variant = "icon",
  className,
  tone = "default",
}: Props) {
  const enabled = useJournalPrivacyBlurStore((s) => s.journalPrivacyBlurEnabled);
  const toggle = useJournalPrivacyBlurStore((s) => s.toggleJournalPrivacyBlur);

  if (variant === "switch") {
    return null;
  }

  const Icon = enabled ? ScanEye : EyeOff;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        tone === "onCover"
          ? enabled
            ? "bg-white/25 text-white"
            : "text-white/90 hover:bg-white/15"
          : enabled
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      aria-label={enabled ? "Blur mode on" : "Blur mode off"}
      aria-pressed={enabled}
      title={
        enabled
          ? "Blur mode on — settled text is hidden in public"
          : "Blur mode — hide settled text in public (only your last word stays readable)"
      }
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function JournalPrivacyBlurToolbarButton({ className }: { className?: string }) {
  const enabled = useJournalPrivacyBlurStore((s) => s.journalPrivacyBlurEnabled);
  const toggle = useJournalPrivacyBlurStore((s) => s.toggleJournalPrivacyBlur);
  const Icon = enabled ? ScanEye : EyeOff;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "p-1.5 rounded-md hover:bg-muted",
        enabled ? "text-primary bg-primary/10" : "text-muted-foreground",
        className,
      )}
      aria-label={enabled ? "Blur mode on" : "Blur mode off"}
      aria-pressed={enabled}
      title={
        enabled
          ? "Blur mode on"
          : "Blur mode — hide settled text in public"
      }
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
