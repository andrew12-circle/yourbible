import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type JournalRailPartner = {
  connectionId: string;
  peerUserId: string;
  displayName: string;
};

function partnerLabel(row: {
  peer_display_name: string | null;
  peer_email: string | null;
}): string {
  const name = row.peer_display_name?.trim();
  if (name) return name;
  const email = row.peer_email?.trim();
  if (email) return email.split("@")[0] ?? email;
  return "Partner";
}

/** Active partner connections for the journal rail SHARED section. */
export function useJournalRailPartners() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<JournalRailPartner[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setPartners([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("partner_peer_displays");
      if (error) throw error;
      setPartners(
        ((data ?? []) as {
          connection_id: string;
          peer_user_id: string;
          peer_display_name: string | null;
          peer_email: string | null;
        }[]).map((row) => ({
          connectionId: row.connection_id,
          peerUserId: row.peer_user_id,
          displayName: partnerLabel(row),
        })),
      );
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { partners, loading, reload };
}
