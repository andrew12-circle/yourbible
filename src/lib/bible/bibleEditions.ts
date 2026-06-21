/**
 * API.Bible edition ids used in production and golden-chapter QA.
 * Update when changing default translation or re-fetching fixtures.
 *
 * Refresh fixtures: npm run fetch:golden-fixtures && npm run test:golden:update
 */
import { GOLDEN_CSB_BIBLE_ID } from "@/lib/bible/goldenChapters";

export const API_BIBLE_CSB_ID = GOLDEN_CSB_BIBLE_ID;

export const API_BIBLE_EDITIONS = {
  CSB: {
    id: API_BIBLE_CSB_ID,
    abbreviation: "CSB",
    name: "Christian Standard Bible",
    /** Publisher study apparatus (span.f / xt) present in API HTML with include-notes=true */
    hasStudyApparatus: true,
  },
} as const;
