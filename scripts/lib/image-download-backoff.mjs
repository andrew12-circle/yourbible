/** Respect the source's retry window; never change hosts to evade rate limits. */
export function imageResponseError(response, url, now = Date.now()) {
  const error = new Error(`Image request failed (${response.status}): ${url}`);
  error.status = response.status;
  const value = response.headers.get('retry-after');
  if (value) {
    const seconds = Number(value);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
    if (Number.isFinite(delay)) error.retryAfterMs = Math.max(0, delay);
  }
  return error;
}
export function imageRetryDelay(error, attempt) {
  if (error.status && error.status !== 429 && error.status < 500) throw error;
  const requested = error.retryAfterMs ?? 0;
  if (requested > 600_000) throw new Error('Source requests a longer pause; rerun acquisition after its Retry-After window.', { cause: error });
  return Math.max(requested, error.status === 429 ? 60_000 * (attempt + 1) : Math.min(30_000, 2000 * 2 ** attempt));
}
