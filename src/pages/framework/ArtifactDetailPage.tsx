import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw, FileText, Youtube, ArrowRight, Quote, ExternalLink, Bookmark, StickyNote, Sparkles, NotebookPen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import QuickBeliefDialog from "@/components/framework/QuickBeliefDialog";
import { floatingJournalPlaybackRef } from "@/lib/journal/floatingJournalPlaybackRef";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import TranscriptPanel from "@/components/framework/TranscriptPanel";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import TeachingsPanel from "@/components/framework/TeachingsPanel";
import { formatTranscriptClock, splitTranscript, type TranscriptSegment } from "@/lib/transcriptSplit";

interface Artifact {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  error: string | null;
  raw_text: string;
  url?: string | null;
  metadata?: ArtifactMetadata | null;
}

interface ArtifactMetadata {
  source?: string;
  channel_title?: string | null;
  channel_url?: string | null;
  thumbnail_url?: string | null;
  provider_name?: string | null;
  duration_seconds?: number | null;
  title?: string;
}

type YouTubePlayer = {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo?: () => void;
  destroy: () => void;
};

type YouTubePlayerEvent = {
  data?: number;
  target?: YouTubePlayer;
};

declare global {
  interface Window {
    YT?: {
      Player?: new (
        element: HTMLElement,
        options: {
          videoId: string;
          width?: string;
          height?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: YouTubePlayerEvent) => void;
            onStateChange?: (event: YouTubePlayerEvent) => void;
          };
        },
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubeApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("YouTube player unavailable"));
  if (window.YT?.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => {
      youTubeApiPromise = null;
      reject(new Error("YouTube player timed out"));
    }, 10000);

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      resolve();
    };

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => {
      window.clearTimeout(timeout);
      youTubeApiPromise = null;
      reject(new Error("YouTube player failed to load"));
    };
    document.head.appendChild(tag);
  });

  return youTubeApiPromise;
}

