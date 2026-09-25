import { useId, useState } from "react";
import { Bookmark, ExternalLink, Globe2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { VisualAsset } from "@/data/visualBible/types";
import { placeIllustration } from "@/lib/visualBible/explorerModel";
import { geographyPrecisionLabel, geographyReferences, geographyReferenceLabel, geographyStatus, googleEarthHref, googleMapsHref, googleStreetViewHref, type GeographyCandidate, type GeographyPlace, type GeographyTranslation } from "@/lib/bible/geography";
import { BOOKS } from "@/data/books";
import { VisualPreview, galleryGrid, explorerButton } from "./VisualGallery";
export function PlaceLinks({ candidate }: { candidate: GeographyCandidate }) {
  return <div className="flex flex-wrap gap-2"><a href={googleEarthHref(candidate)} target="_blank" rel="noopener noreferrer" className={`${explorerButton} bg-primary text-primary-foreground hover:bg-primary/90`}><Globe2 className="h-4 w-4" />Google Earth<ExternalLink className="h-3 w-3" /></a><a href={googleMapsHref(candidate)} target="_blank" rel="noopener noreferrer" className={explorerButton}>Google Maps<ExternalLink className="h-3 w-3" /></a></div>;
}
function PlaceCard({ place, assets, saved, onSave, translation, book, chapter, onNavigate }: {
  place: GeographyPlace; assets: readonly VisualAsset[]; saved: readonly string[]; onSave: (id: string) => void;
  translation: GeographyTranslation; book?: string; chapter?: number; onNavigate?: () => void;
}) {
  const id = useId();
  const [candidateId, setCandidateId] = useState(place.candidates[0]?.id ?? "");
  const candidate = place.candidates.find(item => item.id === candidateId) ?? place.candidates[0];
  const illustration = placeIllustration(place, assets);
  const refs = geographyReferences(place, translation).filter(ref => !book || (BOOKS[ref.b - 1]?.abbr === book && (chapter === undefined || ref.c === chapter)));
  return <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card" data-testid="explorer-place-card">
    {illustration ? <div><div className="h-40 bg-muted/30"><VisualPreview asset={illustration} /></div><p className="px-4 pt-2 text-[10px] text-muted-foreground">Site illustration · {illustration.source.credit} · {illustration.source.license}</p></div> : <div className="flex h-24 items-center gap-3 border-b bg-muted/30 px-5 text-muted-foreground"><Globe2 className="h-10 w-10" aria-hidden="true" /><span className="text-xs uppercase tracking-wider">Explore the setting</span></div>}
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2"><div><h3 className="font-serif text-xl">{place.name}</h3><p className="mt-1 text-xs text-muted-foreground">{geographyStatus(place)}</p></div><button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted" aria-label={`${saved.includes(`place:${place.id}`) ? "Unsave" : "Save"} ${place.name}`} aria-pressed={saved.includes(`place:${place.id}`)} onClick={() => onSave(`place:${place.id}`)}><Bookmark className="h-4 w-4" fill={saved.includes(`place:${place.id}`) ? "currentColor" : "none"} /></button></div>
      {candidate ? <><p className="text-sm">{candidate.description}</p><p className="text-xs leading-relaxed text-muted-foreground">{geographyPrecisionLabel(candidate)}.</p>{place.candidates.length > 1 && <label htmlFor={id} className="space-y-1 text-xs">Compare {place.candidates.length} candidates<select id={id} value={candidate.id} onChange={event => setCandidateId(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border bg-background px-2 text-sm">{place.candidates.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.name}</option>)}</select></label>}<div className="mt-auto"><PlaceLinks candidate={candidate} /></div></> : <p className="text-sm text-muted-foreground">No defensible coordinate is supplied. This place has no invented pin.</p>}
      {refs.length > 0 && <p className="text-xs leading-relaxed">{refs.slice(0, 6).map(geographyReferenceLabel).join(" · ")}{refs.length > 6 ? ` · +${refs.length - 6} references` : ""}</p>}
      <details className="border-t pt-2 text-xs leading-relaxed text-muted-foreground"><summary className="min-h-9 cursor-pointer py-2">Sources, precision & more options</summary>{candidate && <><p>OpenBible source score: {candidate.score ?? "not supplied"}. An evidence score, not an independently verified probability.</p><p className="mt-2 font-mono">{candidate.lat}, {candidate.lon}</p><a href={googleStreetViewHref(candidate)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Try Street View (coverage varies)</a></>}{place.unresolved.map((item, i) => <p key={i} className="my-2">{item.description}</p>)}<a href={place.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Read identification sources</a>{refs[0] && <Link onClick={onNavigate} to={`/read/${BOOKS[refs[0].b - 1].abbr}/${refs[0].c}?v=${refs[0].v}`} className="ml-3 inline-flex min-h-11 items-center underline">Read passage</Link>}</details>
    </div>
  </article>;
}
export function VisualPlacesView(props: {
  places: GeographyPlace[]; assets: readonly VisualAsset[]; saved: readonly string[]; onSave: (id: string) => void;
  translation: GeographyTranslation; book?: string; chapter?: number; onNavigate?: () => void;
}) {
  return <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">{props.places.map(place => <PlaceCard key={place.id} {...props} place={place} />)}</div>;
}
