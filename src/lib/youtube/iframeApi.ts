type YTNamespace = {
  Player: unknown;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

/** Load the YouTube IFrame API script once (shared by embed player + warm-up). */
export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const finish = () => {
      if (window.YT?.Player) resolve();
    };

    if (window.YT?.Player) {
      resolve();
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    } else {
      let attempts = 0;
      const poll = () => {
        if (window.YT?.Player) {
          finish();
          return;
        }
        attempts += 1;
        if (attempts > 600) {
          resolve();
          return;
        }
        window.requestAnimationFrame(poll);
      };
      poll();
    }
  });

  return apiLoadPromise;
}
