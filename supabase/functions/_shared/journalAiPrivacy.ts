type Metadata = { user_id?: string; journal_id?: string | null; entry_kind?: string | null;
  e2e_encrypted?: boolean | null; e2e_required?: boolean | null; journal_e2e_enabled?: boolean | null };
type Query = { eq: (column: string, value: unknown) => Query;
  maybeSingle: () => PromiseLike<{ data: Metadata | null; error: unknown }> };
type Client = { from: (table: string) => { select: (columns: string) => Query } };

/** Read only access metadata before fetching prose/media or invoking a provider.
 * Unlocking on a device never grants server-side processing of private journals. */
export async function journalAiPrivacyResponse(client: Client, userId: string, entryId?: string | null): Promise<Response | null> {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  const blocked = () => new Response(JSON.stringify({ error: "Cloud AI is disabled for encrypted journals and private vents." }), { status: 403, headers });
  try {
    const profile = await client.from("profiles").select("journal_e2e_enabled").eq("user_id", userId).maybeSingle();
    if (profile.error) throw profile.error;
    if (profile.data?.journal_e2e_enabled) return blocked();
    if (entryId) {
      const entry = await client.from("journal_entries").select("user_id,journal_id,entry_kind,e2e_encrypted")
        .eq("id", entryId).eq("user_id", userId).maybeSingle();
      if (entry.error) throw entry.error;
      if (!entry.data || entry.data.user_id !== userId || entry.data.e2e_encrypted || entry.data.entry_kind === "vent") return blocked();
      if (entry.data.journal_id) {
        const journal = await client.from("journals").select("e2e_required").eq("id", entry.data.journal_id).eq("user_id", userId).maybeSingle();
        if (journal.error) throw journal.error;
        if (!journal.data || journal.data.e2e_required) return blocked();
      }
    }
    return null;
  } catch {
    return new Response(JSON.stringify({ error: "Journal privacy could not be verified. No AI request was made." }), { status: 503, headers });
  }
}
