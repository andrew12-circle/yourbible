import { createContext, useContext } from "react";

export interface MiniPhoneSize {
  width: number;
  height: number;
  compact: boolean;
}

export const MiniPhoneSizeContext = createContext<MiniPhoneSize>({
  width: 288,
  height: 624,
  compact: false,
});

export function useMiniPhoneSize(): MiniPhoneSize {
  return useContext(MiniPhoneSizeContext);
}

export const MINI_PHONE_COMPACT_BREAKPOINT = 280;
