import { searchElsAtSkip } from "@/lib/code-lab/elsSearch";
import type { TextProfile } from "@/lib/code-lab/textProfiles";
import type { ElsDirection, TextStream } from "@/lib/code-lab/types";

/** Fisher–Yates shuffle of letter string preserving length. */
export function shuffleLetters(letters: string, seed = Date.now()): string {
  const arr = letters.split("");
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.join("");
}

export function shuffledControlStream(stream: TextStream, seed?: number): TextStream {
  const shuffled = shuffleLetters(stream.letters, seed);
  return {
    ...stream,
    letters: shuffled,
  };
}

export interface ControlResult {
  shuffledHitCount: number;
  searchedSkips: number;
  note: string;
}

export function runShuffleControl(
  stream: TextStream,
  profile: TextProfile,
  term: string,
  skip: number,
  direction: ElsDirection | "both",
  seed?: number,
): ControlResult {
  const control = shuffledControlStream(stream, seed);
  const hits = searchElsAtSkip(control, profile, term, skip, direction);
  return {
    shuffledHitCount: hits.length,
    searchedSkips: 1,
    note:
      hits.length > 0
        ? "Shuffled text also contains this pattern at this skip — may be chance."
        : "Shuffled control found no match at this skip.",
  };
}

export function countSearchSpace(minSkip: number, maxSkip: number, directions: number): number {
  return Math.max(0, maxSkip - minSkip + 1) * directions;
}
