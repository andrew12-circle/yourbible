import { supabase } from "@/integrations/supabase/client";

const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Bearer + apikey headers for edge functions that require a signed-in user. */
export async function edgeFunctionAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Sign in required");
  }
  return {
    Authorization: `Bearer ${token}`,
    apikey: ANON,
  };
}
