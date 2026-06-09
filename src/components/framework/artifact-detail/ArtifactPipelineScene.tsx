import { Brain, Captions, FileSearch, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ANALYZING_ORBITS = [
  { label: "Claims", className: "pipeline-orbit-1 text-violet-700 dark:text-violet-300" },
  { label: "Scripture", className: "pipeline-orbit-2 text-amber-800 dark:text-amber-300" },
  { label: "Doctrine", className: "pipeline-orbit-3 text-emerald-800 dark:text-emerald-300" },
  { label: "Bias flags", className: "pipeline-orbit-4 text-rose-800 dark:text-rose-300" },
] as const;

function SceneBackdrop({ variant }: { variant: "analyze" | "fetch" | "transcribe" }) {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-90",
          variant === "analyze" &&
            "bg-[radial-gradient(ellipse_at_center,hsl(262_83%_58%/0.16),transparent_68%)]",
          variant === "fetch" &&
            "bg-[radial-gradient(ellipse_at_center,hsl(0_72%_51%/0.12),transparent_68%)]",
          variant === "transcribe" &&
            "bg-[radial-gradient(ellipse_at_center,hsl(38_92%_50%/0.14),transparent_68%)]",
        )}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 pipeline-grid-fade opacity-[0.35]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" aria-hidden />
    </>
  );
}

function AnalyzingScene() {
  return (
    <div className="relative flex h-40 items-center justify-center overflow-hidden sm:h-44">
      <SceneBackdrop variant="analyze" />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-violet-500/25"
        viewBox="0 0 320 160"
        aria-hidden
      >
        <path
          d="M40 80 C 90 20, 130 20, 160 80 S 230 140, 280 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="pipeline-synapse-a"
        />
        <path
          d="M60 120 C 110 60, 150 60, 180 120 S 250 180, 300 120"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="pipeline-synapse-b"
        />
      </svg>

      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-violet-500/20 pipeline-brain-ring-a" aria-hidden />
        <span className="absolute inset-2 rounded-full border border-violet-400/15 pipeline-brain-ring-b" aria-hidden />
        <span className="absolute inset-0 rounded-full bg-violet-500/10 pipeline-brain-glow" aria-hidden />
        <Brain className="relative z-10 h-11 w-11 text-violet-600 dark:text-violet-300" strokeWidth={1.6} aria-hidden />
        <Sparkles className="absolute -right-1 top-2 h-4 w-4 text-amber-500/90 pipeline-spark" aria-hidden />
      </div>

      <div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2">
        {ANALYZING_ORBITS.map(({ label, className }) => (
          <span
            key={label}
            className={cn(
              "absolute left-0 top-0 inline-flex min-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur-sm",
              className,
            )}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-6 bottom-3 flex items-end justify-center gap-1.5" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-violet-500/35 pipeline-wave-bar"
            style={{ animationDelay: `${i * 0.08}s`, height: `${10 + (i % 5) * 4}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function FetchingScene() {
  return (
    <div className="relative h-40 overflow-hidden sm:h-44">
      <SceneBackdrop variant="fetch" />
      <div className="absolute inset-x-0 top-6 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-background/80 shadow-sm backdrop-blur-sm">
          <Captions className="h-7 w-7 text-red-600 dark:text-red-400 pipeline-caption-pulse" aria-hidden />
        </div>
      </div>
      <div className="absolute inset-x-4 top-[5.5rem] space-y-2" aria-hidden>
        {Array.from({ length: 5 }).map((_, row) => (
          <div
            key={row}
            className="flex gap-2 pipeline-transcript-row"
            style={{ animationDelay: `${row * 0.35}s` }}
          >
            <span className="h-2 w-8 shrink-0 rounded-full bg-red-500/20" />
            <span
              className="h-2 rounded-full bg-foreground/10"
              style={{ width: `${55 + ((row * 17) % 35)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/90 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-red-500/40 pipeline-wave-bar"
            style={{ animationDelay: `${i * 0.07}s`, height: `${8 + (i % 4) * 5}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function TranscribingScene() {
  return (
    <div className="relative flex h-40 flex-col items-center justify-center overflow-hidden sm:h-44">
      <SceneBackdrop variant="transcribe" />
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/25 bg-background/80 shadow-sm backdrop-blur-sm">
        <Mic className="h-7 w-7 text-amber-600 dark:text-amber-400 pipeline-mic-pulse" aria-hidden />
        <span className="absolute inset-0 rounded-full border border-amber-500/20 pipeline-brain-ring-a" aria-hidden />
      </div>
      <div className="flex items-end justify-center gap-1.5 px-8" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-amber-500/45 pipeline-wave-bar"
            style={{ animationDelay: `${i * 0.06}s`, height: `${12 + (i % 6) * 5}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function DefaultScene() {
  return (
    <div className="relative flex h-32 items-center justify-center overflow-hidden sm:h-36">
      <SceneBackdrop variant="analyze" />
      <FileSearch className="h-10 w-10 text-muted-foreground pipeline-caption-pulse" aria-hidden />
    </div>
  );
}

export type ArtifactPipelineSceneProps = {
  status: string;
};

export default function ArtifactPipelineScene({ status }: ArtifactPipelineSceneProps) {
  if (status === "analyzing") return <AnalyzingScene />;
  if (status === "fetching") return <FetchingScene />;
  if (status === "transcribing") return <TranscribingScene />;
  return <DefaultScene />;
}

export const artifactPipelineMicroCopy: Record<string, string[]> = {
  analyzing: [
    "Scanning the transcript line by line…",
    "Pulling out testable claims…",
    "Cross-referencing your belief framework…",
    "Surfacing scripture supports and challenges…",
    "Flagging bias patterns and doctrinal tags…",
  ],
  fetching: [
    "Pulling captions from YouTube…",
    "Trying alternate transcript sources…",
    "Paid transcript service may take 1–2 minutes for long videos…",
    "Aligning timestamps with the video…",
  ],
  transcribing: [
    "Listening to the audio track…",
    "Building a timed transcript…",
    "Cleaning up speech boundaries…",
  ],
};
