/** Prefer native YouTube app on mobile; otherwise open youtube.com in a new tab. */
export function openYouTubeAppOrWeb() {
  if (typeof window === "undefined") return;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  if (!isIOS && !isAndroid) {
    window.open("https://www.youtube.com", "_blank", "noopener,noreferrer");
    return;
  }

  const scheme = isAndroid ? "vnd.youtube://" : "youtube://";
  window.location.href = scheme;
  window.setTimeout(() => {
    if (document.visibilityState === "visible") {
      window.open("https://www.youtube.com", "_blank", "noopener");
    }
  }, 600);
}
