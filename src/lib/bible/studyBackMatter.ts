export type StudyBackMatterSectionId =
  | "preface"
  | "features"
  | "weights"
  | "abbrev"
  | "concordance"
  | "maps";

export interface StudyBackMatterSection {
  id: StudyBackMatterSectionId;
  title: string;
  subtitle?: string;
  /** Static HTML body (study-Bible back matter). */
  bodyHtml: string;
}

export interface StudyMapEntry {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  alt: string;
}

export const STUDY_MAPS: StudyMapEntry[] = [
  {
    id: "abraham",
    title: "Abraham's Journey",
    caption: "Patriarchal routes in Canaan and Egypt (approximate).",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Abraham_journey_map.svg/960px-Abraham_journey_map.svg.png",
    alt: "Map of Abraham's journeys in the Near East",
  },
  {
    id: "exodus",
    title: "The Exodus from Egypt",
    caption: "General route of the Exodus toward Sinai (historic reconstructions vary).",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Exodus_Route.svg/960px-Exodus_Route.svg.png",
    alt: "Map of the Exodus route from Egypt",
  },
  {
    id: "kingdoms",
    title: "United and Divided Kingdom",
    caption: "Israel and Judah after Solomon (approximate boundaries).",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Kingdoms_of_Israel_and_Judah_map_830.svg/960px-Kingdoms_of_Israel_and_Judah_map_830.svg.png",
    alt: "Map of the kingdoms of Israel and Judah",
  },
  {
    id: "paul",
    title: "Paul's Missionary Journeys",
    caption: "Overview of Paul's major journeys in Acts (approximate routes).",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Paul%27s_missionary_journeys-en.svg/960px-Paul%27s_missionary_journeys-en.svg.png",
    alt: "Map of Paul's missionary journeys",
  },
  {
    id: "jerusalem",
    title: "Jerusalem in New Testament Times",
    caption: "Jerusalem at the time of Jesus (schematic plan).",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Jerusalem_at_the_time_of_Jesus.svg/960px-Jerusalem_at_the_time_of_Jesus.svg.png",
    alt: "Plan of Jerusalem in New Testament times",
  },
  {
    id: "tabernacle",
    title: "The Tabernacle Layout",
    caption: "Schematic plan of the wilderness tabernacle (approximate).",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Tabernacle_Schematic.svg/960px-Tabernacle_Schematic.svg.png",
    alt: "Diagram of the tabernacle courtyard and holy places",
  },
  {
    id: "temple",
    title: "Solomon's Temple",
    caption: "Artistic reconstruction of the first temple in Jerusalem.",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Temple_of_Solomon.jpg/960px-Temple_of_Solomon.jpg",
    alt: "Artistic rendering of Solomon's temple",
  },
  {
    id: "canaan",
    title: "Canaan at the Time of Joshua",
    caption: "Twelve tribes and surrounding nations (approximate).",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/12_Tribes_of_Israel_Map.svg/960px-12_Tribes_of_Israel_Map.svg.png",
    alt: "Map of the twelve tribes of Israel",
  },
];

const FEATURES_HTML = `
<p>This reader includes publisher footnotes from your selected translation via API.Bible.</p>
<ul>
  <li><strong>Inline study notes</strong> — footnotes appear with each verse (recommended).</li>
  <li><strong>Holman layout (beta)</strong> — footnotes at the page bottom, like a printed Holman study Bible.</li>
  <li><strong>Illustrations</strong> — classic public-domain plates (Doré, Tissot) at key passages; tap the palette icon for the full chapter gallery, maps, and timeline.</li>
  <li><strong>Word study</strong> — highlight a word, tap the languages icon for concordance, Hebrew (OT), and Strong&apos;s lookup.</li>
  <li><strong>Book introductions</strong> — when your translation provides them, an introduction appears before chapter 1.</li>
</ul>
<p>Tap a footnote marker to read the study note.</p>
`;

