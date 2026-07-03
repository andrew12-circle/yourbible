/** Curated scriptures for provision, finances, faith, and calling things in. */

export type ProvisionScriptureCategory =
  | "finances"
  | "provision"
  | "faith"
  | "trust"
  | "calling";

export type ProvisionScriptureEntry = {
  ref: string;
  category: ProvisionScriptureCategory;
  /** Short label for why this verse fits the category. */
  theme: string;
};

export const PROVISION_SCRIPTURE_CATEGORIES: {
  id: ProvisionScriptureCategory | "all";
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "finances", label: "Finances" },
  { id: "provision", label: "Provision" },
  { id: "faith", label: "Faith" },
  { id: "trust", label: "Trust God" },
  { id: "calling", label: "Calling it in" },
];

export const PROVISION_SCRIPTURES: ProvisionScriptureEntry[] = [
  { ref: "Philippians 4:19", category: "finances", theme: "God supplies every need" },
  { ref: "Matthew 6:33", category: "finances", theme: "Seek first the kingdom" },
  { ref: "Deuteronomy 8:18", category: "finances", theme: "Power to produce wealth" },
  { ref: "Malachi 3:10", category: "finances", theme: "Open the windows of heaven" },
  { ref: "Proverbs 3:9-10", category: "finances", theme: "Honor the Lord with wealth" },
  { ref: "Proverbs 10:22", category: "finances", theme: "Blessing of the Lord" },
  { ref: "Luke 6:38", category: "finances", theme: "Give and it will be given" },
  { ref: "2 Corinthians 9:8", category: "finances", theme: "Abound in every good work" },
  { ref: "Deuteronomy 28:12", category: "finances", theme: "Lend to many nations" },
  { ref: "Haggai 2:8", category: "finances", theme: "Silver and gold are His" },
  { ref: "1 Timothy 6:17", category: "finances", theme: "Richly provides everything" },
  { ref: "3 John 1:2", category: "finances", theme: "Prosper in all things" },

  { ref: "Psalm 23:1", category: "provision", theme: "The Lord is my shepherd" },
  { ref: "Psalm 37:25", category: "provision", theme: "Never seen the righteous forsaken" },
  { ref: "Psalm 34:10", category: "provision", theme: "Lack no good thing" },
  { ref: "Psalm 84:11", category: "provision", theme: "No good thing withheld" },
  { ref: "Psalm 145:16", category: "provision", theme: "Satisfies the desire of every living thing" },
  { ref: "Genesis 22:14", category: "provision", theme: "The Lord will provide" },
  { ref: "Isaiah 58:11", category: "provision", theme: "Guide and satisfy in drought" },
  { ref: "Romans 8:32", category: "provision", theme: "Freely give us all things" },
  { ref: "2 Peter 1:3", category: "provision", theme: "All things for life and godliness" },

  { ref: "Hebrews 11:1", category: "faith", theme: "Faith is the assurance of things hoped for" },
  { ref: "Mark 11:24", category: "faith", theme: "Believe you have received" },
  { ref: "Matthew 21:22", category: "faith", theme: "Believe and receive" },
  { ref: "Mark 9:23", category: "faith", theme: "All things possible to him who believes" },
  { ref: "James 1:6", category: "faith", theme: "Ask in faith without doubting" },
  { ref: "Romans 4:20-21", category: "faith", theme: "Fully convinced God is able" },
  { ref: "Habakkuk 2:3", category: "faith", theme: "Wait for it — it will come" },

  { ref: "Isaiah 41:10", category: "trust", theme: "Do not fear — I am with you" },
  { ref: "Psalm 56:3", category: "trust", theme: "When I am afraid, I trust in You" },
  { ref: "Psalm 121:7-8", category: "trust", theme: "The Lord keeps you" },
  { ref: "Proverbs 3:5-6", category: "trust", theme: "Trust in the Lord with all your heart" },
  { ref: "1 Peter 5:7", category: "trust", theme: "Cast all your anxiety on Him" },
  { ref: "Philippians 4:6-7", category: "trust", theme: "Do not be anxious" },
  { ref: "Matthew 6:25", category: "trust", theme: "Do not worry about your life" },
  { ref: "Psalm 27:13-14", category: "trust", theme: "Wait for the Lord" },

  { ref: "Matthew 7:7", category: "calling", theme: "Ask, seek, knock" },
  { ref: "John 15:7", category: "calling", theme: "Ask whatever you wish" },
  { ref: "1 John 5:14-15", category: "calling", theme: "Confidence when we ask" },
  { ref: "Jeremiah 33:3", category: "calling", theme: "Call to Me — I will answer" },
  { ref: "Isaiah 43:26", category: "calling", theme: "State your case" },
  { ref: "Joshua 1:8", category: "calling", theme: "Meditate on the Word — prosper" },
  { ref: "Proverbs 16:3", category: "calling", theme: "Commit your work to the Lord" },
  { ref: "Psalm 37:4", category: "calling", theme: "Delight in the Lord" },
  { ref: "Mark 11:23", category: "calling", theme: "Speak to the mountain" },
];

export function filterProvisionScriptures(
  category: ProvisionScriptureCategory | "all",
  query: string,
): ProvisionScriptureEntry[] {
  const q = query.trim().toLowerCase();
  return PROVISION_SCRIPTURES.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    if (!q) return true;
    return (
      entry.ref.toLowerCase().includes(q) ||
      entry.theme.toLowerCase().includes(q) ||
      entry.category.includes(q)
    );
  });
}
