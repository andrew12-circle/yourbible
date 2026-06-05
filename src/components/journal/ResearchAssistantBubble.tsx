import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { researchPackAssistantProse } from "@/lib/framework/claimResearchPack";
import { prepareChatMarkdownForDisplay } from "@/lib/journal/prepareChatMarkdownForDisplay";
import ResearchGeminiAvatar from "@/components/journal/ResearchGeminiAvatar";
import ResearchMessageActions from "@/components/journal/ResearchMessageActions";

type Props = {
  children: string;
  variant?: "brief" | "chat";
  onCopy?: () => void;
  onRetry?: () => void;
  retryDisabled?: boolean;
  className?: string;
};

export default function ResearchAssistantBubble({
  children,
  variant = "chat",
  onCopy,
  onRetry,
  retryDisabled,
  className,
}: Props) {
  const text = prepareChatMarkdownForDisplay(children);
  if (!text) return null;

  const isBrief = variant === "brief";
  const prose = (
    <div
      className={cn(
        researchPackAssistantProse,
        "prose-p:text-[15px] prose-p:leading-[1.65] prose-li:text-[15px]",
        "prose-headings:text-base prose-headings:font-medium prose-headings:tracking-tight",
      )}
    >
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );

  if (isBrief) {
    return (
      <article className={cn("w-full", className)}>
        <div className="mb-3 flex items-center gap-2">
          <ResearchGeminiAvatar size="sm" />
          <span className="text-sm font-medium text-foreground/80">Research brief</span>
        </div>
        {prose}
      </article>
    );
  }

  return (
    <article className={cn("w-full min-w-0", className)}>
      {prose}
      <ResearchMessageActions
        onCopy={onCopy}
        onRetry={onRetry}
        retryDisabled={retryDisabled}
      />
    </article>
  );
}
