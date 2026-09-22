import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DictateButton } from "@/components/journal/DictateButton";
import { JournalAiPrivacy } from "@/components/journal/JournalAiPrivacy";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { lh } from "@/lib/livingHope/themeClasses";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  className?: string;
};

export function MorningVoiceField({
  value,
  onChange,
  label,
  placeholder,
  rows = 3,
  multiline = false,
  className,
}: Props) {
  const { user, profile } = useAuth();
  const allowed = Boolean(user && profile && profile.user_id === user.id) && !profile?.journal_e2e_enabled;
  const append = (chunk: string) => {
    const spoken = chunk.trim();
    if (!spoken) return;
    onChange(value.trim() ? `${value.trimEnd()} ${spoken}` : spoken);
  };

  return (
    <JournalAiPrivacy.Provider value={allowed}>
      <div className="relative">
        {multiline ? (
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={rows}
            className={cn(lh.textarea, "pr-12", className)}
            placeholder={placeholder}
            aria-label={label}
          />
        ) : (
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={cn(lh.input, "pr-12", className)}
            placeholder={placeholder}
            aria-label={label}
          />
        )}
        <div className={cn("absolute right-1.5", multiline ? "top-1.5" : "top-1/2 -translate-y-1/2")}>
          <DictateButton
            userId={user?.id}
            webSpeechOnly
            className="h-9 w-9 rounded-full border border-border/60 bg-background/90"
            onAppend={append}
          />
        </div>
      </div>
    </JournalAiPrivacy.Provider>
  );
}
