import { buildTranscriptOnlyStudy } from "./transcriptOnlyStudy";

self.onmessage = (event: MessageEvent<{ id: number; text: string }>) => {
  const { id, text } = event.data;
  if (typeof id !== "number" || typeof text !== "string") return;
  try {
    self.postMessage({ id, result: buildTranscriptOnlyStudy(text) });
  } catch {
    self.postMessage({ id, error: "Local excerpt selection could not finish. Your transcript is still available." });
  }
};
