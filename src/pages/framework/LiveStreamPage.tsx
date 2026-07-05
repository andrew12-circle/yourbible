import { useRef } from "react";
import FrameworkLayout from "./FrameworkLayout";
import LiveStreamCaptureWorkspace from "@/components/framework/live/LiveStreamCaptureWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveStreamCapture } from "@/hooks/useLiveStreamCapture";
import { useLiveStreamGlobalHandoff } from "@/hooks/useLiveStreamGlobalHandoff";

export default function LiveStreamPage() {
  const { user } = useAuth();
  const capture = useLiveStreamCapture(user?.id);
  const videoSlotRef = useRef<HTMLDivElement | null>(null);

  useLiveStreamGlobalHandoff({
    artifactId: capture.savedArtifactId,
    youTubeVideoId: capture.youTubeVideoId,
    title: capture.title.trim() || null,
    videoSlotRef,
    enabled: Boolean(capture.savedArtifactId && capture.youTubeVideoId),
  });

  return (
    <FrameworkLayout title="Live stream" back="/framework/artifacts">
      <LiveStreamCaptureWorkspace
        capture={capture}
        signedIn={Boolean(user)}
        videoSlotRef={videoSlotRef}
      />
    </FrameworkLayout>
  );
}
