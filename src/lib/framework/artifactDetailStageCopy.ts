export const artifactDetailStageLabels: Record<string, string> = {
  fetching: "Watching the video and transcribing it…",
  transcribing: "Transcribing audio…",
  analyzing: "Reading the transcript and pulling out claims…",
};

export const artifactDetailStageHints: Record<string, string> = {
  fetching:
    "Pulling captions from YouTube (or our transcript service). If nothing happens in ~20s, this page retries automatically.",
  transcribing: "Converting your audio to text. Usually 10–30 seconds.",
  analyzing: "Comparing claims against your framework. Usually 10–30 seconds.",
};
