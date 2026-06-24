import {
  buildJournalVideoConstraints,
  pickJournalVideoMimeType,
  tuneJournalVideoStream,
} from "@/lib/journal/videos";

export type JournalVideoCaptureMode = "camera" | "screen";

export type ScreenCompositeSession = {
  compositeStream: MediaStream;
  stop: () => void;
};

export function screenCaptureSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia) &&
    typeof HTMLCanvasElement !== "undefined"
  );
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return;
  await new Promise<void>((resolve) => {
    video.onloadeddata = () => resolve();
  });
}

export type CreateScreenCompositeOptions = {
  onScreenShareEnded?: () => void;
};

/** Screen recording with a Loom-style webcam bubble (bottom-left). */
export async function createScreenCompositeSession(
  options: CreateScreenCompositeOptions = {},
): Promise<ScreenCompositeSession> {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: true,
  });

  const screenHasAudio = screenStream.getAudioTracks().length > 0;
  const cameraStream = await navigator.mediaDevices.getUserMedia({
    video: buildJournalVideoConstraints().video ?? true,
    audio: !screenHasAudio,
  });
  await tuneJournalVideoStream(cameraStream);

  const screenVideo = document.createElement("video");
  screenVideo.srcObject = screenStream;
  screenVideo.playsInline = true;
  screenVideo.muted = true;

  const cameraVideo = document.createElement("video");
  cameraVideo.srcObject = cameraStream;
  cameraVideo.playsInline = true;
  cameraVideo.muted = true;

  await Promise.all([screenVideo.play(), cameraVideo.play()]);
  await Promise.all([waitForVideoReady(screenVideo), waitForVideoReady(cameraVideo)]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    screenStream.getTracks().forEach((t) => t.stop());
    cameraStream.getTracks().forEach((t) => t.stop());
    throw new Error("Canvas is not available for screen recording.");
  }

  const syncCanvasSize = () => {
    const srcW = screenVideo.videoWidth || 1280;
    const srcH = screenVideo.videoHeight || 720;
    const maxW = 960;
    let w = srcW;
    let h = srcH;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };
  syncCanvasSize();

  let raf = 0;
  let stopped = false;

  const drawFrame = () => {
    if (stopped) return;
    syncCanvasSize();
    ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

    if (cameraVideo.readyState >= 2 && cameraVideo.videoWidth > 0) {
      const bubbleW = canvas.width * 0.18;
      const aspect = cameraVideo.videoHeight / cameraVideo.videoWidth || 0.75;
      const bubbleH = bubbleW * aspect;
      const pad = canvas.width * 0.025;
      const x = pad;
      const y = canvas.height - bubbleH - pad;
      const radius = bubbleW * 0.14;

      ctx.save();
      roundRectPath(ctx, x, y, bubbleW, bubbleH, radius);
      ctx.clip();
      ctx.translate(x + bubbleW, y);
      ctx.scale(-1, 1);
      ctx.drawImage(cameraVideo, 0, 0, bubbleW, bubbleH);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = Math.max(2, canvas.width * 0.003);
      roundRectPath(ctx, x, y, bubbleW, bubbleH, radius);
      ctx.stroke();
      ctx.restore();
    }

    raf = requestAnimationFrame(drawFrame);
  };
  drawFrame();

  const compositeStream = canvas.captureStream(30);
  const audioTracks = screenHasAudio ? screenStream.getAudioTracks() : cameraStream.getAudioTracks();
  for (const track of audioTracks) {
    compositeStream.addTrack(track);
  }

  const screenTrack = screenStream.getVideoTracks()[0];
  const onScreenEnded = () => options.onScreenShareEnded?.();
  screenTrack?.addEventListener("ended", onScreenEnded);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    screenTrack?.removeEventListener("ended", onScreenEnded);
    screenStream.getTracks().forEach((t) => t.stop());
    cameraStream.getTracks().forEach((t) => t.stop());
    compositeStream.getTracks().forEach((t) => t.stop());
    screenVideo.srcObject = null;
    cameraVideo.srcObject = null;
  };

  return { compositeStream, stop };
}

/** Bubble layout helpers for tests. */
export function bubbleLayout(canvasW: number, canvasH: number, camAspect = 0.75) {
  const bubbleW = canvasW * 0.18;
  const bubbleH = bubbleW * camAspect;
  const pad = canvasW * 0.025;
  return { x: pad, y: canvasH - bubbleH - pad, bubbleW, bubbleH };
}
