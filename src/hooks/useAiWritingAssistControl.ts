import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { shouldWarnBeforeEnablingAiWritingAssist } from "@/lib/ai/aiWritingAssistPolicy";
import { useAiWritingAssistStore } from "@/lib/aiWritingAssistStore";

/** Toggle AI writing assist; prompts non-founder users before enabling. */
export function useAiWritingAssistControl() {
  const { user, profile } = useAuth();
  const enabled = useAiWritingAssistStore((s) => s.aiWritingAssistEnabled);
  const setEnabled = useAiWritingAssistStore((s) => s.setAiWritingAssistEnabled);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setAssistEnabled = useCallback(
    (next: boolean) => {
      if (next && !enabled && shouldWarnBeforeEnablingAiWritingAssist({
        email: user?.email,
        displayName: profile?.display_name,
      })) {
        setConfirmOpen(true);
        return;
      }
      setEnabled(next);
    },
    [enabled, profile?.display_name, setEnabled, user?.email],
  );

  const confirmEnable = useCallback(() => {
    setEnabled(true);
    setConfirmOpen(false);
  }, [setEnabled]);

  const cancelEnable = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return {
    enabled,
    setAssistEnabled,
    confirmOpen,
    confirmEnable,
    cancelEnable,
  };
}
