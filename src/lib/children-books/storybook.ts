export type ChildrenBookSymbol = "crown" | "heart" | "light" | "shield";

export type ChildrenBookPage = {
  title: string;
  body: string;
  scriptureThread: string;
  picturePrompt: string;
  palette: "dawn" | "garden" | "royal" | "starlight";
  symbol: ChildrenBookSymbol;
};

export type ChildrenBook = {
  slug: string;
  title: string;
  sourceNote: string;
  ageRange: string;
  spiritualFocus: string;
  summary: string;
  coverGradient: string;
  generationSeed: string;
  pages: ChildrenBookPage[];
};

export const CHILDREN_BOOKS: ChildrenBook[] = [
  {
    slug: "kingdom-invitation",
    title: "The Kingdom Invitation",
    sourceNote: "Inspired by the public-domain Cinderella story",
    ageRange: "Ages 4-8",
    spiritualFocus: "Identity, angels, intercession, and the Father's invitation",
    summary:
      "A gentle tale about a child who learns that heaven sees her, angels serve God, and the King invites the overlooked to the feast.",
    coverGradient: "linear-gradient(135deg, #7c3aed 0%, #f59e0b 100%)",
    generationSeed:
      "Rewrite a public-domain Cinderella-style tale as an original Kingdom story for children, with angels as servants of God, prayer as intercession, and wonder that points back to the Father.",
    pages: [
      {
        title: "A whisper in the ashes",
        body:
          "Ella swept the quiet kitchen while the house slept. She thought no one saw her tears, but the Father saw every one and called her beloved.",
        scriptureThread: "God sees the hidden child and calls them by name.",
        picturePrompt:
          "A warm cottage kitchen at sunrise, a child holding a broom, soft golden light shaped like a gentle promise.",
        palette: "dawn",
        symbol: "heart",
      },
      {
        title: "The prayer that opened heaven",
        body:
          "Ella folded her hands and asked God for courage. The room grew bright, and a messenger of light reminded her that magic is only good when wonder bows to God.",
        scriptureThread: "Prayer invites heaven's help without fear.",
        picturePrompt:
          "A child praying beside a window, angelic light outside, tiny stars around a wooden floor.",
        palette: "starlight",
        symbol: "light",
      },
      {
        title: "Clothed like a daughter",
        body:
          "The messenger did not make Ella someone else. He helped her remember who she already was: a daughter invited by the King.",
        scriptureThread: "Grace restores identity before it changes circumstances.",
        picturePrompt:
          "A simple dress becoming bright and royal, modest gold embroidery, a child smiling with peaceful confidence.",
        palette: "royal",
        symbol: "crown",
      },
      {
        title: "A feast for the forgotten",
        body:
          "At the palace, Ella noticed another child sitting alone. She shared her seat, and the King's table grew longer for everyone who felt left out.",
        scriptureThread: "The Kingdom welcomes the overlooked.",
        picturePrompt:
          "A joyful banquet table stretching through a garden palace, children sharing bread, soft heavenly glow.",
        palette: "garden",
        symbol: "heart",
      },
    ],
  },
  {
    slug: "garden-of-grace",
    title: "The Garden of Grace",
    sourceNote: "Inspired by the public-domain Beauty and the Beast tradition",
    ageRange: "Ages 5-9",
    spiritualFocus: "Mercy, inner transformation, forgiveness, and spiritual sight",
    summary:
      "A rose-garden story about seeing past fear, asking God for mercy, and watching grace transform a wounded heart.",
    coverGradient: "linear-gradient(135deg, #047857 0%, #f43f5e 100%)",
    generationSeed:
      "Create an original Beauty-and-the-Beast-inspired children's book where the enchanted garden teaches mercy, repentance, and God's power to restore a wounded heart.",
    pages: [
      {
        title: "The locked garden",
        body:
          "Mara found a gate wrapped in thorns. She wanted to run, but the Spirit whispered, 'Look again with mercy.'",
        scriptureThread: "God gives spiritual sight where fear only sees thorns.",
        picturePrompt:
          "A child before an old garden gate, thorn vines curling into heart shapes, emerald and rose light.",
        palette: "garden",
        symbol: "shield",
      },
      {
        title: "The roar and the rose",
        body:
          "A lonely prince roared from the shadows. Mara did not excuse his anger, but she asked God how to answer with truth and kindness.",
        scriptureThread: "Mercy tells the truth without cruelty.",
        picturePrompt:
          "A glowing rose between a brave child and a shadowed prince, soft light calming the scene.",
        palette: "royal",
        symbol: "heart",
      },
      {
        title: "Intercessors in the moonlight",
        body:
          "That night, Mara prayed for the palace. Angels carried her prayers like lanterns through every cold hallway.",
        scriptureThread: "Intercession carries light into dark places.",
        picturePrompt:
          "Moonlit palace halls, angelic lanterns floating gently, a child kneeling by a garden window.",
        palette: "starlight",
        symbol: "light",
      },
      {
        title: "A heart made new",
        body:
          "When the prince asked forgiveness, the thorns loosened. The garden bloomed, and everyone learned that grace makes room for a new beginning.",
        scriptureThread: "Repentance and forgiveness open the way to restoration.",
        picturePrompt:
          "A garden bursting into bloom, children and a restored prince planting flowers together.",
        palette: "garden",
        symbol: "crown",
      },
    ],
  },
  {
    slug: "living-water-princess",
    title: "The Living Water Princess",
    sourceNote: "Inspired by public-domain sea-princess fairy tales",
    ageRange: "Ages 4-8",
    spiritualFocus: "Longing, worship, living water, and choosing God's voice",
    summary:
      "An ocean adventure about a little princess who discovers that the deepest longing in her heart is answered by the Living Water.",
    coverGradient: "linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)",
    generationSeed:
      "Create an original sea-princess fairy tale for children where longing, song, and wonder point toward Jesus as Living Water instead of toward self-saving magic.",
    pages: [
      {
        title: "Songs under the waves",
        body:
          "Liora sang in a coral room, but her song kept reaching upward. She wondered why her heart wanted a home she had never seen.",
        scriptureThread: "God places eternity and longing in the heart.",
        picturePrompt:
          "A bright coral room under the sea, a child princess singing, bubbles rising like musical notes.",
        palette: "starlight",
        symbol: "heart",
      },
      {
        title: "The pearl of prayer",
        body:
          "An old sea turtle gave Liora a pearl and said, 'This cannot grant wishes. It reminds you to ask the One who loves you.'",
        scriptureThread: "Prayer is trust, not wish-making.",
        picturePrompt:
          "A wise sea turtle offering a pearl, teal water, gentle rays from above.",
        palette: "garden",
        symbol: "light",
      },
      {
        title: "The voice above the storm",
        body:
          "When dark waves shouted, Liora listened for the Father's voice. It was quieter than the storm and stronger than the sea.",
        scriptureThread: "God's voice leads through fear.",
        picturePrompt:
          "A small boat on glowing waves, clouds parting with warm light, a brave child looking up.",
        palette: "dawn",
        symbol: "shield",
      },
      {
        title: "Living water",
        body:
          "Liora learned that the truest treasure was not a crown or a castle. It was the living water of God's love filling her from within.",
        scriptureThread: "God satisfies the deepest thirst.",
        picturePrompt:
          "A child by a clear spring at the shore, ocean and garden meeting, joyful green and blue light.",
        palette: "garden",
        symbol: "crown",
      },
    ],
  },
];

export const DEFAULT_CHILDREN_BOOK_SLUG = CHILDREN_BOOKS[0]!.slug;

export function findChildrenBook(slug: string | undefined): ChildrenBook | undefined {
  if (!slug) return CHILDREN_BOOKS[0];
  return CHILDREN_BOOKS.find((book) => book.slug === slug);
}

export function buildChildrenBookGenerationPrompt(book: ChildrenBook): string {
  return [
    book.generationSeed,
    `Audience: ${book.ageRange}.`,
    `Spiritual focus: ${book.spiritualFocus}.`,
    "Write short page text for an illustrated children's book.",
    "For every page, include one image prompt, one spiritual thread, and a parent note.",
    "Use original wording and avoid copying protected modern adaptations.",
  ].join(" ");
}
