import type { BiblePlate } from "@/data/biblePlates/types";
import { RELATIONSHIP_LABELS } from "@/data/visualBible/types";
import { CURATED_VISUALS } from "@/lib/visualBible/seed";
import { passageLabel } from "@/lib/visualBible/query";
import { STUDY_MAPS } from "./studyBackMatter";
import { studyMapAssetUrl } from "./biblePlateAssets";

/** Legacy maps have explicit anchors, not automatic repetition through broad ranges. */
export const READER_MAP_ANCHORS = [
  { id: "abraham", book: "Gen", chapter: 12 },
  { id: "exodus", book: "Exo", chapter: 12 }, { id: "exodus", book: "Exo", chapter: 14 },
  { id: "tabernacle", book: "Exo", chapter: 25 }, { id: "tabernacle", book: "Exo", chapter: 26 },
  { id: "canaan", book: "Jos", chapter: 13 }, { id: "kingdoms", book: "1Ki", chapter: 12 },
  { id: "temple", book: "1Ki", chapter: 6 }, { id: "jerusalem", book: "Mat", chapter: 21 },
  { id: "jerusalem", book: "Mrk", chapter: 11 }, { id: "jerusalem", book: "Luk", chapter: 19 },
  { id: "jerusalem", book: "Jhn", chapter: 12 }, { id: "paul", book: "Act", chapter: 13 },
  { id: "paul", book: "Act", chapter: 16 }, { id: "paul", book: "Act", chapter: 18 },
  { id: "paul", book: "Act", chapter: 27 },
] as const;
function mapPlates(book: string, chapter: number): BiblePlate[] {
  return READER_MAP_ANCHORS.filter(anchor => anchor.book === book && anchor.chapter === chapter).flatMap(anchor => {
    const map = STUDY_MAPS.find(entry => entry.id === anchor.id);
    if (!map) return [];
    const reconstruction = map.id === "temple" || map.id === "tabernacle";
    const cc = /^CC (BY-SA|BY) (\d\.\d)$/.exec(map.license ?? "");
    return [{
      id: `visual-map-${map.id}-${book.toLowerCase()}-${chapter}`, visualAssetId: `map-${map.id}`,
      bookAbbr: book, chapter, beforeVerse: 1, title: map.title, referenceLabel: `${book} ${chapter}`,
      imageUrl: map.imageUrl, assetPath: studyMapAssetUrl(map), artist: map.artist, alt: map.alt,
      kind: reconstruction ? "architecture" as const : "map" as const, sourceUrl: map.sourceUrl, priority: 90,
      context: { label: reconstruction ? "Reconstruction" : "Map · approximate routes and boundaries", note: map.caption, credit: map.artist ?? "Wikimedia Commons", licenseLabel: map.license ?? "See source", licenseUrl: cc ? `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/` : undefined },
    }];
  });
}
/** Only approved acquisition records and explicitly permitted inline connections. */
export function curatedReaderPlates(book: string, chapter: number): BiblePlate[] {
  const plates: BiblePlate[] = [];
  for (const asset of CURATED_VISUALS) {
    const passage = asset.passages.find(p => p.book === book && p.chapter === chapter && p.inline !== false);
    if (!passage) continue;
    const image = asset.readerUrl || asset.detailUrl;
    plates.push({
      id: `visual-${asset.id}-${book.toLowerCase()}-${chapter}`, visualAssetId: asset.id,
      bookAbbr: book, chapter, beforeVerse: passage.verse ?? 1, title: asset.title,
      referenceLabel: passageLabel(passage), imageUrl: image, assetPath: image,
      artist: asset.creator, kind: asset.kind, sourceUrl: asset.source.url, alt: asset.alt,
      priority: asset.iconic ? (asset.readerRank ?? 0) : (asset.readerRank ?? 10),
      context: {
        label: `${RELATIONSHIP_LABELS[passage.relationship]} · ${asset.date}`,
        note: asset.kind === "artwork" && passage.relationship === "depiction" ? "An artist’s interpretation, not an eyewitness record." : asset.caution,
        credit: asset.source.credit, licenseLabel: asset.source.license, licenseUrl: asset.source.licenseUrl,
      },
    });
  }
  return [...plates, ...mapPlates(book, chapter)].sort((a,b) => (a.priority ?? 10) - (b.priority ?? 10));
}
/** Stable, passage-first selection. Iconic works cannot lose to modulo/random selection. */
export function selectReaderVisuals(book: string, chapter: number, legacy: readonly BiblePlate[]): BiblePlate[] {
  const curated = curatedReaderPlates(book, chapter);
  const paintings = curated.filter(p => p.kind === "artwork");
  const contexts = curated.filter(p => p.kind !== "artwork");
  const preferred = chapter % 2 === 0 ? "Gustave Doré" : "James Tissot";
  const ordered = [...legacy].sort((a,b) => a.beforeVerse - b.beforeVerse || Number(b.artist === preferred) - Number(a.artist === preferred) || (a.priority ?? 10) - (b.priority ?? 10) || a.id.localeCompare(b.id));
  const slots = new Map<number, BiblePlate>();
  for (const plate of ordered) if (!slots.has(plate.beforeVerse)) slots.set(plate.beforeVerse, plate);
  const fallback = [...slots.values()];
  const selected: BiblePlate[] = [];
  const add = (plate?: BiblePlate) => {
    if (plate && !selected.some(p => p.beforeVerse === plate.beforeVerse || p.imageUrl === plate.imageUrl)) selected.push(plate);
  };
  add(paintings[0] ?? fallback[0]);
  // Prefer another maker when two reviewed works occupy different real narrative slots.
  const remaining = paintings.slice(1).sort((a,b) => Number(a.artist === selected[0]?.artist) - Number(b.artist === selected[0]?.artist) || (a.priority ?? 10) - (b.priority ?? 10));
  for (const painting of remaining) {
    if (selected.filter(p => (p.kind ?? "artwork") === "artwork").length >= 2) break;
    add(painting);
  }
  for (const context of contexts) {
    if (selected.some(p => p.beforeVerse === context.beforeVerse)) continue;
    add(context); break;
  }
  if (selected.filter(p => (p.kind ?? "artwork") === "artwork").length < 2) {
    add(fallback.find(p => !selected.some(s => s.beforeVerse === p.beforeVerse || s.imageUrl === p.imageUrl)));
  }
  if (!selected.some(p => p.kind && p.kind !== "artwork") && contexts.length) {
    const context = contexts[0];
    const conflict = selected.findIndex(p => p.beforeVerse === context.beforeVerse);
    if (conflict >= 0 && !selected[conflict].visualAssetId) selected.splice(conflict, 1, context);
    else if (conflict < 0) add(context);
  }
  return selected.sort((a,b) => a.beforeVerse - b.beforeVerse || a.id.localeCompare(b.id));
}
