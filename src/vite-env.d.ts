/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Optional OpenAI-compatible chat completions URL for client-side polish (never commit the key). */
  readonly VITE_AI_POLISH_URL?: string;
  readonly VITE_AI_POLISH_KEY?: string;
  readonly VITE_AI_POLISH_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
