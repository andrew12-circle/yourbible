import { useMemo } from "react";
import type { VisualAsset } from "@/data/visualBible/types";
import { collectionCoverage } from "@/lib/visualBible/collections";

export function CollectionCoverage({ assets }: { assets: readonly VisualAsset[] }) {
  const coverage = useMemo(() => collectionCoverage(assets), [assets]);
  return <details className="rounded-xl border px-4 py-2">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Collection coverage and sources</summary>
    <p className="mb-4 text-xs text-muted-foreground">Available images are counted separately from acquisition goals. Panels and views can share one artwork; legacy records still need the newer source review.</p>
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{coverage.map(item => <div key={item.id} className="rounded-lg bg-muted/30 p-3">
      <dt className="text-sm font-semibold">{item.title}</dt>
      <dd className="mt-1 text-sm">{item.reviewed} reviewed images · goal {item.goal}</dd>
      <dd className="mt-1 text-xs text-muted-foreground">{item.works} distinct work groups{item.legacy ? ` · ${item.legacy} additional legacy references` : ""}</dd>
      <dd className="mt-2"><progress className="h-1.5 w-full" value={Math.min(item.reviewed, item.goal)} max={item.goal} aria-label={`${item.title}: ${item.reviewed} of ${item.goal} reviewed images`} /></dd>
    </div>)}</dl>
    <p className="my-4 text-xs text-muted-foreground">Images are historical art, records of material culture, maps or present-day photography—not additions to Scripture. Rights and photographic credits are recorded per image. A museum source does not endorse our passage connections.</p>
  </details>;
}
