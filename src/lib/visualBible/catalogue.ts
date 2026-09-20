import { BIBLE_PLATES } from "@/data/biblePlates";
import { STUDY_MAPS } from "@/lib/bible/studyBackMatter";
import { biblePlateAssetUrl, studyMapAssetUrl } from "@/lib/bible/biblePlateAssets";
import type { VisualAsset, VisualPassage } from "@/data/visualBible/types";
import { SEED_VISUALS } from "./seed";
import { deduplicateVisuals } from "./query";

const mapRanges: Record<string, [string, number, number][]> = {
  abraham: [["Gen", 12, 50]], exodus: [["Exo", 1, 40]], canaan: [["Jos", 1, 24]],
  kingdoms: [["1Ki", 1, 22], ["2Ki", 1, 25]], tabernacle: [["Exo", 25, 40]],
  temple: [["1Ki", 5, 8]], jerusalem: [["Mat", 1, 28], ["Mrk", 1, 16], ["Luk", 1, 24], ["Jhn", 1, 21]],
  paul: [["Act", 1, 28]],
};
function legacyLicenseUrl(label: string): string | undefined {
  const cc = /^CC (BY-SA|BY) (\d\.\d)$/.exec(label);
  if (cc) return `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/`;
  if (label === "cc0") return "https://creativecommons.org/publicdomain/zero/1.0/";
  return undefined;
}
const maps: VisualAsset[] = STUDY_MAPS.map((map) => {
  const reconstruction = map.id === "temple" || map.id === "tabernacle";
  return {
    id: `map-${map.id}`, kind: reconstruction ? "architecture" : "map", title: map.title,
    creator: map.artist ?? "Maker not recorded", date: "Date not recorded", culture: "Biblical study reference",
    medium: reconstruction ? "Diagram or model photograph" : "Study map",
    description: map.caption,
    caution: "Inherited chapter associations provide broad context, not exact locations for every verse. Routes, boundaries and reconstructions are approximate; source and mapping review remains pending.",
    tags: [map.id, "geography", "study"],
    passages: (mapRanges[map.id] ?? []).map(([book, chapter, endChapter]): VisualPassage => ({
      book, chapter, endChapter, relationship: reconstruction ? "reconstruction" : "geography",
      note: "Broad chapter-range association inherited from the existing study maps, not a precise verse-level match.",
    })),
    source: { name: "Wikimedia Commons", url: map.sourceUrl ?? "", license: map.license ?? "Not recorded",
      licenseUrl: legacyLicenseUrl(map.license ?? ""), credit: map.artist ?? "Attribution not recorded" },
    review: "legacy", thumbnailUrl: studyMapAssetUrl(map), detailUrl: studyMapAssetUrl(map), alt: map.alt,
  };
});
const paintings: VisualAsset[] = BIBLE_PLATES.map((plate) => ({
  id: `plate-${plate.id}`, kind: plate.kind ?? "artwork", title: plate.title,
  creator: plate.artist ?? "Maker not recorded", date: "Date not recorded", culture: "Not yet catalogued", medium: "Historic illustration",
  description: `From the existing illustrated Bible collection. Catalogued reference: ${plate.referenceLabel}.`,
  caution: "Artistic interpretation, not an eyewitness record. This legacy record and its Scripture association have not yet received the new source-by-source review. An insertion position is not proof of an exact verse match.",
  tags: [plate.referenceLabel],
  passages: [{ book: plate.bookAbbr, chapter: plate.chapter, relationship: "depiction", note: `Legacy chapter association; catalogued label: ${plate.referenceLabel}.` }],
  source: { name: plate.source === "brooklyn" ? "Brooklyn Museum / Wikimedia Commons" : "Wikimedia Commons",
    url: plate.sourceUrl ?? "", license: plate.license === "pd" ? "Public domain (legacy label)" : plate.license ?? "Not recorded",
    licenseUrl: legacyLicenseUrl(plate.license ?? ""), credit: plate.artist ?? "Attribution not recorded" },
  review: "legacy", thumbnailUrl: biblePlateAssetUrl(plate), detailUrl: biblePlateAssetUrl(plate), alt: plate.alt,
}));

// New additions are presented first. Existing inline plates and their IDs are untouched.
export const VISUAL_CATALOGUE: VisualAsset[] = deduplicateVisuals([...SEED_VISUALS, ...maps, ...paintings]);
