export function JournalMediaRetry({ error, retry }: { error?: string | null; retry: () => void | Promise<unknown> }) {
  if (!error) return null;
  return <div role="status" className="px-3 py-2 text-xs text-muted-foreground">
    Media could not be loaded. Your writing is still available.{" "}
    <button type="button" className="underline" onClick={() => void retry()}>Retry media</button>
  </div>;
}
