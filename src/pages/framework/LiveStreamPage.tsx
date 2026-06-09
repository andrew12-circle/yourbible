import FrameworkLayout from "./FrameworkLayout";
import LiveStreamCaptureWorkspace from "@/components/framework/live/LiveStreamCaptureWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveStreamCapture } from "@/hooks/useLiveStreamCapture";

export default function LiveStreamPage() {
  const { user } = useAuth();
  const capture = useLiveStreamCapture(user?.id);

  return (
    <FrameworkLayout title="Live stream" back="/framework/artifacts">
      <LiveStreamCaptureWorkspace capture={capture} signedIn={Boolean(user)} />
    </FrameworkLayout>
  );
}