function getYouTubeVideoId(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

function titleLooksBad(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim();
  if (!t) return true;
  if (t.length <= 5 && /^\d+(?:\.\d+)?[KMB]?$/i.test(t)) return true;
  if (/^\d+(?:\.\d+)?[KMB]?\s+(views?|subscribers?)\b/i.test(t)) return true;
  return false;
}

function getYouTubeEmbed(url?: string | null, startSeconds = 0) {
  if (!url) return null;
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  const start = Math.max(0, Math.floor(startSeconds));
  const params = new URLSearchParams({
    autoplay: start > 0 ? "1" : "0",
    enablejsapi: "1",
    rel: "0",
  });
  if (start > 0) params.set("start", String(start));
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function youTubeStateLabel(state?: number) {
  switch (state) {
    case 0:
      return "ended";
    case 1:
      return "playing";
    case 2:
      return "paused";
    case 3:
      return "buffering";
    case 5:
      return "cued";
    default:
      return "idle";
  }
}

function withYouTubeTimestamp(url: string | null | undefined, seconds: number) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("t", `${Math.max(0, Math.floor(seconds))}s`);
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}t=${Math.max(0, Math.floor(seconds))}s`;
  }
}

const SOURCE_STOPWORDS = new Set([
  "about", "after", "again", "against", "also", "because", "before", "being", "between", "claim",
  "could", "every", "from", "have", "into", "just", "like", "lord", "more", "much", "must",
  "that", "their", "there", "these", "they", "this", "through", "what", "when", "where", "which",
  "while", "with", "would", "your",
]);

function sourceTermsForClaim(claim: Claim) {
  const sourceText = [
    claim.claim,
    ...(claim.doctrine_tags ?? []),
    ...(claim.scripture_supports ?? []).flatMap((s) => [s.ref, s.note ?? ""]),
    ...(claim.scripture_challenges ?? []).flatMap((s) => [s.ref, s.note ?? ""]),
  ].join(" ");

  return Array.from(new Set(
    sourceText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 3 && !SOURCE_STOPWORDS.has(term)),
  ));
}

function findClaimSource(claim: Claim, segments: TranscriptSegment[]) {
  const terms = sourceTermsForClaim(claim);
  if (!terms.length) return null;

  let best: { segment: TranscriptSegment; score: number } | null = null;
  for (const segment of segments) {
    if (segment.isParagraphBreak || !segment.text.trim()) continue;
    const text = segment.text.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { segment, score };
  }

  if (!best || best.score < Math.min(2, terms.length)) return null;
  return best.segment;
}

interface MatchedBelief {
  id: string;
  topic: string;
  statement: string;
  answer: string | null;
  confidence: number;
}

interface Claim {
  id: string;
  claim: string;
  tone: string | null;
  doctrine_tags: string[];
  scripture_supports: { ref: string; note?: string }[];
  scripture_challenges: { ref: string; note?: string }[];
  match_relation: string | null;
  matched_belief_id: string | null;
  bias_flags: string[];
  verdict: string | null;
  user_note: string | null;
}

type ArtifactMomentKind = "bookmark" | "note" | "belief_seed";

interface ArtifactMoment {
  id: string;
  user_id: string;
  artifact_id: string;
  start_seconds: number;
  end_seconds: number | null;
  kind: ArtifactMomentKind;
  body: string | null;
  label: string | null;
  created_at: string;
}

export default function ArtifactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [a, setA] = useState<Artifact | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [matchedBeliefs, setMatchedBeliefs] = useState<Record<string, MatchedBelief>>({});
  const [polling, setPolling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [savingPaste, setSavingPaste] = useState(false);
  const [videoStartSeconds, setVideoStartSeconds] = useState(0);
  const [liveMeta, setLiveMeta] = useState<ArtifactMetadata | null>(null);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [moments, setMoments] = useState<ArtifactMoment[]>([]);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [savingMoment, setSavingMoment] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);
  const [playerState, setPlayerState] = useState("idle");
  const [quickBeliefOpen, setQuickBeliefOpen] = useState(false);
  const [quickBeliefText, setQuickBeliefText] = useState("");
  const [quickBeliefSource, setQuickBeliefSource] = useState("");
  const youtubePlayerContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const transcriptRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const repairedRef = useRef(false);
  const createProcessingToken = () => crypto.randomUUID();

  const fetchYouTubeMeta = useCallback(async (videoUrl: string): Promise<ArtifactMetadata | null> => {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
      if (!res.ok) return null;
      const json = (await res.json()) as {
        title?: string;
        author_name?: string;
        author_url?: string;
        thumbnail_url?: string;
        provider_name?: string;
      };
      return {
        source: "youtube",
        channel_title: json.author_name ?? null,
        channel_url: json.author_url ?? null,
        thumbnail_url: json.thumbnail_url ?? null,
        provider_name: json.provider_name ?? "YouTube",
        title: json.title ?? undefined,
      };
    } catch {
      return null;
    }
  }, []);

  const load = async () => {
    if (!id) return;
    const artWithMeta = await supabase
      .from("artifacts")
      .select("id,title,kind,status,error,raw_text,url,metadata")
      .eq("id", id)
      .maybeSingle();
    const artResult = artWithMeta.error
      ? await supabase
          .from("artifacts")
          .select("id,title,kind,status,error,raw_text,url")
          .eq("id", id)
          .maybeSingle()
      : artWithMeta;
    const { data: cl } = await supabase
      .from("artifact_claims")
      .select("*")
      .eq("artifact_id", id)
      .order("created_at");
    const { data: momentRows, error: momentError } = await supabase
      .from("artifact_moments")
      .select("id,user_id,artifact_id,start_seconds,end_seconds,kind,body,label,created_at")
      .eq("artifact_id", id)
      .order("start_seconds")
      .order("created_at");
    const art = artResult.data;
    const parsedClaims = ((cl as unknown) as Claim[]) ?? [];
    const beliefIds = Array.from(new Set(parsedClaims.map((c) => c.matched_belief_id).filter(Boolean))) as string[];
    let beliefMap: Record<string, MatchedBelief> = {};
    if (beliefIds.length > 0) {
      const { data: beliefs } = await supabase
        .from("belief_nodes")
        .select("id,topic,statement,answer,confidence")
        .in("id", beliefIds);
      beliefMap = (beliefs ?? []).reduce((acc, belief) => {
        acc[belief.id] = belief as MatchedBelief;
        return acc;
      }, {} as Record<string, MatchedBelief>);
    }
    setMatchedBeliefs(beliefMap);
    setA(art as Artifact | null);
    setClaims(parsedClaims);
    if (!momentError) setMoments(((momentRows as unknown) as ArtifactMoment[]) ?? []);
  };

  useEffect(() => {
    if (!user || !id) return;
    load();
  }, [user, id]);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || !a.url) return;
    if (liveMeta || repairedRef.current) return;
    let cancelled = false;
    (async () => {
      const meta = await fetchYouTubeMeta(a.url!);
      if (cancelled || !meta) return;
      setLiveMeta(meta);

      const shouldFixTitle = !!meta.title && titleLooksBad(a.title) && a.title?.trim() !== meta.title.trim();
      const updatePatch: Record<string, unknown> = {};
      if (shouldFixTitle && meta.title) updatePatch.title = meta.title;

      const dbMeta = {
        source: "youtube",
        channel_title: meta.channel_title ?? null,
        channel_url: meta.channel_url ?? null,
        thumbnail_url: meta.thumbnail_url ?? null,
        provider_name: meta.provider_name ?? "YouTube",
      };

      const tryWithMetadata = await supabase
        .from("artifacts")
        .update({ ...updatePatch, metadata: dbMeta })
        .eq("id", a.id);
      if (tryWithMetadata.error && Object.keys(updatePatch).length > 0) {
        await supabase.from("artifacts").update(updatePatch as never).eq("id", a.id);
      }

      repairedRef.current = true;
      if (shouldFixTitle && meta.title) {
        setA((prev) => (prev ? { ...prev, title: meta.title ?? prev.title } : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [a, fetchYouTubeMeta, liveMeta]);

  // Poll while any in-flight stage is running.
  const inFlight = !!a && ["fetching", "transcribing", "analyzing"].includes(a.status);
  useEffect(() => {
    if (!inFlight) {
      setPolling(false);
      startedRef.current = null;
      setElapsed(0);
      return;
    }
    setPolling(true);
    if (startedRef.current === null) startedRef.current = Date.now();
    const poll = setInterval(load, 2500);
    const tick = setInterval(() => {
      if (startedRef.current) setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlight]);

  const transcriptSplit = useMemo(() => splitTranscript(a?.raw_text || ""), [a?.raw_text]);
  const transcriptSegments = transcriptSplit.segments;
  const transcriptTimedLayout = transcriptSplit.timed;
  const transcriptCoarseOnly = transcriptSplit.coarseTimestampsOnly;
  const claimSources = useMemo(() => {
    return claims.reduce((acc, claim) => {
      acc[claim.id] = findClaimSource(claim, transcriptSegments);
      return acc;
    }, {} as Record<string, TranscriptSegment | null>);
  }, [claims, transcriptSegments]);
  const youTubeVideoId = useMemo(() => (a?.kind === "youtube" ? getYouTubeVideoId(a.url) : null), [a?.kind, a?.url]);
  const embedUrl = useMemo(
    () => (a?.kind === "youtube" ? getYouTubeEmbed(a.url, videoStartSeconds) : null),
    [a?.kind, a?.url, videoStartSeconds],
  );

  useEffect(() => {
    if (!youTubeVideoId || !youtubePlayerContainerRef.current) {
      setPlayerReady(false);
      return;
    }

    let cancelled = false;
    setPlayerReady(false);
    setPlayerFailed(false);
    setPlayerState("loading");

    loadYouTubeIframeApi()
      .then(() => {
        if (cancelled || !youtubePlayerContainerRef.current || !window.YT?.Player) return;
        const player = new window.YT.Player(youtubePlayerContainerRef.current, {
          videoId: youTubeVideoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: videoStartSeconds > 0 ? 1 : 0,
            enablejsapi: 1,
            rel: 0,
            start: Math.max(0, Math.floor(videoStartSeconds)),
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              youtubePlayerRef.current = player;
              setPlayerReady(true);
              setPlayerState("ready");
            },
            onStateChange: (event) => setPlayerState(youTubeStateLabel(event.data)),
          },
        });
        youtubePlayerRef.current = player;
      })
      .catch(() => {
        if (cancelled) return;
        setPlayerFailed(true);
        setPlayerState("unavailable");
      });

    return () => {
      cancelled = true;
      setPlayerReady(false);
      const player = youtubePlayerRef.current;
      youtubePlayerRef.current = null;
      player?.destroy();
    };
    // Create the player once per video; seeking is handled imperatively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youTubeVideoId]);

  useEffect(() => {
    if (!a?.id) {
      useFloatingJournalStore.getState().setRouteArtifact(null);
      return;
    }
    useFloatingJournalStore.getState().setRouteArtifact({
      id: a.id,
      title: a.title || "Untitled artifact",
      kind: a.kind,
    });
    return () => {
      useFloatingJournalStore.getState().setRouteArtifact(null);
    };
  }, [a?.id, a?.title, a?.kind]);

  const canCapturePlaybackForJournal = Boolean(
    embedUrl && playerReady && !playerFailed && a?.kind === "youtube",
  );

  useEffect(() => {
    if (!a || a.kind !== "youtube") {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
      return;
    }
    floatingJournalPlaybackRef.current = () => {
      const current = youtubePlayerRef.current?.getCurrentTime?.();
      if (typeof current === "number" && Number.isFinite(current)) return Math.max(0, Math.floor(current));
      return Math.max(0, Math.floor(videoStartSeconds));
    };
    useFloatingJournalStore.getState().setPlaybackCaptureAvailable(canCapturePlaybackForJournal);
    return () => {
      floatingJournalPlaybackRef.current = null;
      useFloatingJournalStore.getState().setPlaybackCaptureAvailable(false);
    };
  }, [a, a?.id, a?.kind, canCapturePlaybackForJournal, videoStartSeconds]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!a) return <FrameworkLayout title="Artifact" back="/framework/artifacts">Loading…</FrameworkLayout>;

  const setVerdict = async (cid: string, verdict: string) => {
    await supabase.from("artifact_claims").update({ verdict }).eq("id", cid);
    setClaims((cs) => cs.map((c) => (c.id === cid ? { ...c, verdict } : c)));
  };

  const reanalyze = async () => {
    const processingToken = createProcessingToken();
    await supabase.from("artifacts").update({ status: "analyzing", error: null, processing_token: processingToken }).eq("id", a.id);
    await supabase.from("artifact_claims").delete().eq("artifact_id", a.id);
    await supabase.from("entity_mentions").delete().eq("artifact_id", a.id);
    await supabase.from("teachings").delete().eq("artifact_id", a.id).eq("status", "proposed");
    setClaims([]);
    setA({ ...a, status: "analyzing", error: null });
    supabase.functions.invoke("framework-analyze", { body: { artifact_id: a.id, processing_token: processingToken } }).catch((e) => {
      console.error(e);
      toast({ title: "Could not start analysis", variant: "destructive" });
    });
  };

  const retryFetch = async () => {
    if (!a.url) return;
    const processingToken = createProcessingToken();
    await supabase.from("artifacts").update({ status: "fetching", error: null, processing_token: processingToken }).eq("id", a.id);
    setA({ ...a, status: "fetching", error: null });
    supabase.functions
      .invoke("framework-fetch-transcript", { body: { artifact_id: a.id, url: a.url, processing_token: processingToken } })
      .catch((e) => console.error(e));
  };

  const submitPasted = async () => {
    if (!pasteText.trim()) return;
    setSavingPaste(true);
    const processingToken = createProcessingToken();
    await supabase
      .from("artifacts")
      .update({ raw_text: pasteText.trim(), status: "analyzing", error: null, processing_token: processingToken })
      .eq("id", a.id);
    await supabase.from("artifact_claims").delete().eq("artifact_id", a.id);
    await supabase.from("entity_mentions").delete().eq("artifact_id", a.id);
    await supabase.from("teachings").delete().eq("artifact_id", a.id).eq("status", "proposed");
    setClaims([]);
    setA({ ...a, raw_text: pasteText.trim(), status: "analyzing", error: null });
    setPasteOpen(false);
    setSavingPaste(false);
    supabase.functions
      .invoke("framework-analyze", { body: { artifact_id: a.id, processing_token: processingToken } })
      .catch((e) => console.error(e));
  };

  const artifactMetadata = (a.metadata ?? {}) as ArtifactMetadata;
  const claimsDigest = claims.map((c, i) => `${i + 1}. ${c.claim}`).join("\n");
  const canCaptureMoments = !!embedUrl && playerReady && !playerFailed;

  const copyTranscript = async () => {
    if (!a.raw_text) return;
    await navigator.clipboard.writeText(a.raw_text);
    toast({ title: "Transcript copied" });
  };

  const getCurrentPlaybackSeconds = () => {
    const current = youtubePlayerRef.current?.getCurrentTime?.();
    if (typeof current === "number" && Number.isFinite(current)) return Math.max(0, Math.floor(current));
    return Math.max(0, Math.floor(videoStartSeconds));
  };

  const scrollTranscriptToSeconds = (seconds: number) => {
    const source = transcriptSegments
      .filter((segment) => !segment.isParagraphBreak && segment.startSeconds != null && segment.startSeconds <= seconds)
      .sort((left, right) => (right.startSeconds ?? 0) - (left.startSeconds ?? 0))[0];
    if (source) transcriptRefs.current[source.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const seekVideoToSeconds = (seconds: number) => {
    const start = Math.max(0, Math.floor(seconds));
    setVideoStartSeconds(start);
    if (playerReady && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(start, true);
      youtubePlayerRef.current.playVideo?.();
    }
    scrollTranscriptToSeconds(start);
  };

  const saveMoment = async (
    kind: ArtifactMomentKind,
    values: { label?: string | null; body?: string | null; startSeconds?: number } = {},
  ) => {
    if (!user) return null;
    const startSeconds = values.startSeconds ?? getCurrentPlaybackSeconds();
    setSavingMoment(true);
    const payload = {
      user_id: user.id,
      artifact_id: a.id,
      start_seconds: startSeconds,
      kind,
      label: values.label?.trim() || null,
      body: values.body?.trim() || null,
    };
    const { data, error } = await supabase
      .from("artifact_moments")
      .insert(payload)
      .select("id,user_id,artifact_id,start_seconds,end_seconds,kind,body,label,created_at")
      .maybeSingle();
    setSavingMoment(false);
    if (error || !data) {
      toast({ title: "Could not save moment", description: error?.message, variant: "destructive" });
      return null;
    }
    const saved = (data as unknown) as ArtifactMoment;
    setMoments((current) => [...current, saved].sort((left, right) => left.start_seconds - right.start_seconds));
    toast({ title: kind === "note" ? "Note saved" : kind === "belief_seed" ? "Belief moment saved" : "Moment bookmarked" });
    return saved;
  };

  const openJournalFromArtifact = (startSeconds?: number) => {
    const qs = new URLSearchParams();
    if (a.title) qs.set("artifactTitle", encodeURIComponent(a.title));
    if (a.url) qs.set("artifactUrl", encodeURIComponent(startSeconds == null ? a.url : withYouTubeTimestamp(a.url, startSeconds)));
    if (a.raw_text) qs.set("artifactTranscript", encodeURIComponent(a.raw_text.slice(0, 12000)));
    if (claimsDigest) qs.set("artifactClaims", encodeURIComponent(claimsDigest.slice(0, 6000)));
    if (startSeconds != null) qs.set("artifactTime", String(Math.max(0, Math.floor(startSeconds))));
    navigate(`/journal/new?${qs.toString()}`);
  };

  const jumpToTranscriptSource = (segment: TranscriptSegment | null) => {
    if (!segment || segment.isParagraphBreak) return;
    transcriptRefs.current[segment.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (segment.startSeconds != null) seekVideoToSeconds(segment.startSeconds);
  };

  const bookmarkCurrentMoment = async () => {
    const saved = await saveMoment("bookmark", { label: bookmarkLabel });
    if (saved) setBookmarkLabel("");
  };

  const addNoteAtCurrentMoment = async () => {
    const saved = await saveMoment("note", { body: noteBody });
    if (saved) setNoteBody("");
  };

  const believeCurrentMoment = async () => {
    const seconds = getCurrentPlaybackSeconds();
    const timestamp = formatTranscriptClock(seconds);
    const sourceUrl = withYouTubeTimestamp(a.url, seconds);
    const text = `I believe this from ${a.title || "this video"} at ${timestamp}:\n\n`;
    const source = sourceUrl || `${a.title || "YouTube artifact"} at ${timestamp}`;
    setQuickBeliefText(text);
    setQuickBeliefSource(source);
    setQuickBeliefOpen(true);
    await saveMoment("belief_seed", { label: "Belief seed", body: text, startSeconds: seconds });
  };

  const stageLabel: Record<string, string> = {
    fetching: a.kind === "youtube" ? "Watching the video and transcribing it…" : "Fetching content…",
    transcribing: "Transcribing audio…",
    analyzing: "Reading the transcript and pulling out claims…",
  };
  const stageHint: Record<string, string> = {
    fetching: "Looking for the video's official caption track. This usually takes a few seconds.",
    transcribing: "Converting your audio to text. Usually 10–30 seconds.",
    analyzing: "Comparing claims against your framework. Usually 10–30 seconds.",
  };

  /** Approx. framework sticky header + main vertical padding for `lg` split-pane height. */
  const artifactSplitPaneHeightClass = "lg:h-[calc(100dvh-10rem)]";

  return (
    <FrameworkLayout title={a.title || "Untitled artifact"} back="/framework/artifacts">
      <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase tracking-wider">{a.kind}</span>
        <span>·</span>
        <span className="uppercase tracking-wider flex items-center gap-1">
          {inFlight && <Loader2 className="w-3 h-3 animate-spin" />}
          {a.status}
        </span>
        {!inFlight && a.status !== "error" && (
          <Button size="sm" variant="ghost" onClick={reanalyze} className="ml-auto h-7">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-analyze
          </Button>
        )}
      </div>

      <div
        className={`lg:grid lg:grid-cols-5 lg:items-stretch lg:gap-6 lg:min-h-0 ${artifactSplitPaneHeightClass}`}
      >
        <div className="min-h-0 space-y-5 lg:col-span-3 lg:overflow-y-auto lg:pr-1">
      {a.kind === "youtube" && (() => {
        const meta: ArtifactMetadata = {
          ...(liveMeta ?? {}),
          ...Object.fromEntries(Object.entries(artifactMetadata).filter(([, v]) => v != null && v !== "")),
        };
        const thumb = meta.thumbnail_url || liveMeta?.thumbnail_url;
        const channel = meta.channel_title || liveMeta?.channel_title;
        const channelUrl = meta.channel_url || liveMeta?.channel_url;
        const provider = meta.provider_name || liveMeta?.provider_name || "YouTube";
        if (!thumb && !channel && !a.title) return null;
        return (
          <section className="mb-5 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              {thumb && (
                <img src={thumb} alt="" className="h-16 w-28 rounded object-cover bg-muted flex-none" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{provider}</div>
                <div className="font-medium truncate">{a.title || "Untitled video"}</div>
                {channel && (
                  <div className="text-sm text-muted-foreground truncate">
                    by {channelUrl ? (
                      <a href={channelUrl} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                        {channel}<ExternalLink className="w-3 h-3" />
                      </a>
                    ) : channel}
                  </div>
                )}
              </div>
              {a.url && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start"
                  disabled={refreshingMeta}
                  onClick={async () => {
                    if (!a.url) return;
                    setRefreshingMeta(true);
                    repairedRef.current = false;
                    setLiveMeta(null);
                    const meta = await fetchYouTubeMeta(a.url);
                    if (meta) {
                      setLiveMeta(meta);
                      const patch: Record<string, unknown> = {};
                      if (meta.title) patch.title = meta.title;
                      const dbMeta = {
                        source: "youtube",
                        channel_title: meta.channel_title ?? null,
                        channel_url: meta.channel_url ?? null,
                        thumbnail_url: meta.thumbnail_url ?? null,
                        provider_name: meta.provider_name ?? "YouTube",
                      };
                      const tryWithMetadata = await supabase
                        .from("artifacts")
                        .update({ ...patch, metadata: dbMeta })
                        .eq("id", a.id);
                      if (tryWithMetadata.error && Object.keys(patch).length > 0) {
                        await supabase.from("artifacts").update(patch as never).eq("id", a.id);
                      }
                      if (meta.title) setA((prev) => (prev ? { ...prev, title: meta.title ?? prev.title } : prev));
                      toast({ title: "Video info refreshed" });
                    } else {
                      toast({ title: "Could not fetch video info", variant: "destructive" });
                    }
                    setRefreshingMeta(false);
                  }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshingMeta ? "animate-spin" : ""}`} /> Refresh
                </Button>
              )}
            </div>
          </section>
        );
      })()}

      {inFlight && (
        <div className="mb-5 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            {stageLabel[a.status] ?? "Working…"}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{elapsed}s</span>
          </div>
          <p className="text-xs text-muted-foreground">{stageHint[a.status]}</p>
          {a.status === "fetching" && elapsed > 90 && (
            <p className="text-xs text-amber-700 mt-2">
              Taking longer than expected. Long videos can take several minutes. You can also paste the transcript yourself.
            </p>
          )}
          {(a.status === "fetching" || a.status === "transcribing") && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
                <FileText className="w-3.5 h-3.5 mr-1" /> Paste transcript instead
              </Button>
            </div>
          )}
        </div>
      )}

      {a.error && a.status === "error" && (
        <div className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="mb-2">{a.error}</div>
          <div className="flex flex-wrap gap-2">
            {a.kind === "youtube" && a.url && (
              <Button size="sm" variant="outline" onClick={retryFetch}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try fetch again
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Paste transcript
            </Button>
          </div>
        </div>
      )}

      {embedUrl && (
        <section className="mb-5 rounded-lg border border-border bg-card p-3 lg:mb-0">
          <div className="lg:sticky lg:top-0 lg:z-10 lg:-mx-3 lg:rounded-t-lg lg:border-b lg:border-border lg:bg-card lg:px-3 lg:pt-3 lg:pb-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Youtube className="w-4 h-4 text-red-600" /> Video
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {playerFailed ? "static embed" : playerReady ? playerState : "loading controls"}
              </span>
            </div>
            {playerFailed ? (
              <iframe
                title="YouTube video"
                src={embedUrl}
                className="w-full aspect-video rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="aspect-video w-full overflow-hidden rounded bg-muted [&>iframe]:h-full [&>iframe]:w-full">
                <div ref={youtubePlayerContainerRef} className="h-full w-full" />
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 lg:mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div>
                <div className="text-sm font-medium">Capture while watching</div>
                <p className="text-xs text-muted-foreground">
                  Save bookmarks, notes, and belief seeds at the current playback time.
                </p>
              </div>
              {!canCaptureMoments && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {playerFailed ? "Player controls are blocked, so moment capture is disabled." : "Moment capture enables when the player is ready."}
                </span>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={bookmarkLabel}
                    onChange={(event) => setBookmarkLabel(event.target.value)}
                    placeholder="Optional bookmark label"
                    disabled={!canCaptureMoments || savingMoment}
                  />
                  <Button onClick={bookmarkCurrentMoment} disabled={!canCaptureMoments || savingMoment}>
                    <Bookmark className="mr-1 h-3.5 w-3.5" /> Bookmark
                  </Button>
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    rows={3}
                    placeholder="Add a note at the current moment..."
                    disabled={!canCaptureMoments || savingMoment}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={addNoteAtCurrentMoment}
                      disabled={!canCaptureMoments || savingMoment || !noteBody.trim()}
                    >
                      <StickyNote className="mr-1 h-3.5 w-3.5" /> Save note
                    </Button>
                    <Button variant="outline" onClick={believeCurrentMoment} disabled={!canCaptureMoments || savingMoment}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> I believe this
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => openJournalFromArtifact(getCurrentPlaybackSeconds())}
                      disabled={!canCaptureMoments}
                    >
                      Journal from here
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => useFloatingJournalStore.getState().setPanelOpen(true)}
                      title="Mini journal (timestamp inserts when the player is ready)"
                    >
                      <NotebookPen className="mr-1 h-3.5 w-3.5" /> Journal here
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-background/70 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Saved moments
                </div>
                {moments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No moments saved yet.</p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-auto pr-1">
                    {moments.map((moment) => (
                      <button
                        key={moment.id}
                        type="button"
                        onClick={() => seekVideoToSeconds(moment.start_seconds)}
                        disabled={!canCaptureMoments}
                        className="w-full rounded-md border border-border bg-card p-2 text-left text-sm transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{formatTranscriptClock(moment.start_seconds)}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{moment.kind.replace("_", " ")}</span>
                        </div>
                        <div className="mt-1 font-medium">{moment.label || moment.body || "Untitled moment"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
        </div>

        <aside
          className="mt-8 min-h-0 space-y-4 lg:col-span-2 lg:mt-0 lg:overflow-y-auto lg:overflow-x-hidden lg:pl-0.5"
          aria-label="Transcript and AI claims"
        >
      {a.raw_text && (
        <TranscriptPanel
          segments={transcriptSegments}
          timed={transcriptTimedLayout}
          coarseTimestampsOnly={transcriptCoarseOnly}
          embedAvailable={Boolean(embedUrl) && !playerFailed}
          playerReady={playerReady}
          getPlaybackSeconds={getCurrentPlaybackSeconds}
          onSeek={seekVideoToSeconds}
          onCopy={copyTranscript}
          onJournal={() => openJournalFromArtifact()}
          onRetryFetch={a.kind === "youtube" && a.url ? retryFetch : undefined}
          retryDisabled={inFlight}
          setSegmentRef={(id, el) => {
            transcriptRefs.current[id] = el;
          }}
          extraHeaderActions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => useFloatingJournalStore.getState().setPanelOpen(true)}
              title="Journal here without leaving this page"
            >
              <NotebookPen className="mr-1 h-3.5 w-3.5" /> Journal here
            </Button>
          }
        />
      )}

      {a.status === "ready" && <ArtifactEntitiesPanel artifactId={a.id} artifactStatus={a.status} />}

      {a.status === "ready" && <TeachingsPanel artifactId={a.id} artifactStatus={a.status} />}

      {a.status === "ready" && claims.length > 0 && (
        <div className="mb-4 rounded border border-border bg-muted/20 p-3 text-sm">
          AI split this transcript into <span className="font-medium">{claims.length} key sections/claims</span> below so you can decide what to keep, reject, or revise in your belief framework.
        </div>
      )}

      {a.status === "ready" && claims.length === 0 && !a.error && (
        <div className="mb-4 rounded border border-border bg-muted/30 p-3 text-sm">
          The transcript came through but no clear claims were extracted. Try Re-analyze, or paste a different excerpt.
        </div>
      )}

      {pasteOpen && (
        <div className="mb-5 rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium mb-2">Paste the transcript</div>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            placeholder="Paste the YouTube transcript or your own notes…"
            className="mb-3 font-serif"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitPasted} disabled={savingPaste || !pasteText.trim()}>
              {savingPaste ? "Saving…" : "Use this & analyze"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {a.raw_text && a.status !== "ready" && (
        <details className="mb-5 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Transcript captured ({a.raw_text.length.toLocaleString()} chars)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap font-serif text-sm bg-muted/30 p-3 rounded max-h-64 overflow-auto">
            {a.raw_text.slice(0, 4000)}
            {a.raw_text.length > 4000 ? "…" : ""}
          </pre>
        </details>
      )}

      <div className="space-y-4">
        {claims.map((c) => {
          const source = claimSources[c.id];
          return (
          <article key={c.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-display text-base leading-snug flex-1">{c.claim}</p>
              {c.verdict && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-foreground text-background">
                  {c.verdict}
                </span>
              )}
            </div>

            <div className="mb-3 rounded-md border border-border bg-muted/20 p-3 text-xs">
              <div className="mb-1 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Quote className="w-3 h-3" />
                Source in transcript
              </div>
              {source ? (
                <div className="space-y-2">
                  <p className="font-serif text-sm leading-6 text-foreground line-clamp-3">
                    {source.text}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => jumpToTranscriptSource(source)}>
                    {source.startSeconds != null ? `Play from ${source.label}` : `Jump to ${source.label}`}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No exact transcript section was detected for this older analysis. Re-analyze after the timestamped transcript update for stronger source links.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3 text-[10px] uppercase tracking-wider">
              {c.tone && (
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">tone: {c.tone}</span>
              )}
              {c.doctrine_tags?.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
              ))}
              {c.match_relation && (
                <span className={`px-2 py-0.5 rounded ${
                  c.match_relation === "agree"
                    ? "bg-emerald-100 text-emerald-900"
                    : c.match_relation === "disagree"
                    ? "bg-red-100 text-red-900"
                    : "bg-amber-100 text-amber-900"
                }`}>
                  {c.match_relation === "new" ? "new to your framework" : `you ${c.match_relation}`}
                </span>
              )}
              {c.bias_flags?.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                  ⚠ {f}
                </span>
              ))}
            </div>

            {(c.matched_belief_id && matchedBeliefs[c.matched_belief_id]) && (
              <div className="mb-3 rounded-md border border-border bg-muted/30 p-3 text-xs space-y-2">
                <div className="uppercase tracking-wider text-muted-foreground">Your current belief context</div>
                <div>
                  <p className="font-medium text-foreground">{matchedBeliefs[c.matched_belief_id].statement}</p>
                  {matchedBeliefs[c.matched_belief_id].answer && (
                    <p className="text-muted-foreground mt-1 line-clamp-3">{matchedBeliefs[c.matched_belief_id].answer}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-background border border-border">confidence {matchedBeliefs[c.matched_belief_id].confidence}%</span>
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    {c.match_relation === "agree" ? "reinforces what you already believe" : c.match_relation === "disagree" ? "challenges your current belief" : "partly overlaps with your current belief"}
                  </span>
                </div>
              </div>
            )}

            {(c.scripture_supports?.length ?? 0) + (c.scripture_challenges?.length ?? 0) > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 mb-3 text-xs">
                <div>
                  <div className="uppercase tracking-wider text-muted-foreground mb-1">Supports</div>
                  <ul className="space-y-1">
                    {c.scripture_supports?.map((s, i) => (
                      <li key={i}><span className="font-medium">{s.ref}</span>{s.note ? ` — ${s.note}` : ""}</li>
                    )) || <li className="text-muted-foreground">—</li>}
                  </ul>
                </div>
                <div>
                  <div className="uppercase tracking-wider text-muted-foreground mb-1">Challenges</div>
                  <ul className="space-y-1">
                    {c.scripture_challenges?.map((s, i) => (
                      <li key={i}><span className="font-medium">{s.ref}</span>{s.note ? ` — ${s.note}` : ""}</li>
                    )) || <li className="text-muted-foreground">—</li>}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={c.verdict === "keep" ? "default" : "outline"} onClick={() => setVerdict(c.id, "keep")}>Keep</Button>
              <Button size="sm" variant={c.verdict === "reject" ? "default" : "outline"} onClick={() => setVerdict(c.id, "reject")}>Reject</Button>
              <Button size="sm" variant={c.verdict === "updated" ? "default" : "outline"} onClick={() => setVerdict(c.id, "updated")}>Update my belief</Button>
            </div>
          </article>
          );
        })}
      </div>
        </aside>
      </div>

      {polling && (
        <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Watching for new claims…
        </p>
      )}

      <QuickBeliefDialog
        open={quickBeliefOpen}
        onOpenChange={setQuickBeliefOpen}
        initialText={quickBeliefText}
        initialSource={quickBeliefSource}
      />

    </FrameworkLayout>
  );
}
