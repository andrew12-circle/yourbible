import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parsePassageHtml } from "@/lib/bible/parsePassageHtml";
import { collectHolmanXrefsFromVerses } from "@/lib/bible/holmanStudyLayout";
import {
  GOLDEN_CSB_CHAPTERS,
  goldenFixtureHtmlPath,
  goldenFixtureSnapshotPath,
} from "@/lib/bible/goldenChapters";
import {
  buildChapterParseSnapshot,
  findVersesWithStudyDebris,
  type ChapterParseSnapshot,
} from "@/lib/bible/studyParseQuality";

const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";
const EDITION = "CSB";

function readFixtureHtml(id: string): string {
  const filePath = path.join(process.cwd(), goldenFixtureHtmlPath(id));
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing fixture ${filePath}. Run: node scripts/fetch-golden-chapter-fixtures.mjs`,
    );
  }
  return fs.readFileSync(filePath, "utf8");
}

function readOrBuildSnapshot(
  spec: (typeof GOLDEN_CSB_CHAPTERS)[number],
  parsed: ReturnType<typeof parsePassageHtml>,
): ChapterParseSnapshot {
  const snapshot = buildChapterParseSnapshot(
    EDITION,
    spec.book,
    spec.chapter,
    spec.reference,
    parsed.verses,
  );
  const snapshotPath = path.join(process.cwd(), goldenFixtureSnapshotPath(spec.id));

  if (UPDATE_GOLDEN) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    return snapshot;
  }

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(
      `Missing snapshot ${snapshotPath}. Run: npm run test:golden:update`,
    );
  }
  return JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as ChapterParseSnapshot;
}

describe("golden CSB chapters (API.Bible HTML fixtures)", () => {
  for (const spec of GOLDEN_CSB_CHAPTERS) {
    describe(spec.reference, () => {
      const html = () => readFixtureHtml(spec.id);
      const parsed = () => parsePassageHtml(html(), spec.reference);

      it("parses a non-empty chapter", () => {
        expect(parsed().verses.length).toBeGreaterThanOrEqual(spec.minVerseCount);
      });

      it("keeps study apparatus out of verse plain text", () => {
        const debris = findVersesWithStudyDebris(parsed().verses);
        expect(debris.map((v) => v.number)).toEqual([]);
      });

      it("extracts publisher cross-refs for study content", () => {
        const withXrefs = parsed().verses.filter(
          (v) => collectHolmanXrefsFromVerses([v], spec.chapter).length > 0,
        );
        expect(withXrefs.length).toBeGreaterThanOrEqual(spec.minVersesWithCrossRefs);
      });

      it("matches committed parse snapshot", () => {
        const live = parsed();
        const snapshot = readOrBuildSnapshot(spec, live);
        expect(live.verses.length).toBe(snapshot.verseCount);
        for (const sv of snapshot.verses) {
          const v = live.verses.find((x) => x.number === sv.number);
          expect(v, `verse ${sv.number} missing`).toBeDefined();
          expect(v!.text.length).toBe(sv.textLength);
          expect(v!.text.slice(0, 80)).toBe(sv.textPreview);
          const labels = collectHolmanXrefsFromVerses([v!], spec.chapter).map((x) => x.label);
          expect(labels).toEqual(sv.crossRefLabels);
        }
      });

      for (const [verseStr, expectedLabels] of Object.entries(spec.spotCheckCrossRefs)) {
        const verseNum = Number(verseStr);
        it(`spot-checks cross-refs on ${spec.reference}:${verseNum}`, () => {
          const v = parsed().verses.find((x) => x.number === verseNum);
          expect(v).toBeDefined();
          const labels = collectHolmanXrefsFromVerses([v!], spec.chapter).map((x) => x.label);
          for (const label of expectedLabels) {
            expect(labels).toContain(label);
          }
        });
      }
    });
  }
});
