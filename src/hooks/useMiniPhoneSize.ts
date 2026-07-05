import { createContext, useContext } from "react";
import {
  MINI_PHONE_DEFAULT_HEIGHT,
  MINI_PHONE_DEFAULT_WIDTH,
} from "@/lib/mini-phone/miniPhoneDimensions";

export interface MiniPhoneSize {
  width: number;
  height: number;
  compact: boolean;
}

export const MiniPhoneSizeContext = createContext<MiniPhoneSize>({
  width: MINI_PHONE_DEFAULT_WIDTH,
  height: MINI_PHONE_DEFAULT_HEIGHT,
  compact: false,
});

export function useMiniPhoneSize(): MiniPhoneSize {
  return useContext(MiniPhoneSizeContext);
}

export const MINI_PHONE_COMPACT_BREAKPOINT = 280;
