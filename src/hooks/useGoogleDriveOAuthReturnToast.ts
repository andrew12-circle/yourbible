import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

/** Handles OAuth return query params after Google Drive connect. */
export function useGoogleDriveOAuthReturnToast() {
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const flag = params.get("gdrive");
    if (!flag) return;
    if (flag === "connected") {
      const email = params.get("email");
      toast({
        title: "Google Drive connected",
        description: email ? `Backup will sync to ${email}'s Drive.` : undefined,
      });
    } else if (flag === "error") {
      toast({
        title: "Could not connect Google Drive",
        description: params.get("reason") ?? "unknown",
        variant: "destructive",
      });
    }
    params.delete("gdrive");
    params.delete("email");
    params.delete("reason");
    setParams(params, { replace: true });
  }, [params, setParams]);
}
