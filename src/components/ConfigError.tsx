const missing = [
  !import.meta.env.VITE_SUPABASE_URL?.trim() && "VITE_SUPABASE_URL",
  !(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  ) && "VITE_SUPABASE_PUBLISHABLE_KEY",
].filter(Boolean) as string[];

/** Shown when the app bundle was built without Supabase env vars (blank-screen guard). */
export default function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 paper-texture">
      <div className="max-w-md rounded-xl border border-leather/20 bg-card/90 p-8 shadow-lg text-center space-y-4">
        <h1 className="font-display text-2xl text-leather">Configuration needed</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This deployment is missing Supabase environment variables, so the app cannot start.
        </p>
        {missing.length > 0 && (
          <ul className="text-left text-sm font-mono bg-muted/50 rounded-lg p-4 space-y-1">
            {missing.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">
          In Vercel: <strong>Settings → Environment Variables</strong> — add the variables above for{" "}
          <strong>Production</strong>, then <strong>Redeploy</strong>.
        </p>
      </div>
    </div>
  );
}
