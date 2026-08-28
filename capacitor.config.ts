import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.holypark.architecture",
  appName: "Holy Park Architecture",
  webDir: "dist",
  backgroundColor: "#FFFFFF",
  ios: {
    // The status bar reserves its own space; disabling UIKit's automatic
    // content inset prevents that space from being added a second time.
    contentInset: "never",
    preferredContentMode: "mobile",
    backgroundColor: "#FFFFFF",
  },
  plugins: {
    SplashScreen: {
      // Keep the branded native surface visible until React paints its first frame.
      launchShowDuration: 500,
      launchAutoHide: false,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
    },
    StatusBar: {
      // Keep system chrome separate from the WebView so it is always a clean
      // white/light or black/dark surface instead of inheriting page artwork.
      overlaysWebView: false,
      style: "DEFAULT",
      backgroundColor: "#FFFFFF",
    },
    Keyboard: {
      resize: "native" as never,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
