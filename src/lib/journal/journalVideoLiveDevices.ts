import type { MutableRefObject } from "react";
import {
  buildJournalVideoConstraints,
  createJournalAudioSidecarRecorder,
  replaceMediaStreamTracks,
  tuneJournalVideoStream,
} from "@/lib/journal/videos";
import type { JournalVideoCaptureSettings } from "@/lib/journal/journalVideoCaptureSettings";
import type { CameraFacing } from "@/lib/journal/journalVideoDevices";
import {
  appendInProgressJournalVideoRecordingChunk,
  updateInProgressJournalVideoRecording,
} from "@/lib/journal/journalVideoRecordingRecovery";

export type JournalVideoLivePhase = "preview" | "countdown" | "recording" | "paused";

export function canChangeJournalVideoDevices(phase: JournalVideoLivePhase | string): boolean {
  return phase === "preview" || phase === "countdown" || phase === "recording" || phase === "paused";
}

export function isJournalVideoLiveCapture(phase: JournalVideoLivePhase | string): boolean {
  return phase === "recording" || phase === "paused";
}

type AudioSidecarRefs = {
  streamRef: MutableRefObject<MediaStream | null>;
  phaseRef: MutableRefObject<JournalVideoLivePhase | string>;
  audioRecorderRef: MutableRefObject<MediaRecorder | null>;
  audioChunksRef: MutableRefObject<Blob[]>;
  audioChunkIndexRef: MutableRefObject<number>;
  recoveryDraftIdRef: MutableRefObject<string | null>;
  resolveAudioStopRef: MutableRefObject<((blob: Blob | null) => void) | null>;
};

/** Restart the transcription sidecar after a live mic swap. */
export function restartJournalVideoAudioSidecar(refs: AudioSidecarRefs): void {
  const stream = refs.streamRef.current;
  const currentPhase = refs.phaseRef.current;
  if (!stream || !isJournalVideoLiveCapture(currentPhase)) return;

  const oldRec = refs.audioRecorderRef.current;
  if (oldRec && oldRec.state !== "inactive") {
    try {
      if (typeof oldRec.requestData === "function") oldRec.requestData();
      oldRec.stop();
    } catch {
      /* ignore */
    }
  }

  const sidecar = createJournalAudioSidecarRecorder(stream);
  if (!sidecar) {
    refs.audioRecorderRef.current = null;
    return;
  }

  const { recorder: audioRec, mimeType: audioMime } = sidecar;
  audioRec.ondataavailable = (e) => {
    if (e.data.size > 0) {
      refs.audioChunksRef.current.push(e.data);
      const index = refs.audioChunkIndexRef.current;
      refs.audioChunkIndexRef.current += 1;
      void appendInProgressJournalVideoRecordingChunk(
        refs.recoveryDraftIdRef.current,
        "audio",
        index,
        e.data,
      );
    }
  };
  audioRec.onstop = () => {
    const audioBlob = new Blob(refs.audioChunksRef.current, {
      type: audioRec.mimeType || audioMime,
    });
    refs.resolveAudioStopRef.current?.(audioBlob.size > 0 ? audioBlob : null);
    refs.resolveAudioStopRef.current = null;
  };
  try {
    audioRec.start(250);
    if (currentPhase === "paused") audioRec.pause();
    refs.audioRecorderRef.current = audioRec;
    updateInProgressJournalVideoRecording(refs.recoveryDraftIdRef.current, {
      audioMimeType: audioRec.mimeType || audioMime,
    });
  } catch {
    refs.audioRecorderRef.current = null;
  }
}

type SwapRefs = {
  streamRef: MutableRefObject<MediaStream | null>;
  settingsRef: MutableRefObject<JournalVideoCaptureSettings>;
  facingRef: MutableRefObject<CameraFacing>;
  deviceIdRef: MutableRefObject<string | null>;
  audioDeviceIdRef: MutableRefObject<string | null>;
};

export async function swapJournalVideoCameraTrack(
  refs: SwapRefs,
  onUpdated: (stream: MediaStream) => void,
): Promise<void> {
  const s = refs.settingsRef.current;
  const donor = await navigator.mediaDevices.getUserMedia({
    video: buildJournalVideoConstraints({
      quality: s.quality,
      facingMode: refs.facingRef.current,
      deviceId: refs.deviceIdRef.current,
      audioDeviceId: refs.audioDeviceIdRef.current,
    }).video,
    audio: false,
  });
  await tuneJournalVideoStream(donor, s.quality);
  const target = refs.streamRef.current;
  if (!target) {
    donor.getTracks().forEach((t) => t.stop());
    return;
  }
  replaceMediaStreamTracks(target, donor, ["video"]);
  onUpdated(target);
}

export async function swapJournalVideoAudioTrack(
  refs: SwapRefs,
  onUpdated: (stream: MediaStream) => void,
): Promise<void> {
  const audioId = refs.audioDeviceIdRef.current;
  const donor = await navigator.mediaDevices.getUserMedia({
    audio: audioId ? { deviceId: { exact: audioId } } : true,
    video: false,
  });
  const target = refs.streamRef.current;
  if (!target) {
    donor.getTracks().forEach((t) => t.stop());
    return;
  }
  replaceMediaStreamTracks(target, donor, ["audio"]);
  onUpdated(target);
}
