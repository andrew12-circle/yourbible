/** Lightweight route chunk loader — keep imports minimal for fast first paint. */
export default function AppRouteFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-primary"
        aria-hidden
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
