import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  displayTitle: string;
  author?: string | null;
  pageCount?: number | null;
  backTo?: string;
};

export default function ArtifactMobileBookMeta({
  displayTitle,
  author = null,
  pageCount = null,
  backTo = "/framework/artifacts",
}: Props) {
  const metaLine = [author, pageCount != null ? `${pageCount} pages` : null].filter(Boolean).join(" · ");

  return (
    <div className="bg-card px-3 py-3 lg:hidden">
      <Link
        to={backTo}
        className="mb-2.5 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Back to artifacts"
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Artifacts
      </Link>
      <h1 className="line-clamp-3 font-display text-base font-normal leading-snug text-foreground">
        {displayTitle}
      </h1>
      {metaLine ? <p className="mt-2 text-sm text-muted-foreground">{metaLine}</p> : null}
    </div>
  );
}
