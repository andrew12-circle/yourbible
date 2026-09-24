import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Globe2 } from "lucide-react";
import { geographyPrecisionLabel, geographyReaderHref, geographyReferenceLabel, geographyReferenceMatches, geographyReferences, geographyStatus, googleEarthHref, googleMapsHref, googleStreetViewHref, type GeographyFilter, type GeographyPlace } from "@/lib/bible/geography";

export function BibleEarthPlaceCard({ place, filter, onRead }: { place: GeographyPlace; filter: GeographyFilter; onRead?: () => void }) {
  const selectId = useId();
  const [candidateId, setCandidateId] = useState(place.candidates[0]?.id ?? "");
  const candidate = place.candidates.find((item) => item.id === candidateId) ?? place.candidates[0];
  const references = useMemo(() => geographyReferences(place, filter.translation), [place, filter.translation]);
  const matching = useMemo(() => references.filter((ref) => geographyReferenceMatches(ref, filter)), [references, filter]);
  const first = matching[0] ?? references[0];
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-sm" data-testid="earth-place-card">
      <div>
        <h3 className="text-lg font-semibold">{place.name}</h3>
        <p className="text-xs capitalize text-muted-foreground">{place.type}</p>
        <p className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{geographyStatus(place)}</p>
      </div>
      {candidate ? <>
        {place.candidates.length > 1 ? <div>
          <label htmlFor={selectId} className="mb-1 block text-xs font-medium">Compare {place.candidates.length} location candidates</label>
          <select id={selectId} value={candidate.id} onChange={(event) => setCandidateId(event.target.value)} className="w-full rounded-lg border bg-background px-2 py-2 text-sm">
            {place.candidates.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.name} — source score {item.score ?? "unscored"}</option>)}
          </select>
        </div> : <p className="text-sm font-medium">{candidate.name}</p>}
        <p className="text-sm leading-relaxed text-muted-foreground">{candidate.description}</p>
        <div className="rounded-lg bg-muted/50 p-2.5 text-xs leading-relaxed text-muted-foreground">
          <p>{geographyPrecisionLabel(candidate)}.</p>
          <p className="mt-1">Source score: {candidate.score === null ? "not supplied" : `${candidate.score} / 1000`}. Not an independently verified probability.</p>
          <p className="mt-1 font-mono">{candidate.lat.toFixed(6)}, {candidate.lon.toFixed(6)}</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <a href={googleEarthHref(candidate)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"><Globe2 className="h-4 w-4" aria-hidden="true" />Google Earth{candidate.score === 1000 ? "" : " · candidate"}</a>
          <a href={googleMapsHref(candidate)} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">Google Maps</a>
          <a href={googleStreetViewHref(candidate)} target="_blank" rel="noopener noreferrer" title="Available imagery near this point; coverage is not guaranteed." className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">Street View</a>
        </div>
      </> : <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">The source does not supply a defensible coordinate. This place is indexed, but no pin has been invented.</p>}
      {place.unresolved.length > 0 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Uncertainty and alternative interpretations</summary><div className="mt-2 space-y-1">{place.unresolved.map((item, index) => <p key={`${item.kind}-${index}`}>{item.description || item.kind.replaceAll("_", " ")}</p>)}</div></details>}
      <div className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">Scripture references · {filter.translation === "all" ? "source versification" : filter.translation.toUpperCase()}</p>
        <p className="mt-1">{matching.slice(0, 12).map(geographyReferenceLabel).join("; ") || "No references in this filter."}</p>
        {references.length > Math.min(matching.length, 12) && <details className="mt-1"><summary className="cursor-pointer">All {references.length} references</summary><p className="mt-1 max-h-40 overflow-auto">{references.map(geographyReferenceLabel).join("; ")}</p></details>}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {first && <Link to={geographyReaderHref(first)} onClick={onRead} className="font-medium text-primary underline underline-offset-2">Read chapter</Link>}
          <a href={place.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Identification and archaeological sources</a>
        </div>
      </div>
    </article>
  );
}
