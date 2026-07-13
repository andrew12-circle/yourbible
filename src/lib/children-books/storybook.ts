export type ChildrenBookSymbol = "crown" | "heart" | "light" | "shield";

/**
 * Picture-book page layout (one story page = one physical page).
 * Default rhythm alternates text-above-art (left) and art-above-text (right).
 */
export type ChildrenBookPageLayout =
  | "picture-book"
  | "text-pocket"
  | "full-spread"
  | "text-only";

export type ChildrenBookPage = {
  /** Editorial label for prompts and tooling — not shown on the story spread. */
  title: string;
  body: string;
  scriptureThread: string;
  picturePrompt: string;
  /** Hosted or public path, e.g. /children-books/kingdom-invitation/01.webp */
  imageUrl?: string;
  imageAlt?: string;
  /** Load from public/children-books/{bookSlug}/{pageNumber}.webp */
  useDefaultImagePath?: boolean;
  palette: "dawn" | "garden" | "royal" | "starlight";
  symbol: ChildrenBookSymbol;
  /** Override the automatic picture-book layout rhythm for this page. */
  layout?: ChildrenBookPageLayout;
};

/** Occasional layout accents on top of the default left/right rhythm. */
const PAGE_LAYOUT_CYCLE: ChildrenBookPageLayout[] = [
  "picture-book",
  "picture-book",
  "picture-book",
  "picture-book",
  "full-spread",
  "picture-book",
  "picture-book",
  "text-pocket",
];

export function resolvePageLayout(
  page: ChildrenBookPage,
  pageIndex: number,
): ChildrenBookPageLayout {
  return page.layout ?? PAGE_LAYOUT_CYCLE[pageIndex % PAGE_LAYOUT_CYCLE.length]!;
}

export type ChildrenBook = {
  slug: string;
  title: string;
  /** Series heroine name for illustration prompts (defaults to Lilly). */
  heroName?: string;
  sourceNote: string;
  ageRange: string;
  spiritualFocus: string;
  summary: string;
  coverGradient: string;
  /** Scene description for the front-cover illustration */
  coverPrompt: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  /** Load cover from public/children-books/{slug}/cover.png */
  useDefaultCoverPath?: boolean;
  generationSeed: string;
  /** Load illustrations from public/children-books/{slug}/{page}.png */
  useDefaultImagePaths?: boolean;
  /** Short prayer read aloud on the closing spread. */
  closingPrayer: string;
  /** Scene for the closing illustration (public/children-books/{slug}/end.png when enabled). */
  closingIllustrationPrompt: string;
  closingImageUrl?: string;
  useDefaultClosingImagePath?: boolean;
  pages: ChildrenBookPage[];
};

