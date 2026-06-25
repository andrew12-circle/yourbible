import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

/** Extract a human-readable message from a Supabase edge function invoke failure. */
export async function edgeFunctionErrorMessage(
  functionName: string,
  error: unknown,
  data?: unknown,
): Promise<string> {
  if (data && typeof data === "object" && data !== null && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return formatKnownEdgeError(err);
  }

  if (error instanceof FunctionsHttpError) {
    const ctx = error.context;
    if (ctx instanceof Response) {
      try {
        const clone = ctx.clone();
        const ct = clone.headers.get("Content-Type") ?? "";
        if (ct.includes("application/json")) {
          const body = (await clone.json()) as { error?: string; message?: string };
          if (typeof body?.error === "string" && body.error.trim()) {
            return formatKnownEdgeError(body.error);
          }
          if (typeof body?.message === "string" && body.message.trim()) {
            return body.message;
          }
        } else {
          const text = (await clone.text()).trim();
          if (text) return text.slice(0, 500);
        }
      } catch {
        /* use status fallback */
      }
      if (ctx.status === 401) {
        return "Session expired or not signed in. Sign in again and retry.";
      }
      if (ctx.status === 404) {
        return `${functionName} is not deployed. Run: supabase functions deploy ${functionName}`;
      }
      return `${functionName} failed (HTTP ${ctx.status}). Check Supabase function logs.`;
    }
  }

  if (error instanceof FunctionsRelayError) {
    return `${functionName} relay error. Deploy the function and try again.`;
  }

  if (error instanceof FunctionsFetchError) {
    return formatEdgeUnreachable(functionName);
  }

  if (error instanceof Error) {
    if (/failed to send a request to the edge function/i.test(error.message)) {
      return formatEdgeUnreachable(functionName);
    }
    return error.message;
  }
  return String(error);
}

function formatEdgeUnreachable(functionName: string): string {
  return `${functionName} is not deployed or unreachable. Deploy: npx supabase functions deploy ${functionName} --project-ref itmcsyrnpcnrwviigppe`;
}

/** True when the edge function responded (even with 4xx) — false when fetch/relay failed. */
export function isEdgeFunctionReachable(error: unknown): boolean {
  if (error instanceof FunctionsHttpError) return true;
  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) return false;
  if (error instanceof Error && /failed to send a request to the edge function/i.test(error.message)) {
    return false;
  }
  return true;
}

function formatKnownEdgeError(message: string): string {
  if (/OPENAI_API_KEY is not configured/i.test(message)) {
    return `${message} Set it in Supabase Edge Function secrets: supabase secrets set OPENAI_API_KEY=sk-... --project-ref <ref>, then redeploy my-ai-chat. Or set AI_PROVIDER=gemini and GEMINI_API_KEY if you use Gemini only.`;
  }
  if (/OpenAI request failed \(401\)/i.test(message)) {
    return `${message} Your Supabase secret OPENAI_API_KEY is missing, revoked, or wrong. Fix: supabase secrets set OPENAI_API_KEY=sk-... --project-ref <ref> then supabase functions deploy my-ai-chat. Or use Gemini: supabase secrets unset OPENAI_API_KEY --project-ref <ref> and set GEMINI_API_KEY (and optionally AI_PROVIDER=gemini).`;
  }
  if (/GEMINI_API_KEY is not configured/i.test(message)) {
    return `${message} Set it in Supabase Edge Function secrets: supabase secrets set GEMINI_API_KEY=... AI_PROVIDER=gemini --project-ref <ref>, then redeploy my-ai-chat.`;
  }
  if (/ELEVENLABS_API_KEY missing/i.test(message)) {
    return `${message} Set it with: npx supabase secrets set ELEVENLABS_API_KEY=your_key --project-ref itmcsyrnpcnrwviigppe then redeploy journal-voice-to-text.`;
  }
  if (/ElevenLabs API key missing or invalid on server/i.test(message)) {
    return `${message}. Fix: npx supabase secrets set ELEVENLABS_API_KEY=your_key --project-ref itmcsyrnpcnrwviigppe then redeploy journal-voice-to-text. Live dictation (mic without record-and-transcribe) may still work.`;
  }
  if (/^Unauthorized$/i.test(message)) {
    return "Session expired or not signed in. Sign in again and retry voice dictation.";
  }
  if (/Invalid journal_entry_id for journal chat/i.test(message)) {
    return `${message} Save the entry and open chat mode again.`;
  }
  if (/stale request/i.test(message)) {
    return "Transcript fetch was interrupted by another retry. Tap Try fetch again once and wait ~10s.";
  }
  return message;
}
