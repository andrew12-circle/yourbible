import { useState } from "react";
import { Check, Copy, Pencil, RefreshCw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  role: "user" | "assistant";
  content: string;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onReadAloud?: () => void;
  busy?: boolean;
  className?: string;
};

export default function ChatMessageActions({
  role,
  content,
  isLastAssistant,
  onRegenerate,
  onEdit,
  onReadAloud,
  busy,
  className,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        role === "user" ? "justify-end" : "justify-start",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        aria-label={copied ? "Copied" : "Copy message"}
        disabled={busy || !content.trim()}
        onClick={() => void copy()}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      {role === "assistant" && onReadAloud ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="Read aloud"
          disabled={busy || !content.trim()}
          onClick={onReadAloud}
        >
          <Volume2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {role === "assistant" && isLastAssistant && onRegenerate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="Regenerate response"
          disabled={busy}
          onClick={onRegenerate}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {role === "user" && onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="Edit message"
          disabled={busy}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
