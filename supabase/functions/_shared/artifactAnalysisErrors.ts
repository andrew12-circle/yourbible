export class AnalysisProviderError extends Error {
  constructor(message: string, public retryable: boolean) { super(message); }
}

export function classifyAnalysisFailure(status: number, detail: string, provider: string) {
  if (/insufficient_quota|credits?.*(depleted|exhausted)|billing|prepay/i.test(detail) || status === 402) {
    return new AnalysisProviderError(`${provider} analysis quota or billing is unavailable. Check that provider's API account; saved research is unchanged.`, false);
  }
  if (status === 401 || status === 403) return new AnalysisProviderError(`${provider} analysis credentials were rejected. Check the server API configuration.`, false);
  if (status === 429) return new AnalysisProviderError(`${provider} temporarily rate-limited analysis. This section can be resumed.`, true);
  return new AnalysisProviderError(`${provider} analysis failed (HTTP ${status}). Saved research is unchanged.`, status >= 500);
}

