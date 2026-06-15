import type { ElsHit, MatrixCell, MatrixView, TextStream } from "@/lib/code-lab/types";

export interface MatrixOptions {
  /** Extra rows/columns of context around the seed hit */
  paddingRows?: number;
  /** Limit total cells rendered */
  maxCells?: number;
}

export function buildMatrixView(
  stream: TextStream,
  hit: ElsHit,
  options: MatrixOptions = {},
): MatrixView {
  const columns = hit.skip;
  const paddingRows = options.paddingRows ?? 8;
  const seedCol = hit.startIndex % columns;
  const seedRow = Math.floor(hit.startIndex / columns);

  const minRow = Math.max(0, seedRow - paddingRows);
  const totalRows = Math.ceil(stream.letters.length / columns);
  const maxRow = Math.min(totalRows - 1, seedRow + paddingRows + hit.term.length);

  const windowStart = minRow * columns;
  const windowEnd = Math.min(stream.letters.length, (maxRow + 1) * columns);

  const seedSet = new Set(hit.indices);
  const cells: MatrixCell[] = [];

  for (let streamIndex = windowStart; streamIndex < windowEnd; streamIndex++) {
    const row = Math.floor(streamIndex / columns) - minRow;
    const col = streamIndex % columns;
    const letter = stream.letters[streamIndex] ?? "";
    cells.push({
      row,
      col,
      streamIndex,
      letter,
      highlighted: seedSet.has(streamIndex),
      isSeed: seedSet.has(streamIndex),
    });
  }

  return {
    columns,
    rows: maxRow - minRow + 1,
    cells,
    seedHit: hit,
    windowStart,
    windowEnd,
  };
}

/** Collect stream indices that share a matrix row with the seed (horizontal neighbors). */
export function horizontalIndicesInRow(streamIndex: number, columns: number, rowWidth: number): number[] {
  const row = Math.floor(streamIndex / columns);
  const rowStart = row * columns;
  const rowEnd = Math.min(rowStart + columns, rowStart + rowWidth);
  const out: number[] = [];
  for (let i = rowStart; i < rowEnd; i++) out.push(i);
  return out;
}
