/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** `sb_publishable_…` or legacy anon JWT (`eyJ…`) */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Optional alias for legacy anon JWT */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Optional Sentry DSN for crash reporting */
  readonly VITE_SENTRY_DSN?: string;
  /** Optional OpenAI-compatible chat completions URL for client-side polish (never commit the key). */
  readonly VITE_AI_POLISH_URL?: string;
  readonly VITE_AI_POLISH_KEY?: string;
  readonly VITE_AI_POLISH_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
