/* HTTPS player document: YouTube receives this site's genuine HTTP Referer.
 * Never proxies video, hides YouTube controls, or accepts arbitrary embed URLs. */
(() => {
  const params = new URLSearchParams(location.search);
  const videoId = params.get("v") || "";
  const parentOrigin = params.get("parent_origin") || location.origin;
  const allowedParent = parentOrigin === location.origin || ["capacitor://localhost", "http://localhost", "https://localhost", "null"].includes(parentOrigin);
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId) || !allowedParent) {
    document.getElementById("error").hidden = false;
    return;
  }
  let player;
  let ready = false;
  let timer;
  const queued = [];
  const send = (event, info) => {
    // Opaque native origins require '*'; destination is exclusively our actual parent.
    parent.postMessage(JSON.stringify({ event, info }), parentOrigin === "null" ? "*" : parentOrigin);
  };
  const report = () => {
    if (ready) send("infoDelivery", { currentTime: player.getCurrentTime(), playerState: player.getPlayerState() });
  };
  const dispatch = (message) => {
    if (message.event === "listening") { if (ready) { send("onReady"); report(); } return; }
    if (message.event !== "command") return;
    const args = Array.isArray(message.args) ? message.args : [];
    if (message.func === "getCurrentTime") { report(); return; }
    if (message.func === "addEventListener") return; // Our API callbacks already forward state/error events.
    if (!["playVideo", "pauseVideo", "seekTo", "mute", "unMute"].includes(message.func)) return;
    if (message.func === "seekTo" && (!Number.isFinite(args[0]) || args[0] < 0)) return;
    if (!ready) { if (queued.length < 20) queued.push(message); return; }
    if (message.func === "seekTo") player.seekTo(args[0], args[1] !== false);
    else player[message.func]();
  };
  window.addEventListener("message", (event) => {
    if (event.source !== parent || event.origin !== parentOrigin) return;
    let message;
    try { message = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
    if (message && typeof message === "object") dispatch(message);
  });
  window.onYouTubeIframeAPIReady = () => {
    const start = Number(params.get("start"));
    player = new YT.Player("player", {
      videoId, width: "100%", height: "100%",
      playerVars: { origin: location.origin, widget_referrer: location.origin + "/", controls: 1, playsinline: 1, fs: 1,
        rel: 0, start: Number.isFinite(start) ? Math.max(0, Math.floor(start)) : 0,
        autoplay: params.get("autoplay") === "1" ? 1 : 0, mute: params.get("mute") === "1" ? 1 : 0 },
      events: {
        onReady: () => {
          ready = true;
          player.getIframe().referrerPolicy = "strict-origin-when-cross-origin";
          send("onReady");
          queued.splice(0).forEach(dispatch);
          report(); timer = setInterval(report, 250);
        },
        onStateChange: (event) => { send("onStateChange", event.data); report(); },
        onError: (event) => send("onError", event.data),
      },
    });
  };
  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  script.referrerPolicy = "strict-origin-when-cross-origin";
  script.onerror = () => { document.getElementById("error").hidden = false; };
  document.head.appendChild(script);
  addEventListener("pagehide", () => { clearInterval(timer); if (player?.destroy) player.destroy(); }, { once: true });
})();
