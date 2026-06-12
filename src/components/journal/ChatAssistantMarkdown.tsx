import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { prepareChatMarkdownForDisplay } from "@/lib/journal/prepareChatMarkdownForDisplay";
import { cn } from "@/lib/utils";

export const CHAT_ASSISTANT_MARKDOWN_CLASS = "chat-assistant-markdown";

const BODY = "m-0 text-[15px] leading-[1.9] text-foreground";
const BLOCK_GAP = "mt-8 first:mt-0";

const markdownComponents: Components = {
  p: ({ children }) => <p className={cn(BODY, BLOCK_GAP)}>{children}</p>,
  ul: ({ children }) => (
    <ul className={cn(BODY, BLOCK_GAP, "list-disc space-y-3 pl-5")}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className={cn(BODY, BLOCK_GAP, "list-decimal space-y-3 pl-5")}>{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      className={cn(
        BODY,
        BLOCK_GAP,
        "rounded-r-lg border-l-[3px] border-blue-500/35 bg-blue-500/[0.04] py-3.5 pl-4 pr-3 not-italic text-foreground/90",
        "[&>p]:!mt-3 [&>p:first-child]:!mt-0 [&>p]:leading-[1.9]",
      )}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className={cn("border-border/60", BLOCK_GAP)} />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h1: ({ children }) => <h1 className={cn(BODY, BLOCK_GAP, "text-lg font-semibold")}>{children}</h1>,
  h2: ({ children }) => <h2 className={cn(BODY, BLOCK_GAP, "text-base font-semibold")}>{children}</h2>,
  h3: ({ children }) => <h3 className={cn(BODY, BLOCK_GAP, "font-semibold")}>{children}</h3>,
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

type Props = {
  content: string;
  className?: string;
  /** Live token stream — plain text + cursor until complete. */
  streaming?: boolean;
};

function StreamCursor() {
  return (
    <span
      className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-foreground/75 align-baseline"
      aria-hidden
    />
  );
}

/** My AI + journal chat assistant replies — ChatGPT-style block spacing. */
export default function ChatAssistantMarkdown({ content, className, streaming = false }: Props) {
  if (streaming) {
    return (
      <div className={cn(CHAT_ASSISTANT_MARKDOWN_CLASS, className)}>
        <p className="m-0 whitespace-pre-wrap text-[15px] leading-[1.9] text-foreground">
          {content}
          <StreamCursor />
        </p>
      </div>
    );
  }

  if (!content.trim()) return null;
  return (
    <div className={cn(CHAT_ASSISTANT_MARKDOWN_CLASS, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {prepareChatMarkdownForDisplay(content)}
      </ReactMarkdown>
    </div>
  );
}
