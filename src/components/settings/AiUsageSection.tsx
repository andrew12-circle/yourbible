import { useMemo, useState } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAiUsageSummary } from "@/hooks/useAiUsageSummary";
import {
  formatFunctionName,
  formatOperation,
  formatProvider,
  formatTokenCount,
  formatUsd,
} from "@/lib/ai/usageFormat";

const DAY_OPTIONS = [7, 30, 90] as const;

type AiUsageSectionProps = {
  userId: string | undefined;
};

export function AiUsageSection({ userId }: AiUsageSectionProps) {
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(30);
  const { summary, loading, error, reload } = useAiUsageSummary(days, Boolean(userId));

  const maxDailyUsd = useMemo(() => {
    if (!summary?.daily.length) return 0;
    return Math.max(...summary.daily.map((d) => Number(d.estimated_usd) || 0), 0.0001);
  }, [summary?.daily]);

  if (!userId) return null;

  return (
    <section>
      <h2 className="font-display text-lg text-leather mb-3">AI usage &amp; cost</h2>
      <Card className="border-paper-edge bg-paper/70">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-leather flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Estimated API spend
              </CardTitle>
              <CardDescription>
                Tracked from your app&apos;s AI calls (OpenAI, Gemini, transcription). Estimates use
                published list prices — actual invoices may differ.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map((d) => (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={days === d ? "default" : "outline"}
                onClick={() => setDays(d)}
              >
                Last {d} days
              </Button>
            ))}
          </div>

          {error ? (
            <p className="text-sm text-destructive">
              Could not load usage. Apply the <code className="text-xs">ai_usage_events</code> migration
              and redeploy edge functions. ({error})
            </p>
          ) : null}

          {loading && !summary ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading usage…
            </div>
          ) : null}

          {summary ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border border-paper-edge bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Estimated cost</div>
                  <div className="font-display text-xl text-leather">{formatUsd(summary.totalUsd)}</div>
                </div>
                <div className="rounded-md border border-paper-edge bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">API calls</div>
                  <div className="font-display text-xl text-leather">{summary.totalCalls}</div>
                </div>
                <div className="rounded-md border border-paper-edge bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Tokens (LLM)</div>
                  <div className="font-display text-xl text-leather">{formatTokenCount(summary.totalTokens)}</div>
                </div>
              </div>

              {summary.daily.length > 0 ? (
                <div>
                  <div className="text-sm font-display text-leather mb-2">Daily spend</div>
                  <div className="flex items-end gap-1 h-24">
                    {summary.daily.map((row) => {
                      const usd = Number(row.estimated_usd) || 0;
                      const pct = Math.max(4, (usd / maxDailyUsd) * 100);
                      return (
                        <div
                          key={row.day}
                          className="flex-1 min-w-0 flex flex-col items-center gap-1"
                          title={`${row.day}: ${formatUsd(usd)}`}
                        >
                          <div
                            className="w-full rounded-t bg-leather/70"
                            style={{ height: `${pct}%` }}
                          />
                          <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                            {row.day.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No usage recorded yet. Costs appear after you analyze artifacts, chat with My AI, or
                  fetch transcripts.
                </p>
              )}

              {summary.totals.length > 0 ? (
                <div>
                  <div className="text-sm font-display text-leather mb-2">By provider</div>
                  <ul className="space-y-2">
                    {summary.totals.map((row) => (
                      <li
                        key={`${row.provider}-${row.operation}`}
                        className="flex items-center justify-between text-sm border-b border-paper-edge/60 pb-2"
                      >
                        <span>
                          {formatProvider(row.provider)} · {formatOperation(row.operation)}
                          <span className="text-muted-foreground ml-1">({row.call_count} calls)</span>
                        </span>
                        <span className="font-medium tabular-nums">{formatUsd(row.estimated_usd)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary.byFunction.length > 0 ? (
                <div>
                  <div className="text-sm font-display text-leather mb-2">By feature</div>
                  <ul className="space-y-2">
                    {summary.byFunction.slice(0, 12).map((row) => (
                      <li
                        key={row.function_name}
                        className="flex items-center justify-between text-sm border-b border-paper-edge/60 pb-2"
                      >
                        <span>
                          {formatFunctionName(row.function_name)}
                          <span className="text-muted-foreground ml-1">({row.call_count})</span>
                        </span>
                        <span className="font-medium tabular-nums">{formatUsd(row.estimated_usd)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Cursor IDE usage is billed separately in your Cursor account — not included here.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
