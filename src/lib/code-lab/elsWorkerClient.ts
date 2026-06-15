import type { TextProfile } from "@/lib/code-lab/textProfiles";
import type { ElsHit, ElsSearchOptions, TextStream } from "@/lib/code-lab/types";

const WORKER_THRESHOLD = 4_000;

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("@/workers/codeLabElsWorker.ts", import.meta.url), {
      type: "module",
    });
  }
  return worker;
}

export function shouldUseElsWorker(stream: TextStream, minSkip: number, maxSkip: number): boolean {
  return stream.letters.length >= WORKER_THRESHOLD || maxSkip - minSkip > 80;
}

export function searchElsAsync(
  stream: TextStream,
  profile: TextProfile,
  term: string,
  options: ElsSearchOptions,
  caseSensitive = false,
): Promise<ElsHit[]> {
  if (!shouldUseElsWorker(stream, options.minSkip, options.maxSkip)) {
    return import("@/lib/code-lab/elsSearch").then(({ searchEls }) =>
      Promise.resolve(searchEls(stream, profile, term, options, caseSensitive)),
    );
  }

  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const w = getWorker();

    const onMessage = (ev: MessageEvent<{ id: string; hits: ElsHit[] }>) => {
      if (ev.data.id !== id) return;
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      resolve(ev.data.hits);
    };

    const onError = (err: ErrorEvent) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      reject(err.error ?? new Error(err.message));
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);

    w.postMessage({
      id,
      stream: {
        bibleId: stream.bibleId,
        profileId: stream.profileId,
        letters: stream.letters,
        indexMap: stream.indexMap,
      },
      term,
      profileId: profile.id,
      options,
      caseSensitive,
    });
  });
}
