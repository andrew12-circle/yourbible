import type { PostgrestError } from "@supabase/supabase-js";

const TABLE_MIGRATIONS: Record<string, string> = {
  todo_lists: "20260518210000_todo_lists.sql",
  todo_items: "20260518210000_todo_lists.sql",
  ensure_default_todo_lists: "20260625130000_todo_home_default_list.sql",
  habits: "20260518190000_habits_tracker.sql",
  habit_completions: "20260518190000_habits_tracker.sql",
  habit_goals: "20260518190000_habits_tracker.sql",
  habit_notes: "20260518190000_habits_tracker.sql",
  habit_bills: "20260518190000_habits_tracker.sql",
  habit_badges: "20260519120000_habit_badges.sql",
  living_hope_letters: "20260610120000_living_hope.sql",
  living_hope_goals: "20260610120000_living_hope.sql",
  living_hope_reviews: "20260610120000_living_hope.sql",
  living_hope_workbook: "20260610130000_living_hope_workbook.sql",
  living_hope_weekly_reviews: "20260610130000_living_hope_workbook.sql",
};

/** Column-level migrations (app code may reference columns added after the base table migration). */
const COLUMN_MIGRATIONS: Record<string, string> = {
  kind: "20260625120000_todo_list_kind.sql",
  task_type: "20260625130000_todo_item_spreadsheet_fields.sql",
  start_date: "20260625130000_todo_item_spreadsheet_fields.sql",
  end_date: "20260625130000_todo_item_spreadsheet_fields.sql",
  status: "20260625130000_todo_item_spreadsheet_fields.sql",
  pinned_for_date: "20260625130000_todo_item_spreadsheet_fields.sql",
};

function supabaseProjectRef(): string {
  const fromEnv = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const match = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match?.[1]) return match[1];
  return "itmcsyrnpcnrwviigppe";
}

export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as PostgrestError).code === "string"
  );
}

function migrationFileForMessage(message: string): string | null {
  const columnMatch = message.match(/column ['"]?(\w+)['"]?/i);
  if (columnMatch?.[1] && COLUMN_MIGRATIONS[columnMatch[1]]) {
    return COLUMN_MIGRATIONS[columnMatch[1]];
  }
  if (/ensure_default_todo_lists/i.test(message)) {
    return TABLE_MIGRATIONS.ensure_default_todo_lists;
  }
  for (const [table, file] of Object.entries(TABLE_MIGRATIONS)) {
    if (message.includes(table)) return file;
  }
  return null;
}

function isMissingSchemaError(code: string, message: string): boolean {
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "42883" ||
    code === "PGRST205" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    /relation .+ does not exist/i.test(message) ||
    /column .+ does not exist/i.test(message) ||
    /function .+ does not exist/i.test(message) ||
    /Could not find the table/i.test(message) ||
    /Could not find the function/i.test(message) ||
    /Could not find the '.+' column/i.test(message) ||
    /schema cache/i.test(message)
  );
}

/** True when Postgres/PostgREST reports a missing table, function, or schema object. */
export function isSupabaseMissingTable(error: unknown): boolean {
  if (!isPostgrestError(error)) return false;
  return isMissingSchemaError(error.code, error.message);
}

/** User-facing message for Supabase/Postgres errors (e.g. missing tables after migration). */
export function formatSupabaseError(error: unknown): string {
  if (isPostgrestError(error)) {
    const { code, message } = error;
    if (isMissingSchemaError(code, message)) {
      const migration = migrationFileForMessage(message) ?? "the latest migrations";
      const projectRef = supabaseProjectRef();
      return (
        `Database tables are not set up yet. Apply supabase/migrations/${migration} ` +
        `(run \`npx supabase db push --linked\` against project ${projectRef}), then reload.`
      );
    }
    return message;
  }
  if (error instanceof Error) return error.message;
  return "Try again.";
}

export function throwSupabaseError(error: PostgrestError): never {
  throw new Error(formatSupabaseError(error), { cause: error });
}

/** @deprecated Use formatSupabaseError */
export const getErrorMessage = formatSupabaseError;

export function throwOnError(error: PostgrestError | null): void {
  if (error) throwSupabaseError(error);
}
