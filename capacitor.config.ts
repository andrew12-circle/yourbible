import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.holypark.architecture",
  appName: "Holy Park Architecture",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#0f172a",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
  },
};

export default config;
