import { createContext, useContext } from "react";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import type { MorningFoundation, MorningFoundationSession, MorningMemory } from "@/lib/livingHope/morningFoundation";

export interface MorningFoundationContextValue {
  workbook: LivingHopeWorkbookContent;
  day: MorningFoundationSession;
  onDayChange: (patch: Partial<MorningFoundationSession>) => void;
  onSaveSettings: (settings: MorningFoundation) => Promise<void>;
  onSaveMemories: (memories: MorningMemory[]) => Promise<void>;
  onSelectScene: (id: string) => void;
  selectedSceneId: string;
  onEditingChange?: (editing: boolean) => void;
}
export const MorningFoundationContext = createContext<MorningFoundationContextValue | null>(null);
export const useMorningFoundation = () => useContext(MorningFoundationContext);
