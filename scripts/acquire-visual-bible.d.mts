export function assertImageUrl(value: string): string;
export function validateSeed(assets: unknown): void;
export function downloadImage(input: string, fetcher?: typeof fetch): Promise<{ bytes: Buffer; resolvedUrl: string }>;
export function ensureVisualBibleAssets(options?: { root?: string; verify?: boolean }): Promise<void>;
