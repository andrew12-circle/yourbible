/** Shared provider policy: billing is not a transient rate limit. */
export function transcriptBillingBlocked(message: string): boolean {
  return /prepayment.*depleted|prepaid.*(?:depleted|exhausted)|insufficient[_ ](?:quota|credits)|billing[_ ](?:disabled|not[_ ]enabled)|credit[s ]+(?:are )?(?:depleted|exhausted)|billing balance|payment required/i.test(message);
}
export function shouldRetryTranscriptProvider(status: number, body: string): boolean {
  return status !== 402 && !transcriptBillingBlocked(body) && (status === 429 || status >= 500);
}
export function isDirectTranscriptMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password
      && !["youtube.com", "youtu.be", "youtube-nocookie.com", "localhost"].some((domain) => host === domain || host.endsWith("." + domain))
      && !/^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[)/.test(host);
  } catch { return false; }
}
/** Always clears the timer. Callers must keep writes outside the timed operation. */
export async function transcriptWithDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out. No transcript was saved by this attempt.`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}
export function transcriptJobBudget(value?: string): number {
  const number = Number(value ?? 125_000);
  // Leave time for the error write before even the free edge runtime's wall-clock limit.
  return Number.isFinite(number) ? Math.min(125_000, Math.max(30_000, number)) : 125_000;
}
