import type { PostgrestError } from "@supabase/supabase-js";
import { isPostgrestError, isSupabaseMissingTable } from "@/lib/supabase/errors";

export const JOURNAL_E2E_MIGRATION = "20260620120000_journal_e2e_encryption.sql";
export const JOURNAL_PRIVATE_MIGRATION = "20260620130000_journal_private_notebook.sql";

const E2E_SCHEMA_MARKERS =
  /e2e_encrypted|e2e_required|user_journal_crypto|journal_e2e_enabled|source_kind_check/i;

/** True when Postgres/PostgREST reports missing E2E encryption schema. */
export function isJournalE2eSchemaError(error: unknown): boolean {
  if (!isPostgrestError(error)) return false;
  if (isSupabaseMissingTable(error)) return E2E_SCHEMA_MARKERS.test(error.message);
  return false;
}

export function journalE2eSchemaHint(): string {
  return (
    `Journal encryption columns are not on your database yet. Apply migrations ` +
    `${JOURNAL_E2E_MIGRATION} and ${JOURNAL_PRIVATE_MIGRATION} ` +
    `(run \`supabase db push\`), then reload. Your entries are still in the database.`
  );
}

/** User-facing message for journal load/save errors. */
export function formatJournalLoadError(error: unknown): string {
  if (isJournalE2eSchemaError(error)) return journalE2eSchemaHint();
  if (isPostgrestError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "Try again.";
}

export function throwJournalLoadError(error: PostgrestError): never {
  throw new Error(formatJournalLoadError(error), { cause: error });
}
