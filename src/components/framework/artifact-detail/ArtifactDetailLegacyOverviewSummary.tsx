import ArtifactOverviewSummary from "@/components/framework/artifact-detail/ArtifactOverviewSummary";
import type { ArtifactFrameworkOverview } from "@/lib/framework/artifactOverviewSummary";

type Props = {
  status: string;
  overview: ArtifactFrameworkOverview | null;
  /** When true, overview panes already render the summary. */
  skip: boolean;
};

/** Summary for text articles and non-premium YouTube layouts (overview panes handle premium). */
export default function ArtifactDetailLegacyOverviewSummary({ status, overview, skip }: Props) {
  if (skip || status !== "ready" || !overview) return null;
  return <ArtifactOverviewSummary overview={overview} />;
}
