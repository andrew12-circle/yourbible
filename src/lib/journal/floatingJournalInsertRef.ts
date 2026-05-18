/**
 * When the floating journal panel is mounted for an artifact, registers an append handler
 * so ArtifactDetailPage can insert bookmark transcript excerpts into the live draft.
 */
export const floatingJournalInsertRef: {
  current: null | { artifactId: string; append: (markdown: string) => void };
} = { current: null };
