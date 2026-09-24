import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BOOKS } from "@/data/books";
import { BIBLE_PLATES } from "@/data/biblePlates";
import expansion from "@/data/visualBible/readerExpansion.json";
import { SEED_VISUALS, CURATED_VISUALS } from "@/lib/visualBible/seed";
import { VISUAL_CATALOGUE } from "@/lib/visualBible/catalogue";
import { passageVisualChoices } from "@/lib/visualBible/passageChoices";
import { ScripturePlate } from "@/components/bible/ScripturePlate";
import { inlinePlatesForChapter } from "./chapterContext";
import { curatedReaderPlates, selectReaderVisuals } from "./readerVisuals";
import { biblePlateAssetUrl, isReaderAssetPath } from "./biblePlateAssets";
import { buildReaderStream } from "./readerStream";

describe("visual variety in the actual reading stream", () => {
  it("keeps every previously added masterwork reachable from actual reading pages", () => {
    for (const asset of expansion) {
      const reachable = asset.passages.some(p => inlinePlatesForChapter(p.book, p.chapter).some(plate =>
        passageVisualChoices(plate, VISUAL_CATALOGUE, BIBLE_PLATES).some(choice => choice.id === asset.id)));
      expect(reachable, asset.title).toBe(true);
    }
    // A bounded page cannot feature every alternative painting; the selector still admits them.
    expect(curatedReaderPlates("Gen", 3).some(p => p.artist === "Albrecht Dürer")).toBe(true);
    expect(curatedReaderPlates("Est", 5).some(p => p.artist === "Artemisia Gentileschi")).toBe(true);
  });
  it("makes every contextual medium available from the reader and retains exact placement eligibility", () => {
    for (const [book, chapter, kind] of [["Exo",12,"map"],["Luk",2,"artifact"],["Luk",5,"place-photo"],["Exo",25,"architecture"],["Jhn",19,"manuscript"],["Act",1,"timeline"]] as const) {
      expect(curatedReaderPlates(book, chapter).some(p => p.kind === kind), `${book} ${chapter}`).toBe(true);
      expect(inlinePlatesForChapter(book, chapter).some(plate => passageVisualChoices(plate, VISUAL_CATALOGUE, BIBLE_PLATES).some(a => a.kind === kind)), `${book} ${chapter} chooser`).toBe(true);
    }
    expect(inlinePlatesForChapter("Act", 2).some(p => p.visualAssetId === "acts-overview")).toBe(false);
    expect(inlinePlatesForChapter("Mat", 2).some(p => p.visualAssetId === "map-jerusalem")).toBe(false);
  });
  it("is deterministic, bounded, one plate per real verse slot, and leaves raw catalogs intact", () => {
    const before = JSON.stringify(BIBLE_PLATES);
    for (const book of BOOKS) for (let chapter = 1; chapter <= book.chapters; chapter++) {
      const plates = inlinePlatesForChapter(book.abbr, chapter);
      expect(plates).toEqual(inlinePlatesForChapter(book.abbr, chapter));
      expect(plates.length).toBeLessThanOrEqual(3);
      expect(new Set(plates.map(p => p.beforeVerse)).size).toBe(plates.length);
      expect(plates.map(p => p.beforeVerse)).toEqual(plates.map(p => p.beforeVerse).sort((a,b) => a-b));
      for (const plate of plates) { expect(isReaderAssetPath(biblePlateAssetUrl(plate))).toBe(true); expect(plate.bookAbbr).toBe(book.abbr); expect(plate.chapter).toBe(chapter); }
    }
    expect(JSON.stringify(BIBLE_PLATES)).toBe(before);
  });
  it("does not always choose Tissot when both legacy artists illustrate the same slot", () => {
    const common = {bookAbbr:"Test",chapter:2,beforeVerse:1,title:"Scene",referenceLabel:"Test 2",alt:"Scene"};
    const dore = {...common,id:"dore",imageUrl:"dore",artist:"Gustave Doré",priority:10};
    const tissot = {...common,id:"tissot",imageUrl:"tissot",artist:"James Tissot",priority:4};
    expect(selectReaderVisuals("Test",2,[tissot,dore])[0].artist).toBe("Gustave Doré");
    expect(selectReaderVisuals("Test",3,[dore,tissot])[0].artist).toBe("James Tissot");
  });
  it("preserves every verse and inserts chosen reviewed works at their declared positions", () => {
    const verses = Array.from({length:80}, (_,i) => ({number:i+1,text:`Verse ${i+1}`}));
    const stream = buildReaderStream([{bookAbbr:"Luk",bookName:"Luke",chapter:1,verses,paragraphStarts:[],headings:[],poetryBlocks:[]}]);
    expect(stream.filter(u => u.kind === "verse").map(u => u.kind === "verse" && u.verse.number)).toEqual(verses.map(v => v.number));
    const reviewed = stream.filter(u => u.kind === "plate" && Boolean(u.plate.visualAssetId));
    expect(reviewed.length).toBeGreaterThan(0);
    for (const unit of reviewed) {
      if (unit.kind !== "plate") continue;
      const asset = CURATED_VISUALS.find(a => a.id === unit.plate.visualAssetId);
      if (!asset) continue;
      expect(asset.passages.some(p => p.book === "Luk" && p.chapter === 1 && (p.verse ?? 1) === unit.plate.beforeVerse)).toBe(true);
      const i = stream.indexOf(unit);
      if (unit.plate.beforeVerse > 1) expect(stream[i+1]).toMatchObject({kind:"verse",verse:{number:unit.plate.beforeVerse}});
    }
  });
  it("renders a known first-party object with its credits and working image retry", () => {
    const plate = curatedReaderPlates("Luk",2).find(p => p.visualAssetId === "met-547804")!;
    const {container} = render(<ScripturePlate plate={plate}/>);
    const image = container.querySelector("img")!;
    expect(image.src).toContain("/visual-bible/v1/met-547804-1-detail.webp");
    expect(screen.getByText(/not evidence for a particular census/)).toBeDefined();
    expect(screen.getByRole("link",{name:"License"}).getAttribute("href")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
    fireEvent.error(image); fireEvent.click(screen.getByRole("button",{name:"Retry illustration"}));
    expect(container.querySelector("img")?.src).toContain("?retry=1");cleanup();
  });
  it("rejects external, traversal and protocol-relative overrides", () => {
    for (const path of ["https://example.com/x.webp","//evil/x.webp","/visual-bible/v1/../x.webp","/visual-bible/v1/%2e%2e/x.webp"]) { expect(isReaderAssetPath(path)).toBe(false); expect(biblePlateAssetUrl({id:"safe",assetPath:path})).toBe("/bible-plates/safe.webp"); }
    for (const asset of SEED_VISUALS) expect(isReaderAssetPath(asset.detailUrl)).toBe(true);
  });
});
