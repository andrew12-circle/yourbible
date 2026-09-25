import { useState } from "react";
import { Link } from "react-router-dom";
import { Repeat2, Rows3, Table2, TriangleAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PrayerRequestStatusBadge from "@/components/prayer/PrayerRequestStatusBadge";
import { cn } from "@/lib/utils";
import { formatLedgerAmount } from "@/lib/prayer/money";
import {
  PRAYER_PRIORITY_BADGE_CLASSES,
  PRAYER_PRIORITY_LABELS,
  provisionSpecificityMissing,
  remainingProvisionAmount,
} from "@/lib/prayer/provisionLedger";
import { mergeScriptureRefStrings } from "@/lib/prayer/scriptureDisplay";
import type { PrayerRequestRow } from "@/lib/prayer/types";

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function clip(text: string | null | undefined, max = 48): string {
  const t = (text ?? "").trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

type Props = {
  rows: PrayerRequestRow[];
  onMarkAnswered?: (row: PrayerRequestRow) => void;
  timelineScriptureByRequestId?: Map<string, string[]>;
};

export default function PrayerLedgerTable({
  rows,
  onMarkAnswered,
  timelineScriptureByRequestId,
}: Props) {
  const [compact, setCompact] = useState(false);
  const totals = rows.reduce(
    (acc, r) => {
      if (r.amount_requested != null) acc.requested += r.amount_requested;
      if (r.amount_provided != null) acc.provided += r.amount_provided;
      const remaining = remainingProvisionAmount(r);
      if (remaining != null) acc.remaining += remaining;
      return acc;
    },
    { requested: 0, provided: 0, remaining: 0 },
  );

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCompact((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title={compact ? "Show all columns" : "Hide Purpose and Notes"}
        >
          {compact ? <Table2 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
          {compact ? "Show all columns" : "Compact"}
        </button>
      </div>

      <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-border/60">
        <Table className="min-w-[1500px] text-sm">
          <TableHeader>
            <TableRow className="bg-amber-200/90 hover:bg-amber-200/90 border-b border-amber-400/50 dark:bg-amber-950/60">
              <TableHead className="min-w-[190px] bg-amber-200/95 font-semibold dark:bg-amber-950/80">Item</TableHead>
              <TableHead className="min-w-[90px] font-semibold">Priority</TableHead>
              <TableHead className="min-w-[100px] font-semibold">Need now</TableHead>
              <TableHead className="min-w-[100px] font-semibold">Remaining</TableHead>
              <TableHead className="min-w-[90px] font-semibold">Deadline</TableHead>
              {compact ? null : <TableHead className="min-w-[190px] font-semibold">Purpose</TableHead>}
              <TableHead className="min-w-[90px] font-semibold">Requested</TableHead>
              <TableHead className="min-w-[120px] font-semibold">Status</TableHead>
              <TableHead className="min-w-[90px] font-semibold">Answered</TableHead>
              <TableHead className="min-w-[100px] font-semibold">Received</TableHead>
              <TableHead className="min-w-[160px] font-semibold">Story</TableHead>
              {compact ? null : <TableHead className="min-w-[180px] font-semibold">Notes</TableHead>}
              <TableHead className="min-w-[120px] font-semibold">Scripture</TableHead>
              <TableHead className="min-w-[80px] font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, idx) => {
              const fulfilled = row.status === "answered" || row.status === "different_answer";
              const canMarkAnswered =
                onMarkAnswered &&
                ["waiting", "in_motion", "partial"].includes(row.status) &&
                !row.praise_report_entry_id;
              const timelineRefs = timelineScriptureByRequestId?.get(row.id) ?? [];
              const scriptureList = mergeScriptureRefStrings(row.scripture_refs, timelineRefs);
              const scriptureDisplay = scriptureList.length ? scriptureList.join(", ") : "—";
              const emptyAnswerHint = "Record provision to fill this field";
              const remaining = remainingProvisionAmount(row);
              const missing = provisionSpecificityMissing(row);

              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    idx % 2 === 0 ? "bg-background" : "bg-muted/25",
                    fulfilled && "bg-emerald-50/50 dark:bg-emerald-950/15",
                    row.priority === "critical" && !fulfilled && "bg-red-50/35 dark:bg-red-950/10",
                  )}
                >
                  <TableCell className="align-top">
                    <Link
                      to={`/prayer/requests/${row.id}`}
                      className="font-medium hover:underline"
                      title={row.title}
                    >
                      {row.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {row.recurring_template_id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Repeat2 className="h-3 w-3" /> Recurring
                        </span>
                      ) : null}
                      {missing.length ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                          title={`Still determine: ${missing.join(", ")}`}
                        >
                          <TriangleAlert className="h-3 w-3" /> {missing.length} detail{missing.length === 1 ? "" : "s"} missing
                        </span>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      PRAYER_PRIORITY_BADGE_CLASSES[row.priority],
                    )}>
                      {PRAYER_PRIORITY_LABELS[row.priority]}
                    </span>
                  </TableCell>

                  <TableCell className="tabular-nums align-top whitespace-nowrap">
                    {formatLedgerAmount(row.amount_requested)}
                  </TableCell>

                  <TableCell className="tabular-nums align-top whitespace-nowrap font-medium">
                    {formatLedgerAmount(remaining)}
                  </TableCell>

                  <TableCell className="align-top whitespace-nowrap text-muted-foreground text-xs">
                    {shortDate(row.deadline)}
                  </TableCell>

                  {compact ? null : (
                    <TableCell className="align-top text-muted-foreground">
                      <span className="line-clamp-3" title={row.purpose || undefined}>
                        {clip(row.purpose, 110)}
                      </span>
                    </TableCell>
                  )}

                  <TableCell className="align-top whitespace-nowrap text-muted-foreground text-xs">
                    {shortDate(row.requested_at)}
                  </TableCell>

                  <TableCell className="align-top">
                    {canMarkAnswered ? (
                      <button
                        type="button"
                        onClick={() => onMarkAnswered(row)}
                        className="inline-flex"
                        title="Record provision"
                      >
                        <PrayerRequestStatusBadge status={row.status} className="cursor-pointer" />
                      </button>
                    ) : (
                      <PrayerRequestStatusBadge status={row.status} />
                    )}
                  </TableCell>

                  <TableCell
                    className="align-top whitespace-nowrap text-muted-foreground text-xs"
                    title={row.answered_at ? undefined : emptyAnswerHint}
                  >
                    {shortDate(row.answered_at)}
                  </TableCell>

                  <TableCell
                    className="tabular-nums align-top whitespace-nowrap"
                    title={row.amount_provided != null ? undefined : emptyAnswerHint}
                  >
                    {formatLedgerAmount(row.amount_provided)}
                  </TableCell>

                  <TableCell
                    className="align-top text-muted-foreground"
                    title={row.answer_text?.trim() ? row.answer_text : emptyAnswerHint}
                  >
                    <span className="line-clamp-3">{clip(row.answer_text, 110)}</span>
                  </TableCell>

                  {compact ? null : (
                    <TableCell className="align-top text-muted-foreground">
                      <span className="line-clamp-3" title={row.private_notes || undefined}>
                        {clip(row.private_notes, 110)}
                      </span>
                    </TableCell>
                  )}

                  <TableCell
                    className="align-top text-xs text-muted-foreground"
                    title={
                      scriptureList.length
                        ? scriptureDisplay
                        : "Add via Edit → Scriptures standing on, or Link content → Scripture"
                    }
                  >
                    <span className="line-clamp-2">{scriptureDisplay}</span>
                  </TableCell>

                  <TableCell className="align-top text-xs">
                    {canMarkAnswered ? (
                      <button
                        type="button"
                        onClick={() => onMarkAnswered(row)}
                        className="font-medium text-primary hover:underline whitespace-nowrap"
                      >
                        Record
                      </button>
                    ) : (
                      <Link
                        to={`/prayer/requests/${row.id}`}
                        className="text-muted-foreground hover:underline whitespace-nowrap"
                      >
                        View
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {rows.some((r) => r.amount_requested != null || r.amount_provided != null) ? (
        <p className="px-1 text-xs text-muted-foreground tabular-nums">
          Totals — requested: {formatLedgerAmount(totals.requested || null)} · provided:{" "}
          {formatLedgerAmount(totals.provided || null)} · remaining:{" "}
          <span className="font-medium text-foreground">{formatLedgerAmount(totals.remaining || null)}</span>
        </p>
      ) : null}
    </div>
  );
}