const WEIGHTS_HTML = `
<table class="study-back-matter-table">
  <thead><tr><th>Biblical term</th><th>Approximate equivalent</th></tr></thead>
  <tbody>
    <tr><td>Cubit</td><td>≈ 18 in. (45 cm)</td></tr>
    <tr><td>Span</td><td>≈ 9 in. (23 cm)</td></tr>
    <tr><td>Handbreadth</td><td>≈ 3 in. (8 cm)</td></tr>
    <tr><td>Homer (dry)</td><td>≈ 6–7 bu. (220 L)</td></tr>
    <tr><td>Bath (liquid)</td><td>≈ 6 gal. (22 L)</td></tr>
    <tr><td>Cor / Hin</td><td>See homer / bath (dry / liquid measures)</td></tr>
    <tr><td>Talent</td><td>≈ 75 lb. (34 kg)</td></tr>
    <tr><td>Shekel</td><td>≈ 2/5 oz. (11 g)</td></tr>
    <tr><td>Stadium / Furlong</td><td>≈ 600 ft. (185 m)</td></tr>
    <tr><td>Mile (Roman)</td><td>≈ 1,620 yd. (1,480 m)</td></tr>
  </tbody>
</table>
<p class="study-back-matter-note">Modern equivalents are approximate; ancient standards varied by period and region.</p>
`;

const ABBREV_HTML = `
<table class="study-back-matter-table study-back-matter-table--compact">
  <tbody>
    <tr><td>Gn</td><td>Genesis</td><td>Ps</td><td>Psalms</td></tr>
    <tr><td>Ex</td><td>Exodus</td><td>Pr</td><td>Proverbs</td></tr>
    <tr><td>Lv</td><td>Leviticus</td><td>Ec</td><td>Ecclesiastes</td></tr>
    <tr><td>Nm</td><td>Numbers</td><td>Is</td><td>Isaiah</td></tr>
    <tr><td>Dt</td><td>Deuteronomy</td><td>Jr</td><td>Jeremiah</td></tr>
    <tr><td>Jos</td><td>Joshua</td><td>Ezk</td><td>Ezekiel</td></tr>
    <tr><td>Mt</td><td>Matthew</td><td>Jn</td><td>John</td></tr>
    <tr><td>Mk</td><td>Mark</td><td>Ac</td><td>Acts</td></tr>
    <tr><td>Lk</td><td>Luke</td><td>Rm</td><td>Romans</td></tr>
    <tr><td>Gl</td><td>Galatians</td><td>Rv</td><td>Revelation</td></tr>
  </tbody>
</table>
<p class="study-back-matter-note">Cross-references use publisher abbreviations from your translation.</p>
`;

export const STUDY_BACK_MATTER_SECTIONS: StudyBackMatterSection[] = [
  {
    id: "preface",
    title: "Preface",
    bodyHtml: `
      <p>YourBible presents Scripture in a book-like reading experience with study notes, illustrations, and tools for reflection.</p>
      <p>Bible text and study apparatus are supplied by <strong>API.Bible</strong> for your selected translation. Cross-references and footnotes are publisher data — not generated by AI.</p>
      <p>Use <strong>Inline</strong> study layout for the most trustworthy verse-by-verse notes. Holman layout mimics a printed study Bible but is still in beta.</p>
    `,
  },
  {
    id: "features",
    title: "Explanation of Features",
    bodyHtml: FEATURES_HTML,
  },
  {
    id: "weights",
    title: "Table of Weights and Measures",
    bodyHtml: WEIGHTS_HTML,
  },
  {
    id: "abbrev",
    title: "Abbreviations",
    bodyHtml: ABBREV_HTML,
  },
  {
    id: "concordance",
    title: "Concordance",
    subtitle: "Search every occurrence of a word in your translation.",
    bodyHtml: `<p>Type a word below to find matching verses. For a specific passage, search like <em>John 3:16</em>.</p>`,
  },
  {
    id: "maps",
    title: "Maps and Charts",
    bodyHtml: `<p>Historic Bible maps (public domain / Wikimedia Commons). Boundaries and routes are approximate.</p>`,
  },
];

export function studyBackMatterSection(id: string): StudyBackMatterSection | undefined {
  return STUDY_BACK_MATTER_SECTIONS.find((s) => s.id === id);
}

export function studyBackMatterPath(id: StudyBackMatterSectionId): string {
  return `/read/study/${id}`;
}
