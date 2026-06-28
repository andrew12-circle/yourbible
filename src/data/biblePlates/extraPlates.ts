import type { BiblePlate } from "./types";

/** Historic Bible panorama (1891) and other one-off public-domain plates. */
export const EXTRA_PLATES: BiblePlate[] = [
  {
    id: "panorama-2sa-23-bethlehem",
    bookAbbr: "2Sa",
    chapter: 23,
    beforeVerse: 15,
    title: "David Pours Out the Water from Bethlehem",
    referenceLabel: "2 Samuel 23:15",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/King_David_Receiving_the_Cistern_Water_of_Bethlehem_%28SM_2253b%29.png/960px-King_David_Receiving_the_Cistern_Water_of_Bethlehem_%28SM_2253b%29.png",
    alt: "David receives water brought by his mighty men from Bethlehem",
    artist: "Bible panorama (1891)",
    kind: "artwork",
    source: "wikimedia",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:King_David_Receiving_the_Cistern_Water_of_Bethlehem_(SM_2253b).png",
    license: "pd",
    priority: 10,
  },
];