export const CHILDREN_BOOKS: ChildrenBook[] = [
  {
    slug: "kingdom-invitation",
    title: "Lilly: A Story of Faith, Kindness, and God's Perfect Timing",
    heroName: "Lilly",
    sourceNote: "Original faith retelling inspired by the public-domain Cinderella story",
    ageRange: "Ages 4-8",
    spiritualFocus: "Faith, kindness, humility, prayer, forgiveness, and God's timing",
    summary:
      "Lilly learns that God sees the overlooked, kindness is never wasted, and the Lord often answers prayer through ordinary people willing to help.",
    coverGradient: "linear-gradient(135deg, #7c3aed 0%, #f59e0b 100%)",
    coverPrompt:
      "Front cover portrait: Lilly (soft chestnut hair, round face, warm smile) in a gentle golden gown, humble and kind, warm candlelit cottage and rolling forest hills behind her, golden hour light, elegant storybook cover composition with open space along the top for a title.",
    useDefaultCoverPath: true,
    generationSeed:
      "Use the provided Cinderella faith retelling as a Lilly children's picture book about God's perfect timing, kindness, prayer, humility, and forgiveness.",
    useDefaultImagePaths: true,
    useDefaultClosingImagePath: true,
    closingPrayer:
      "Dear Jesus, thank You for seeing me when no one else does. Help me stay kind, trust Your perfect timing, and love others the way You love me. Amen.",
    closingIllustrationPrompt:
      "Lilly standing in a golden sunset meadow, hands folded in thankful prayer, gentle smile, village and soft castle in the distance, firefly-like warm lights in the air, rolling hills, cinematic storybook ending, peaceful joy and wonder.",
    pages: [
      {
        title: "A mother's reminder",
        body:
          "Long ago, in a beautiful kingdom surrounded by forests and rolling hills, there lived a young girl named Cinderella. Each night, her mother reminded her, 'God sees you, even when no one else does.'",
        scriptureThread: "God sees His children, even when the world overlooks them.",
        picturePrompt:
          "A gentle mother tucking a little girl into bed in a candlelit cottage, forest hills outside the window, warm golden light.",
        palette: "dawn",
        symbol: "heart",
      },
      {
        title: "Kindness is never wasted",
        body:
          "Her mother told her, 'Let your heart stay kind, because kindness is never wasted.' Cinderella carried those words deep in her heart.",
        scriptureThread: "A kind heart is precious to God.",
        picturePrompt:
          "A little girl holding her mother's hand, a glowing heart-shaped pattern in the quilt, peaceful bedtime scene.",
        palette: "starlight",
        symbol: "heart",
      },
      {
        title: "A lonely house",
        body:
          "After Cinderella's mother went to be with the Lord, her father cared for her tenderly. Years later, he also passed away, and Cinderella was left with her stepmother and two stepsisters.",
        scriptureThread: "God stays near to the brokenhearted.",
        picturePrompt:
          "A quiet cottage at sunset with Cinderella looking at family portraits, soft light around her shoulders.",
        palette: "dawn",
        symbol: "light",
      },
      {
        title: "Work from sunrise to stars",
        body:
          "At first her new family was pleasant enough, but their hearts grew proud and selfish. They expected Cinderella to cook, wash, sweep, and care for the whole house from sunrise until the stars filled the sky.",
        scriptureThread: "Faithfulness matters, even in hidden work.",
        picturePrompt:
          "Cinderella sweeping a kitchen as morning light enters one window and stars are visible through another, showing a long day.",
        palette: "starlight",
        symbol: "shield",
      },
      {
        title: "Her morning prayer",
        body:
          "Yet Cinderella never stopped praying. Each morning she whispered, 'Lord, help me love well today. Give me strength to do what is right, even when it is hard.'",
        scriptureThread: "Prayer gives strength for hard days.",
        picturePrompt:
          "Cinderella kneeling beside a small bed at sunrise, hands folded, light spilling across wooden floorboards.",
        palette: "dawn",
        symbol: "light",
      },
      {
        title: "God always noticed",
        body:
          "Cinderella did not always feel happy. Sometimes she cried, felt lonely, and wondered if anyone noticed her at all. But God always did.",
        scriptureThread: "No tear is hidden from God.",
        picturePrompt:
          "Cinderella sitting by a hearth with a single tear, warm heavenly light gently surrounding her.",
        palette: "starlight",
        symbol: "heart",
      },
      {
        title: "The village remembered",
        body:
          "The baker remembered how Cinderella carried bread to an elderly neighbor. The shepherd remembered how she rescued a frightened lamb.",
        scriptureThread: "Small acts of love leave a lasting witness.",
        picturePrompt:
          "A village lane with Cinderella giving bread to an elderly neighbor while a shepherd holds a rescued lamb nearby.",
        palette: "garden",
        symbol: "heart",
      },
      {
        title: "Quiet prayers for Cinderella",
        body:
          "The children remembered how she shared whatever little she had. The widow at church remembered her visits. Without Cinderella knowing, many people prayed, 'Lord, please bless that faithful young woman.'",
        scriptureThread: "Intercession can bless someone who does not even know they are being prayed for.",
        picturePrompt:
          "Villagers praying in a small church with stained glass, Cinderella shown in a soft thought-bubble of light.",
        palette: "royal",
        symbol: "light",
      },
      {
        title: "The king's celebration",
        body:
          "One spring morning, the king announced a great celebration. Every family was invited, and the prince hoped to meet a young woman whose heart loved what was good and true.",
        scriptureThread: "God values truth and goodness more than outward show.",
        picturePrompt:
          "A royal messenger reading a scroll in the village square while flowers bloom and people gather.",
        palette: "garden",
        symbol: "crown",
      },
      {
        title: "A simple blue dress",
        body:
          "Cinderella carefully stitched a simple dress from fabric she had saved for years. She was excited for one evening of joy.",
        scriptureThread: "Hope can grow quietly through patient faith.",
        picturePrompt:
          "Cinderella sewing a simple blue dress by a sunny window, thread spools and fabric scraps around her.",
        palette: "dawn",
        symbol: "heart",
      },
      {
        title: "The dress was torn",
        body:
          "When her stepsisters saw the dress, they laughed. In jealousy, they ripped it apart and left for the celebration without her.",
        scriptureThread: "Cruelty can wound, but it cannot cancel God's care.",
        picturePrompt:
          "A torn blue dress on a chair, Cinderella standing quietly as two shadowy figures leave through the doorway.",
        palette: "starlight",
        symbol: "shield",
      },
      {
        title: "Trust on the steps",
        body:
          "Cinderella sat on the steps and cried. Then she folded her hands and prayed, 'Father, I do not understand why this happened. But I trust You. Your plans are better than mine.'",
        scriptureThread: "Trusting God means praying honestly when we do not understand.",
        picturePrompt:
          "Cinderella sitting on stone steps under evening stars, torn fabric beside her, hands folded in prayer.",
        palette: "starlight",
        symbol: "light",
      },
      {
        title: "A knock at the door",
        body:
          "A little while later, there was a gentle knock. Several women from the village stood outside, and the elderly widow smiled warmly. 'We've all been praying for you.'",
        scriptureThread: "God often sends help through people who love Him.",
        picturePrompt:
          "Village women standing at Cinderella's doorway with kind smiles, lanterns, fabric, and baskets of gifts.",
        palette: "dawn",
        symbol: "heart",
      },
      {
        title: "Small gifts together",
        body:
          "One woman brought a blue dress. A seamstress brought a ribbon. The baker's wife brought sparkling shoes. None could do much alone, but together they gave Cinderella everything she needed.",
        scriptureThread: "Ordinary gifts become beautiful when love works together.",
        picturePrompt:
          "Hands placing a blue dress, ribbon, and sparkling shoes on a table, Cinderella wiping thankful tears.",
        palette: "royal",
        symbol: "crown",
      },
      {
        title: "Thank You, Lord",
        body:
          "The widow held Cinderella's hands and said, 'These are not gifts from luck. They are reminders that God often answers prayers through people who love Him.' Cinderella bowed her head and said, 'Thank You, Lord.'",
        scriptureThread: "Gratitude helps us recognize God's hand.",
        picturePrompt:
          "Cinderella and the elderly widow holding hands in prayer, the blue dress glowing softly nearby.",
        palette: "dawn",
        symbol: "light",
      },
      {
        title: "Quiet joy at the celebration",
        body:
          "When Cinderella arrived, no one recognized her. Not because of her dress, but because she carried quiet joy instead of pride.",
        scriptureThread: "True beauty begins with humility.",
        picturePrompt:
          "Cinderella entering a palace hall in a blue dress, golden light around her, guests turning in wonder.",
        palette: "royal",
        symbol: "crown",
      },
      {
        title: "Kindness at the palace",
        body:
          "While others hurried to impress the prince, Cinderella helped an elderly servant with heavy trays, comforted a frightened child, and thanked every servant who brought food.",
        scriptureThread: "A loving heart honors every person.",
        picturePrompt:
          "Cinderella helping an elderly servant carry trays while a little girl smiles beside her in a palace hall.",
        palette: "garden",
        symbol: "heart",
      },
      {
        title: "The prince noticed",
        body:
          "The prince had met many young women that evening. Some were clever, wealthy, and beautiful, but Cinderella's kindness was what he had hoped to find.",
        scriptureThread: "Godly character shines brighter than riches.",
        picturePrompt:
          "A prince watching kindly from across the ballroom as Cinderella helps others, warm chandelier light above.",
        palette: "royal",
        symbol: "crown",
      },
      {
        title: "A conversation of faith",
        body:
          "Cinderella and the prince talked for hours about family, faith, helping others, and trusting God through difficult seasons. For the first time all evening, the prince smiled without pretending.",
        scriptureThread: "Faithful hearts recognize what is good and true.",
        picturePrompt:
          "Cinderella and the prince talking beside a palace garden fountain under soft evening lights.",
        palette: "royal",
        symbol: "crown",
      },
      {
        title: "The lost shoe",
        body:
          "As the evening ended, Cinderella remembered she had promised to be home before her stepmother returned. She hurried down the palace steps, and one shoe slipped off.",
        scriptureThread: "Even hurried moments can still fit inside God's plan.",
        picturePrompt:
          "Cinderella running down moonlit palace steps as one sparkling shoe rests on a stair behind her.",
        palette: "starlight",
        symbol: "light",
      },
      {
        title: "Searching for her heart",
        body:
          "The prince picked up the shoe. He knew the shoe was not what mattered. He wanted to find the young woman whose heart had inspired everyone she met.",
        scriptureThread: "The Lord teaches us to look at the heart.",
        picturePrompt:
          "The prince holding a sparkling shoe on palace steps, looking toward the village with thoughtful kindness.",
        palette: "royal",
        symbol: "heart",
      },
      {
        title: "The shoe fit",
        body:
          "After several days of searching, the prince reached Cinderella's house. Her stepsisters rushed forward, but the shoe did not fit them. Then Cinderella quietly stepped forward, and it fit perfectly.",
        scriptureThread: "God can reveal what is true at the right time.",
        picturePrompt:
          "Cinderella seated calmly as the shoe fits, villagers and servants smiling in a humble cottage room.",
        palette: "dawn",
        symbol: "crown",
      },
      {
        title: "Honor for everyone",
        body:
          "The prince smiled and said, 'I was not searching for a shoe. I was searching for the woman who treated everyone with honor.' The villagers smiled. They had been praying for this day.",
        scriptureThread: "Honor and humility prepare us for God's lifting.",
        picturePrompt:
          "The prince and Cinderella standing before joyful villagers, warm sunlight pouring through an open door.",
        palette: "garden",
        symbol: "heart",
      },
      {
        title: "Choosing forgiveness",
        body:
          "Cinderella forgave her stepmother and stepsisters. Forgiveness was not easy, but she remembered how much God had forgiven her.",
        scriptureThread: "Forgiveness follows the mercy God gives us.",
        picturePrompt:
          "Cinderella offering a gentle hand to her ashamed stepsisters, soft light entering the room.",
        palette: "dawn",
        symbol: "shield",
      },
      {
        title: "Hearts can soften",
        body:
          "Over time, even her stepsisters' hearts began to soften. Some people change quickly and others change slowly, but God's kindness can reach every willing heart.",
        scriptureThread: "God's kindness leads hearts toward change.",
        picturePrompt:
          "Cinderella and her stepsisters planting flowers together in a garden, new green shoots growing.",
        palette: "garden",
        symbol: "light",
      },
      {
        title: "A kingdom of care",
        body:
          "Cinderella and the prince were married, and together they led with humility, generosity, and justice. They cared for widows, protected children, welcomed strangers, and remembered every good gift comes from God.",
        scriptureThread: "Leadership is strongest when it serves others.",
        picturePrompt:
          "Cinderella and the prince serving villagers at a long outdoor table with children, widows, and travelers welcome.",
        palette: "royal",
        symbol: "crown",
      },
      {
        title: "God never forgot",
        body:
          "Whenever people asked Cinderella how her life changed so dramatically, she smiled and said, 'God was faithful long before I could see His plan. He never forgot me.'",
        scriptureThread: "God is faithful before we can see the whole story.",
        picturePrompt:
          "Cinderella standing on a balcony at sunrise, village and hills below, hands lifted in thankful prayer.",
        palette: "dawn",
        symbol: "heart",
      },
      {
        title: "The lesson",
        body:
          "God sees people the world overlooks. Kindness is never wasted. Faithfulness matters when no one is watching. God often answers prayers through ordinary people willing to help.",
        scriptureThread: "Humble yourselves before the Lord, and He will lift you up. - James 4:10",
        picturePrompt:
          "A glowing storybook open to James 4:10, surrounded by a blue ribbon, sparkling shoes, bread, flowers, and praying hands.",
        palette: "starlight",
        symbol: "light",
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
    coverPrompt:
      "Front cover portrait: a brave child before an old garden gate wrapped in thorn vines curling into heart shapes, a glowing rose at the center, emerald and rose light, painterly storybook cover with open space along the top for a title.",
    useDefaultCoverPath: true,
    generationSeed:
      "Create an original Beauty-and-the-Beast-inspired children's book where the enchanted garden teaches mercy, repentance, and God's power to restore a wounded heart.",
    closingPrayer:
      "Dear Jesus, soften my heart when I am afraid. Teach me to see others with mercy, speak truth with kindness, and forgive the way You forgive me. Amen.",
    closingIllustrationPrompt:
      "Mara in a blooming rose garden at golden hour, thorns loosened into heart shapes, restored prince planting flowers beside her, castle soft in the distance, magical peaceful storybook ending.",
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
    coverPrompt:
      "Front cover portrait: a bright coral undersea princess singing with bubbles rising like musical notes, gentle rays of warm light from above the waves, teal and gold storybook cover with open space along the top for a title.",
    useDefaultCoverPath: true,
    generationSeed:
      "Create an original sea-princess fairy tale for children where longing, song, and wonder point toward Jesus as Living Water instead of toward self-saving magic.",
    closingPrayer:
      "Dear Jesus, You are the living water my heart needs. Quiet the storms inside me, help me listen for Your voice, and fill me with Your peace. Amen.",
    closingIllustrationPrompt:
      "Liora at a glowing shore where ocean meets a garden spring, hands open in worship, warm light from above the waves, bubbles of light rising, cinematic peaceful storybook ending.",
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
    "For every page, include one scene description for illustration, one spiritual thread, and a parent note.",
    "Wrap each page scene with the Lilly Storybook Art Bible and character model sheet.",
    "Use original wording and avoid copying protected modern adaptations.",
  ].join(" ");
}
