import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.95.0";

export const jsonCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function requireUser(
  req: Request,
): Promise<{ user: User } | { error: Response }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return {
      error: new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 502,
        headers: { ...jsonCorsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return {
      error: new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
        headers: { ...jsonCorsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      error: new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
        headers: { ...jsonCorsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { user };
}
