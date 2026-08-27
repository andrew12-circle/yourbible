import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.holypark.architecture",
  appName: "Holy Park Architecture",
  webDir: "dist",
  backgroundColor: "#FFFFFF",
  ios: {
    // CSS owns the safe-area contract while the status bar overlays the WebView.
    // Automatic UIKit insets would add a second notch / home-indicator gutter.
    contentInset: "never",
    preferredContentMode: "mobile",
    backgroundColor: "#FFFFFF",
  },
  plugins: {
    SplashScreen: {
      // Keep the branded native surface visible until React paints its first frame.
      launchShowDuration: 500,
      launchAutoHide: false,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
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
