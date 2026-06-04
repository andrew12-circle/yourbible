import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { researchPackAssistantProse } from "@/lib/framework/claimResearchPack";
import { sanitizeResearchChatContent } from "@/lib/journal/sanitizeResearchChatContent";

type Props = {
  children: string;
  variant?: "brief" | "chat";
  className?: string;
};

export default function ResearchAssistantBubble({ children, variant = "chat", className }: Props) {
  const text = sanitizeResearchChatContent(children);
  if (!text) return null;

  const isBrief = variant === "brief";

  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-x-hidden",
        isBrief
          ? "rounded-xl bg-muted/30 px-3.5 py-3 ring-1 ring-border/40"
          : "max-w-[min(100%,28rem)] rounded-2xl rounded-bl-md border border-border/50 bg-card px-3.5 py-3 shadow-sm",
        className,
      )}
    >
      <div className={cn(researchPackAssistantProse, isBrief && "text-[13px]")}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  );
}
