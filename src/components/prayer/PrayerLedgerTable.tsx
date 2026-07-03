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
import { formatDisplayDate } from "@/lib/prayer/stats";
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
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-4 px-4">
        <Table className="min-w-[1100px] w-full border-separate border-spacing-0 text-sm">
          <TableHeader>
            <TableRow className="bg-amber-200/90 hover:bg-amber-200/90 border-b border-amber-400/50 dark:bg-amber-950/60">
              <TableHead className="sticky left-0 z-[2] bg-amber-200/95 dark:bg-amber-950/80 font-semibold min-w-[160px]">
                Item
              </TableHead>
              <TableHead className="font-semibold whitespace-nowrap w-[100px]">Amount</TableHead>
              <TableHead className="font-semibold whitespace-nowrap w-[90px]">Deadline</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Purpose</TableHead>
              <TableHead className="font-semibold whitespace-nowrap w-[90px]">Requested</TableHead>
              <TableHead className="font-semibold whitespace-nowrap w-[100px]">Status</TableHead>
              <TableHead className="font-semibold whitespace-nowrap w-[90px]">Answered</TableHead>
              <TableHead className="font-semibold whitespace-nowrap w-[100px]">Received</TableHead>
              <TableHead className="font-semibold min-w-[140px]">Story</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Notes</TableHead>
              <TableHead className="font-semibold min-w-[100px]">Scripture</TableHead>
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
                  <TableCell className="sticky left-0 z-[1] bg-inherit font-medium">
                    <Link to={`/prayer/requests/${row.id}`} className="hover:underline">
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatLedgerAmount(row.amount_requested)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {shortDate(row.deadline)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{clip(row.purpose, 40)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {shortDate(row.requested_at)}
                  </TableCell>
                  <TableCell>
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
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {shortDate(row.answered_at)}
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatLedgerAmount(row.amount_provided)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{clip(row.answer_text, 56)}</TableCell>
                  <TableCell className="text-muted-foreground">{clip(row.private_notes, 40)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.scripture_refs.length
                      ? row.scripture_refs.map((s) => s.ref).join(", ")
                      : "—"}
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
