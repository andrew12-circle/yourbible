import type { TextProfile } from "@/lib/code-lab/textProfiles";
import type { ElsDirection, ElsHit, ElsSearchOptions, TextStream } from "@/lib/code-lab/types";

function matchAt(
  stream: TextStream,
  term: string,
  start: number,
  skip: number,
  direction: ElsDirection,
): number[] | null {
  const indices: number[] = [];
  let pos = start;
  for (let i = 0; i < term.length; i++) {
    if (pos < 0 || pos >= stream.letters.length) return null;
    if (stream.letters[pos] !== term[i]) return null;
    indices.push(pos);
    pos += direction === "forward" ? skip : -skip;
  }
  return indices;
}

function searchDirection(
  stream: TextStream,
  term: string,
  skip: number,
  direction: ElsDirection,
  maxHits: number,
  hits: ElsHit[],
): void {
  if (term.length < 2 || skip < 1) return;

  for (let start = 0; start < stream.letters.length; start++) {
    const indices = matchAt(stream, term, start, skip, direction);
    if (!indices) continue;

    const startIndex = indices[0]!;
    const endIndex = indices[indices.length - 1]!;
    hits.push({
      term,
      skip,
      direction,
      startIndex,
      endIndex,
      indices,
      anchor: stream.indexMap[startIndex]!,
      endAnchor: stream.indexMap[endIndex]!,
    });

    if (hits.length >= maxHits) return;
  }
}

export function searchEls(
  stream: TextStream,
  profile: TextProfile,
  rawQuery: string,
  options: ElsSearchOptions,
  caseSensitive = false,
): ElsHit[] {
  const term = profile.normalizeQuery(rawQuery, caseSensitive);
  if (term.length < 2) return [];

  const maxHits = options.maxHits ?? 200;
  const hits: ElsHit[] = [];
  const directions: ElsDirection[] =
    options.direction === "both" ? ["forward", "backward"] : [options.direction];

  for (let skip = options.minSkip; skip <= options.maxSkip; skip++) {
    for (const direction of directions) {
      searchDirection(stream, term, skip, direction, maxHits, hits);
      if (hits.length >= maxHits) return hits;
    }
  }

  return hits.sort((a, b) => a.skip - b.skip || a.startIndex - b.startIndex);
}

export function searchElsAtSkip(
  stream: TextStream,
  profile: TextProfile,
  rawQuery: string,
  skip: number,
  direction: ElsDirection | "both",
  caseSensitive = false,
): ElsHit[] {
  return searchEls(stream, profile, rawQuery, {
    minSkip: skip,
    maxSkip: skip,
    direction,
    maxHits: 100,
  }, caseSensitive);
}
