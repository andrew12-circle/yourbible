import type { PostgrestError } from "@supabase/supabase-js";

const TABLE_MIGRATIONS: Record<string, string> = {
  todo_lists: "20260518210000_todo_lists.sql",
  todo_items: "20260518210000_todo_lists.sql",
  habits: "20260518190000_habits_tracker.sql",
  habit_completions: "20260518190000_habits_tracker.sql",
  habit_goals: "20260518190000_habits_tracker.sql",
  habit_notes: "20260518190000_habits_tracker.sql",
  habit_bills: "20260518190000_habits_tracker.sql",
};

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as PostgrestError).code === "string"
  );
}

function migrationFileForMessage(message: string): string | null {
  if (/ensure_default_todo_lists/i.test(message)) {
    return TABLE_MIGRATIONS.todo_lists;
  }
  for (const [table, file] of Object.entries(TABLE_MIGRATIONS)) {
    if (message.includes(table)) return file;
  }
  return null;
}

function isMissingSchemaError(code: string, message: string): boolean {
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST205" ||
    code === "PGRST202" ||
    /relation .+ does not exist/i.test(message) ||
    /function .+ does not exist/i.test(message) ||
    /Could not find the table/i.test(message) ||
    /Could not find the function/i.test(message)
  );
}

/** User-facing message for Supabase/Postgres errors (e.g. missing tables after migration). */
export function formatSupabaseError(error: unknown): string {
  if (isPostgrestError(error)) {
    const { code, message } = error;
    if (isMissingSchemaError(code, message)) {
      const migration = migrationFileForMessage(message) ?? "the latest migrations";
      return (
        `Database tables are not set up yet. Apply supabase/migrations/${migration} ` +
        `(run \`supabase db push\` against project itmcsyrnpcnrwviigppe), then reload.`
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
