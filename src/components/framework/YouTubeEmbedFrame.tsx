import { useEffect, useRef, useState, type IframeHTMLAttributes } from "react";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";
import { isMessageFromYouTubeFrame, sendYouTubeFrameMessage } from "@/lib/youtube/embedMessaging";
import { parseYouTubeEmbedMessage } from "@/lib/youtube/embedTelemetry";
import { YOUTUBE_PLAYER_BRIDGE_PATH } from "@/lib/youtube/hostOrigin";

type Props = IframeHTMLAttributes<HTMLIFrameElement> & { src: string };
/** Retry identification failure once through our HTTPS player document, not another video. */
export default function YouTubeEmbedFrame({ src, onLoad, ...props }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [recovery, setRecovery] = useState<{ source: string; url: string } | null>(null);
  const activeSrc = recovery?.source === src ? recovery.url : src;
  useEffect(() => {
    let retried = activeSrc !== src;
    let currentTime = 0;
    const listen = () => {
      sendYouTubeFrameMessage(frame.current, { event: "listening", id: 1, channel: "widget" });
      sendYouTubeFrameMessage(frame.current, { event: "command", func: "addEventListener", args: ["onError"] });
    };
    const receive = (event: MessageEvent) => {
      if (!isMessageFromYouTubeFrame(event, frame.current)) return;
      const message = parseYouTubeEmbedMessage(event.data);
      if (message?.event === "infoDelivery" && typeof message.info === "object" && Number.isFinite(message.info?.currentTime)) {
        currentTime = message.info.currentTime!;
      }
      if (message?.event !== "onError" || message.info !== 153 || retried) return;
      const old = new URL(activeSrc);
      if (old.pathname === YOUTUBE_PLAYER_BRIDGE_PATH) return;
      const videoId = old.pathname.split("/").pop() ?? "";
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return;
      retried = true;
      setRecovery({ source: src, url: buildYouTubeEmbedSrc(videoId, currentTime || Number(old.searchParams.get("start")) || 0, {
        hosted: true, autoplay: old.searchParams.get("autoplay") === "1", mute: old.searchParams.get("mute") === "1",
      }) });
    };
    window.addEventListener("message", receive);
    const timer = setInterval(listen, 1500);
    listen();
    return () => { clearInterval(timer); window.removeEventListener("message", receive); };
  }, [src, activeSrc]);
  return <iframe {...props} ref={frame} src={activeSrc} referrerPolicy="strict-origin-when-cross-origin" onLoad={onLoad} />;
}
