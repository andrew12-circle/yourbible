export function imageResponseError(response: Response, url: string, now?: number): Error & { status: number; retryAfterMs?: number };
export function imageRetryDelay(error: { status?: number; retryAfterMs?: number }, attempt: number): number;
