/** Preserve unchanged card identities, but never ignore changed verdicts/evidence just because IDs match. */
export function reconcileArtifactClaims<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  const byId = new Map(previous.map(row => [row.id, row]));
  const next = incoming.map(row => {
    const old = byId.get(row.id);
    return old && JSON.stringify(old) === JSON.stringify(row) ? old : row;
  });
  return next.length === previous.length && next.every((row, i) => row === previous[i]) ? previous : next;
}
