import { withYouTubeTimestamp } from "@/lib/framework/artifactDetailPageHelpers";
import type { ChatCitation } from "@/lib/myai/parseChatCitations";

export type CitationLink = {
  href: string;
  external: boolean;
};

export function resolveCitationLink(
  citation: ChatCitation,
  artifactUrlById?: Readonly<Record<string, string>>,
): CitationLink | null {
  if (citation.source_type === "artifact" && citation.id) {
    const watchUrl = citation.url ?? artifactUrlById?.[citation.id];
    if (watchUrl) {
      const href =
        citation.start_seconds != null && citation.start_seconds > 0
          ? withYouTubeTimestamp(watchUrl, citation.start_seconds)
          : watchUrl;
      return { href, external: true };
    }
    return { href: `/framework/artifacts/${citation.id}`, external: false };
  }

  if (citation.id) {
    if (citation.source_type === "belief") return { href: `/framework/beliefs/${citation.id}`, external: false };
    if (citation.source_type === "journal") return { href: `/journal/${citation.id}`, external: false };
  }

  if (citation.source_type === "identity") return { href: "/settings", external: false };
  if (citation.source_type === "influence") return { href: "/framework/influences", external: false };
  return null;
}
