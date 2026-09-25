import { useState } from "react";
import { Link } from "react-router-dom";
import { Rows3, Table2 } from "lucide-react";
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

type LedgerRowView = {
  row: PrayerRequestRow;
  canMarkAnswered: boolean;
  fulfilled: boolean;
  scriptureDisplay: string;
  scriptureTitle: string;
  emptyAnswerHint: string;
};

function buildLedgerRowView(
  row: PrayerRequestRow,
  onMarkAnswered: Props["onMarkAnswered"],
  timelineScriptureByRequestId: Props["timelineScriptureByRequestId"],
): LedgerRowView {
  const fulfilled =
    row.status === "answered" || row.status === "different_answer" || row.status === "partial";
  const canMarkAnswered = Boolean(onMarkAnswered && row.status === "waiting" && !row.praise_report_entry_id);
  const timelineRefs = timelineScriptureByRequestId?.get(row.id) ?? [];
  const scriptureList = mergeScriptureRefStrings(row.scripture_refs, timelineRefs);
  const scriptureDisplay = scriptureList.length ? scriptureList.join(", ") : "—";
  const scriptureTitle = scriptureList.length
    ? scriptureDisplay
    : "Add via Edit → Scriptures standing on, or Link content → Scripture";

  return {
    row,
    canMarkAnswered,
    fulfilled,
    scriptureDisplay,
    scriptureTitle,
    emptyAnswerHint: "Mark answered to record — click Record or the WAITING badge",
  };
}

