import { supabase } from "@/integrations/supabase/client";
import {
  MORNING_CONVERSATION_ENTRY_KIND,
  MORNING_CONVERSATION_TAG_PREFIX,
} from "@/lib/livingHope/morningConversationJournal";
import {
  MORNING_REVIEW_ENTRY_KIND,
  MORNING_REVIEW_TAG_PREFIX,
} from "@/lib/livingHope/morningReviewJournal";

export interface MorningEntrySourceLink {
  label: string;
  href: string;
  detail?: string;
}

/** Parse `lh-review:YYYY-MM-DD` or `lh-conversation:YYYY-MM-DD` from entry tags. */
export function morningReviewDateFromTags(tags: string[] | null | undefined): string | null {
  if (!tags?.length) return null;
  for (const tag of tags) {
    if (tag.startsWith(MORNING_REVIEW_TAG_PREFIX)) {
      return tag.slice(MORNING_REVIEW_TAG_PREFIX.length) || null;
    }
    if (tag.startsWith(MORNING_CONVERSATION_TAG_PREFIX)) {
      return tag.slice(MORNING_CONVERSATION_TAG_PREFIX.length) || null;
    }
  }
  return null;
}

async function findEntryIdByKindAndDate(
  userId: string,
  entryKind: string,
  reviewDate: string,
  tagPrefix: string,
): Promise<string | null> {
  const tag = `${tagPrefix}${reviewDate}`;
  const { data } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_kind", entryKind)
    .contains("tags", [tag])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Related First Light / sibling journal links for morning formula entries. */
export async function loadMorningEntrySourceLinks(
  userId: string,
  entryId: string,
  entryKind: string | null | undefined,
  tags: string[] | null | undefined,
): Promise<MorningEntrySourceLink[]> {
  const reviewDate = morningReviewDateFromTags(tags);
  if (!reviewDate) return [];

  const links: MorningEntrySourceLink[] = [
    {
      label: "First Light",
      href: "/living-hope",
      detail: `Morning formula · ${reviewDate}`,
    },
  ];

  const { data: reviewRow } = await supabase
    .from("living_hope_reviews")
    .select("id, completed_at")
    .eq("user_id", userId)
    .eq("review_date", reviewDate)
    .maybeSingle();

  if (reviewRow?.completed_at) {
    links.push({
      label: "Today's review",
      href: "/living-hope/review",
      detail: "Structured morning formula record",
    });
  }

  if (entryKind === MORNING_REVIEW_ENTRY_KIND) {
    const conversationId = await findEntryIdByKindAndDate(
      userId,
      MORNING_CONVERSATION_ENTRY_KIND,
      reviewDate,
      MORNING_CONVERSATION_TAG_PREFIX,
    );
    if (conversationId && conversationId !== entryId) {
      links.push({
        label: "Conversation entry",
        href: `/journal/${conversationId}`,
        detail: "Worship, thanksgiving, and listening",
      });
    }
  } else if (entryKind === MORNING_CONVERSATION_ENTRY_KIND) {
    const summaryId = await findEntryIdByKindAndDate(
      userId,
      MORNING_REVIEW_ENTRY_KIND,
      reviewDate,
      MORNING_REVIEW_TAG_PREFIX,
    );
    if (summaryId && summaryId !== entryId) {
      links.push({
        label: "Morning summary",
        href: `/journal/${summaryId}`,
        detail: "Auto-exported from First Light",
      });
    }
  }

  return links;
}
