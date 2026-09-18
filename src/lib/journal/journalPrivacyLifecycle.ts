type Guard = () => Promise<void>;
const guards = new Set<Guard>();
export function registerJournalPrivacyGuard(guard: Guard): () => void {
  guards.add(guard);
  return () => { guards.delete(guard); };
}
export async function prepareJournalPrivacyLock(): Promise<void> {
  for (const guard of guards) await guard();
}