function MobileLedgerCard({
  view,
  onMarkAnswered,
}: {
  view: LedgerRowView;
  onMarkAnswered?: (row: PrayerRequestRow) => void;
}) {
  const { row, canMarkAnswered, fulfilled, scriptureDisplay, scriptureTitle, emptyAnswerHint } = view;

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm",
        fulfilled && "border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/prayer/requests/${row.id}`}
            className="line-clamp-2 text-sm font-semibold leading-snug hover:underline"
            title={row.title}
          >
            {row.title}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">{shortDate(row.requested_at)}</p>
        </div>
        {canMarkAnswered ? (
          <button
            type="button"
            onClick={() => onMarkAnswered?.(row)}
            className="inline-flex shrink-0"
            title="Click to mark answered and record provision"
          >
            <PrayerRequestStatusBadge status={row.status} className="cursor-pointer" />
          </button>
        ) : (
          <PrayerRequestStatusBadge status={row.status} />
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted/35 px-2.5 py-2">
          <dt className="font-medium text-muted-foreground">Amount</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{formatLedgerAmount(row.amount_requested)}</dd>
        </div>
        <div className="rounded-xl bg-muted/35 px-2.5 py-2">
          <dt className="font-medium text-muted-foreground">Deadline</dt>
          <dd className="mt-0.5 tabular-nums">{shortDate(row.deadline)}</dd>
        </div>
        <div className="rounded-xl bg-muted/35 px-2.5 py-2" title={row.answered_at ? undefined : emptyAnswerHint}>
          <dt className="font-medium text-muted-foreground">Answered</dt>
          <dd className="mt-0.5 tabular-nums">{shortDate(row.answered_at)}</dd>
        </div>
        <div
          className="rounded-xl bg-muted/35 px-2.5 py-2"
          title={row.amount_provided != null ? undefined : emptyAnswerHint}
        >
          <dt className="font-medium text-muted-foreground">Received</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{formatLedgerAmount(row.amount_provided)}</dd>
        </div>
      </dl>

      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Purpose: </span>
          {clip(row.purpose, 120)}
        </p>
        <p title={row.answer_text?.trim() ? row.answer_text : emptyAnswerHint}>
          <span className="font-medium text-foreground">Story: </span>
          {clip(row.answer_text, 120)}
        </p>
        <p title={scriptureTitle}>
          <span className="font-medium text-foreground">Scripture: </span>
          {scriptureDisplay}
        </p>
      </div>

      <div className="mt-3 flex justify-end">
        {canMarkAnswered ? (
          <button
            type="button"
            onClick={() => onMarkAnswered?.(row)}
            className="text-xs font-medium text-primary hover:underline"
            aria-label={`Record answer for ${row.title}`}
          >
            Record
          </button>
        ) : (
          <Link
            to={`/prayer/requests/${row.id}`}
            className="text-xs font-medium text-muted-foreground hover:underline"
          >
            View
          </Link>
        )}
      </div>
    </article>
  );
}

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
      return acc;
    },
    { requested: 0, provided: 0 },
  );
  const rowViews = rows.map((row) => buildLedgerRowView(row, onMarkAnswered, timelineScriptureByRequestId));

  return (
    <div className="min-w-0 space-y-3">
      <div className="hidden justify-end md:flex">
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
      <div className="space-y-3 md:hidden" role="list" aria-label="Mobile provision ledger">
        {rowViews.map((view) => (
          <div key={view.row.id} role="listitem">
            <MobileLedgerCard view={view} onMarkAnswered={onMarkAnswered} />
          </div>
        ))}
      </div>
      <div className="hidden w-full min-w-0 overflow-x-auto rounded-lg border border-border/60 md:block">
        <Table className="w-full min-w-[68rem] table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            <col className={compact ? "w-[15%]" : "w-[12%]"} />
            <col className={compact ? "w-[9%]" : "w-[7%]"} />
            <col className={compact ? "w-[8%]" : "w-[6%]"} />
            {compact ? null : <col className="w-[11%]" />}
            <col className={compact ? "w-[8%]" : "w-[6%]"} />
            <col className={compact ? "w-[9%]" : "w-[8%]"} />
            <col className={compact ? "w-[8%]" : "w-[6%]"} />
            <col className={compact ? "w-[9%]" : "w-[7%]"} />
            <col className={compact ? "w-[15%]" : "w-[6%]"} />
            {compact ? null : <col className="w-[12%]" />}
            <col className={compact ? "w-[12%]" : "w-[9%]"} />
            <col className={compact ? "w-[7%]" : "w-[6%]"} />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-amber-200/90 hover:bg-amber-200/90 border-b border-amber-400/50 dark:bg-amber-950/60">
              <TableHead className="bg-amber-200/95 font-semibold dark:bg-amber-950/80">Item</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Deadline</TableHead>
              {compact ? null : <TableHead className="font-semibold">Purpose</TableHead>}
              <TableHead className="font-semibold">Requested</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Answered</TableHead>
              <TableHead className="font-semibold">Received</TableHead>
              <TableHead className="font-semibold">Story</TableHead>
              {compact ? null : <TableHead className="font-semibold">Notes</TableHead>}
              <TableHead className="font-semibold">Scripture</TableHead>
              <TableHead className="font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowViews.map((view, idx) => {
              const { row, fulfilled, canMarkAnswered, scriptureDisplay, scriptureTitle, emptyAnswerHint } = view;
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    idx % 2 === 0 ? "bg-background" : "bg-muted/25",
                    fulfilled && "bg-emerald-50/50 dark:bg-emerald-950/15",
                  )}
                >
                  <TableCell className="font-medium align-top">
                    <Link
                      to={`/prayer/requests/${row.id}`}
                      className="line-clamp-2 hover:underline"
                      title={row.title}
                    >
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums align-top whitespace-nowrap">
                    {formatLedgerAmount(row.amount_requested)}
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap text-muted-foreground text-xs">
                    {shortDate(row.deadline)}
                  </TableCell>
                  {compact ? null : (
                    <TableCell className="align-top text-muted-foreground">
                      <span className="line-clamp-2" title={row.purpose || undefined}>
                        {clip(row.purpose, 80) || "—"}
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
                        onClick={() => onMarkAnswered?.(row)}
                        className="inline-flex"
                        title="Click to mark answered and record provision"
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
                    <span className="line-clamp-2">
                      {clip(row.answer_text, 80) || "—"}
                    </span>
                  </TableCell>
                  {compact ? null : (
                    <TableCell className="align-top text-muted-foreground">
                      <span className="line-clamp-2" title={row.private_notes || undefined}>
                        {clip(row.private_notes, 60) || "—"}
                      </span>
                    </TableCell>
                  )}
                  <TableCell
                    className="align-top text-xs text-muted-foreground"
                    title={scriptureTitle}
                  >
                    <span className="line-clamp-2">{scriptureDisplay}</span>
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    {canMarkAnswered ? (
                      <button
                        type="button"
                        onClick={() => onMarkAnswered?.(row)}
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
        <p className="text-xs text-muted-foreground tabular-nums px-1">
          Totals — requested: {formatLedgerAmount(totals.requested || null)} · provided:{" "}
          {formatLedgerAmount(totals.provided || null)}
        </p>
      ) : null}
    </div>
  );
}
