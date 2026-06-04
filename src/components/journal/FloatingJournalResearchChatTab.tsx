import type { FloatingClaimResearchHandoff } from "@/lib/journal/floatingJournalStore";
import ClaimResearchWorkspace from "@/components/journal/ClaimResearchWorkspace";

type Props = {
  userId: string;
  research: FloatingClaimResearchHandoff;
};

/** Claim research chat — unified workspace (brief + conversational chat + verdict dock). */
export default function FloatingJournalResearchChatTab({ userId, research }: Props) {
  return <ClaimResearchWorkspace userId={userId} research={research} />;
}
