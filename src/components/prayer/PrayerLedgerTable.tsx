import { Link } from "react-router-dom";
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
};

export default function PrayerLedgerTable({ rows, onMarkAnswered }: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      if (r.amount_requested != null) acc.requested += r.amount_requested;
      if (r.amount_provided != null) acc.provided += r.amount_provided;
      return acc;
    },
    { requested: 0, provided: 0 },
  );

  return (
    <div className="min-w-0 space-y-3">
      <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-border/60">
        <Table className="w-full min-w-0 table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
            <col className="w-[12%]" />
            <col className="w-[7%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
            <col className="w-[6%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-amber-200/90 hover:bg-amber-200/90 border-b border-amber-400/50 dark:bg-amber-950/60">
              <TableHead className="bg-amber-200/95 font-semibold dark:bg-amber-950/80">Item</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Deadline</TableHead>
              <TableHead className="font-semibold">Purpose</TableHead>
              <TableHead className="font-semibold">Requested</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Answered</TableHead>
              <TableHead className="font-semibold">Received</TableHead>
              <TableHead className="font-semibold">Story</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
              <TableHead className="font-semibold">Scripture</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => {
              const fulfilled =
                row.status === "answered" ||
                row.status === "different_answer" ||
                row.status === "partial";
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
                  <TableCell className="align-top text-muted-foreground">
                    <span className="line-clamp-2" title={row.purpose || undefined}>
                      {clip(row.purpose, 80) || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap text-muted-foreground text-xs">
                    {shortDate(row.requested_at)}
                  </TableCell>
                  <TableCell className="align-top">
                    {onMarkAnswered &&
                    row.status === "waiting" &&
                    !row.praise_report_entry_id ? (
                      <button
                        type="button"
                        onClick={() => onMarkAnswered(row)}
                        className="inline-flex"
                      >
                        <PrayerRequestStatusBadge status={row.status} className="cursor-pointer" />
                      </button>
                    ) : (
                      <PrayerRequestStatusBadge status={row.status} />
                    )}
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap text-muted-foreground text-xs">
                    {shortDate(row.answered_at)}
                  </TableCell>
                  <TableCell className="tabular-nums align-top whitespace-nowrap">
                    {formatLedgerAmount(row.amount_provided)}
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    <span className="line-clamp-2" title={row.answer_text || undefined}>
                      {clip(row.answer_text, 80) || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    <span className="line-clamp-2" title={row.private_notes || undefined}>
                      {clip(row.private_notes, 60) || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    <span className="line-clamp-2" title={row.scripture_refs.map((s) => s.ref).join(", ") || undefined}>
                      {row.scripture_refs.length
                        ? row.scripture_refs.map((s) => s.ref).join(", ")
                        : "—"}
                    </span>
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
