import { Capacitor, registerPlugin } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

type NativeCapabilities = {
  biometricsAvailable: boolean;
  biometryType: "faceID" | "touchID" | "opticID" | "none";
  pencilKitAvailable: boolean;
  pictureInPictureAvailable: boolean;
};

type HolyParkNativePlugin = {
  authenticate(options?: { reason?: string }): Promise<{ authenticated: boolean }>;
  capabilities(): Promise<NativeCapabilities>;
  prepareMediaSession(): Promise<void>;
};

const nativePlugin = registerPlugin<HolyParkNativePlugin>("HolyParkNative");

export const holyParkNative = {
  isNative: () => Capacitor.isNativePlatform(),

  authenticate: async (reason = "Unlock Holy Park Architecture") => {
    if (!Capacitor.isNativePlatform()) return { authenticated: true };
    return nativePlugin.authenticate({ reason });
  },

  capabilities: async (): Promise<NativeCapabilities> => {
    if (!Capacitor.isNativePlatform()) {
      return {
        biometricsAvailable: false,
        biometryType: "none",
        pencilKitAvailable: false,
        pictureInPictureAvailable: "pictureInPictureEnabled" in document,
      };
    }
    return nativePlugin.capabilities();
  },

  prepareMediaSession: async () => {
    if (Capacitor.isNativePlatform()) await nativePlugin.prepareMediaSession();
  },

  impact: async (style: ImpactStyle = ImpactStyle.Light) => {
    if (!Capacitor.isNativePlatform()) return;
    await Haptics.impact({ style });
  },
};
