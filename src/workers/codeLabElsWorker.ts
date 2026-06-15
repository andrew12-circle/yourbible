import { searchEls } from "@/lib/code-lab/elsSearch";
import { TEXT_PROFILES } from "@/lib/code-lab/textProfiles";
import type { ElsHit, ElsSearchOptions, TextProfileId, TextStream } from "@/lib/code-lab/types";

export interface ElsWorkerRequest {
  id: string;
  stream: Pick<TextStream, "letters" | "indexMap" | "bibleId" | "profileId">;
  term: string;
  profileId: TextProfileId;
  options: ElsSearchOptions;
  caseSensitive?: boolean;
}

export interface ElsWorkerResponse {
  id: string;
  hits: ElsHit[];
}

self.onmessage = (ev: MessageEvent<ElsWorkerRequest>) => {
  const { id, stream, term, profileId, options, caseSensitive } = ev.data;
  const profile = TEXT_PROFILES[profileId as Exclude<TextProfileId, "auto">];
  if (!profile) {
    const res: ElsWorkerResponse = { id, hits: [] };
    self.postMessage(res);
    return;
  }

  const fullStream = stream as TextStream;
  const hits = searchEls(fullStream, profile, term, options, caseSensitive);
  const res: ElsWorkerResponse = { id, hits };
  self.postMessage(res);
};
