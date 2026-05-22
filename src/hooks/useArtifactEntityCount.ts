import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useArtifactEntityCount(artifactId: string | undefined, artifactStatus: string | undefined) {
  const { user } = useAuth();
  const [count, setCount] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    if (!user || !artifactId) return;
    const { count: n, error } = await supabase
      .from("entity_mentions")
      .select("id", { count: "exact", head: true })
      .eq("artifact_id", artifactId);
    if (error) {
      setCount(undefined);
      return;
    }
    setCount(n ?? 0);
  }, [artifactId, user]);

  useEffect(() => {
    void load();
  }, [load, artifactStatus]);

  return count;
}
