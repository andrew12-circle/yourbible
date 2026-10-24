import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatCompileTokens from "@/components/journal/ChatCompileTokens";
import ChatPrayerBiblePage from "@/components/journal/ChatPrayerBiblePage";
import { prepareChatMarkdownForDisplay } from "@/lib/journal/prepareChatMarkdownForDisplay";
import { extractMarkdownText } from "@/lib/journal/parseChatPrayer";
import { cn } from "@/lib/utils";

export const CHAT_ASSISTANT_MARKDOWN_CLASS = "chat-assistant-markdown";

const BODY = "m-0 text-[15px] leading-[1.9] text-foreground";
const BODY_COMFORTABLE = "m-0 text-[16px] leading-[1.85] text-foreground";
const BLOCK_GAP = "mt-8 first:mt-0";

function buildMarkdownComponents(comfortable: boolean): Components {
  const body = comfortable ? BODY_COMFORTABLE : BODY;
  return {
    p: ({ children }) => <p className={cn(body, BLOCK_GAP)}>{children}</p>,
    ul: ({ children }) => (
      <ul className={cn(body, BLOCK_GAP, "list-disc space-y-3 pl-5")}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className={cn(body, BLOCK_GAP, "list-decimal space-y-3 pl-5")}>{children}</ol>
    ),
    li: ({ children }) => (
      <li className="pl-1 marker:font-normal [&>p:first-child]:mt-0 [&>p:first-child]:inline [&>p+p]:mt-3">
        {children}
      </li>
    ),
    blockquote: ({ children }) => (
      <ChatPrayerBiblePage
        text={extractMarkdownText(children)}
        className={BLOCK_GAP}
      />
    ),
    hr: () => <hr className={cn("border-border/60", BLOCK_GAP)} />,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    h1: ({ children }) => <h1 className={cn(body, BLOCK_GAP, "text-lg font-semibold")}>{children}</h1>,
    h2: ({ children }) => <h2 className={cn(body, BLOCK_GAP, "text-base font-semibold")}>{children}</h2>,
    h3: ({ children }) => <h3 className={cn(body, BLOCK_GAP, "font-semibold")}>{children}</h3>,
    code: ({ className, children, ...props }) => {
      const text = String(children ?? "");
      const isBlock = Boolean(className) || text.includes("\n");
      if (!isBlock) {
        return (
          <code
            className="rounded bg-muted/80 px-1 py-0.5 font-mono text-[13px] text-foreground/90"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <pre
          className={cn(
            BLOCK_GAP,
            "overflow-x-auto rounded-lg border border-border/50 bg-muted/50 p-3 font-mono text-[13px] leading-relaxed text-foreground/90",
          )}
        >
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    table: ({ children }) => (
      <div className={cn(BLOCK_GAP, "overflow-x-auto")}>
        <table className="w-full min-w-[16rem] border-collapse text-[14px]">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
    th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-t border-border/60 px-2 py-1.5 align-top">{children}</td>,
  };
}

type Props = {
  content: string;
  className?: string;
  /** Live token stream — plain text + cursor until complete. */
  streaming?: boolean;
  /** Slightly larger type for iPad portrait / arm's-length reading. */
  comfortable?: boolean;
};

/** My AI + journal chat assistant replies — ChatGPT-style block spacing. */
export default function ChatAssistantMarkdown({
  content,
  className,
  streaming = false,
  comfortable = false,
}: Props) {
  if (streaming) {
    const hasContent = content.length > 0;
    return (
      <div className={cn(CHAT_ASSISTANT_MARKDOWN_CLASS, "min-w-0 overflow-x-hidden", className)}>
        {hasContent ? (
          <p
            className={cn(
              "m-0 whitespace-pre-wrap break-words text-foreground [overflow-wrap:anywhere]",
              comfortable ? "text-[16px] leading-[1.85]" : "text-[15px] leading-[1.9]",
            )}
          >
            {content}
          </p>
        ) : null}
        {!hasContent ? <ChatCompileTokens /> : null}
      </div>
    );
  }

  if (!content.trim()) return null;
  return (
    <div
      className={cn(
        CHAT_ASSISTANT_MARKDOWN_CLASS,
        "min-w-0 overflow-x-hidden break-words [overflow-wrap:break-word]",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildMarkdownComponents(comfortable)}>
        {prepareChatMarkdownForDisplay(content)}
      </ReactMarkdown>
    </div>
  );
}
