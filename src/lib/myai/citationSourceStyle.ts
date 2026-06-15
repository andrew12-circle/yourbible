import type { ChatCitation } from "@/lib/myai/parseChatCitations";

export type CitationSourceKind =
  | "youtube"
  | "claim_research"
  | "belief"
  | "journal"
  | "artifact"
  | "influence"
  | "identity"
  | "entity"
  | "general";

export type CitationChipTone = {
  chip: string;
  iconRing: string;
  iconColor: string;
};

export function isYouTubeUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

export function resolveCitationSourceKind(
  citation: ChatCitation,
  artifactUrlById?: Readonly<Record<string, string>>,
): CitationSourceKind {
  const watchUrl = citation.url ?? (citation.id ? artifactUrlById?.[citation.id] : undefined);

  if (citation.source_type === "artifact" && isYouTubeUrl(watchUrl)) return "youtube";
  if (citation.source_type === "journal" && /^claim research/i.test(citation.label.trim())) {
    return "claim_research";
  }
  if (citation.source_type === "belief") return "belief";
  if (citation.source_type === "journal") return "journal";
  if (citation.source_type === "artifact") return "artifact";
  if (citation.source_type === "influence") return "influence";
  if (citation.source_type === "identity") return "identity";
  if (citation.source_type === "entity") return "entity";
  return "general";
}

export function citationChipTone(kind: CitationSourceKind, linked: boolean): CitationChipTone {
  const muted = !linked;

  switch (kind) {
    case "youtube":
      return {
        chip: muted
          ? "border-red-500/20 bg-red-500/[0.06] text-muted-foreground"
          : "border-red-500/30 bg-red-500/[0.08] text-foreground/90 hover:bg-red-500/[0.14]",
        iconRing: "bg-[#FF0000] text-white shadow-sm shadow-red-600/20",
        iconColor: "text-white",
      };
    case "claim_research":
      return {
        chip: muted
          ? "border-amber-500/20 bg-amber-500/[0.06] text-muted-foreground"
          : "border-amber-500/35 bg-amber-500/[0.10] text-foreground/90 hover:bg-amber-500/[0.16]",
        iconRing: "bg-amber-600 text-white shadow-sm shadow-amber-600/20",
        iconColor: "text-white",
      };
    case "belief":
      return {
        chip: muted
          ? "border-sky-500/20 bg-sky-500/[0.06] text-muted-foreground"
          : "border-sky-500/30 bg-sky-500/[0.08] text-foreground/90 hover:bg-sky-500/[0.14]",
        iconRing: "bg-sky-600 text-white shadow-sm shadow-sky-600/15",
        iconColor: "text-white",
      };
    case "journal":
      return {
        chip: muted
          ? "border-violet-500/20 bg-violet-500/[0.06] text-muted-foreground"
          : "border-violet-500/30 bg-violet-500/[0.08] text-foreground/90 hover:bg-violet-500/[0.14]",
        iconRing: "bg-violet-600 text-white shadow-sm shadow-violet-600/15",
        iconColor: "text-white",
      };
    case "artifact":
      return {
        chip: muted
          ? "border-rose-500/20 bg-rose-500/[0.06] text-muted-foreground"
          : "border-rose-500/30 bg-rose-500/[0.08] text-foreground/90 hover:bg-rose-500/[0.14]",
        iconRing: "bg-rose-600 text-white shadow-sm shadow-rose-600/15",
        iconColor: "text-white",
      };
    case "influence":
      return {
        chip: muted
          ? "border-emerald-500/20 bg-emerald-500/[0.06] text-muted-foreground"
          : "border-emerald-500/30 bg-emerald-500/[0.08] text-foreground/90 hover:bg-emerald-500/[0.14]",
        iconRing: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/15",
        iconColor: "text-white",
      };
    case "identity":
      return {
        chip: muted
          ? "border-slate-500/20 bg-slate-500/[0.06] text-muted-foreground"
          : "border-slate-500/30 bg-slate-500/[0.08] text-foreground/90 hover:bg-slate-500/[0.14]",
        iconRing: "bg-slate-600 text-white shadow-sm shadow-slate-600/15",
        iconColor: "text-white",
      };
    case "entity":
      return {
        chip: muted
          ? "border-fuchsia-500/20 bg-fuchsia-500/[0.06] text-muted-foreground"
          : "border-fuchsia-500/30 bg-fuchsia-500/[0.08] text-foreground/90 hover:bg-fuchsia-500/[0.14]",
        iconRing: "bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-600/15",
        iconColor: "text-white",
      };
    default:
      return {
        chip: muted
          ? "border-border/50 bg-muted/30 text-muted-foreground"
          : "border-border/60 bg-muted/20 text-foreground/80 hover:bg-muted/35",
        iconRing: "bg-muted text-muted-foreground ring-1 ring-border/60",
        iconColor: "text-muted-foreground",
      };
  }
}
