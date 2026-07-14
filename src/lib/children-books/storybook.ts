import type { CharacterBibleId } from "@/lib/children-books/characterBibles";
import type { WorldBibleId } from "@/lib/children-books/worldBibles";

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
  /** Display name in prompts (defaults to character bible name / Lilly). */
  heroName?: string;
  /** Layer 3 — Character Bible id (unique casting). */
  characterId?: CharacterBibleId;
  /** Layer 2 — World Bible id (story setting). */
  worldId?: WorldBibleId;
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
    characterId: "lilly",
    worldId: "european-kingdom",
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
          "Lilly seated calmly in a humble cottage as a sparkling shoe fits her foot, villagers and servants smiling nearby with warm morning light.",
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
    slug: "aurora-perfect-protection",
    title: "Aurora: God's Perfect Protection",
    heroName: "Aurora",
    characterId: "aurora",
    worldId: "woodland-dawn",
    sourceNote: "Original faith retelling inspired by public-domain sleeping-princess fairy tales",
    ageRange: "Ages 4-8",
    spiritualFocus: "God's protection, prayer, courage, family, kindness, and trust over fear",
    summary:
      "Aurora learns that God hears prayer, watches over His children, and is stronger than every plan meant for harm.",
    coverGradient: "linear-gradient(135deg, #4f46e5 0%, #f59e0b 100%)",
    coverPrompt:
      "Front cover portrait: Princess Aurora with kind expressive eyes in a soft dawn-gold gown, standing near a sunlit castle window with forest, river, and morning light behind her, a peaceful shield-shaped glow of sunlight in the composition, no magic, elegant storybook cover with open space along the top for a title.",
    useDefaultCoverPath: true,
    generationSeed:
      "Use the Aurora faith retelling as a children's picture book about God's perfect protection, prayer, courage, kindness, family reunion, and the truth that we trust God instead of pretend magic.",
    useDefaultImagePaths: true,
    useDefaultClosingImagePath: true,
    closingPrayer:
      "Dear Jesus, thank You for watching over me wherever I go. Help me pray first, trust Your promises, choose courage, and remember that Your protection is forever. Amen.",
    closingIllustrationPrompt:
      "Aurora standing with her family at a sunlit castle window, hands folded in thankful prayer, forest and river glowing at dawn beyond them, a gentle shield-shaped light in the sky, peaceful storybook ending.",
    pages: [
      {
        title: "A kingdom that prayed",
        body:
          "Long ago, in a beautiful kingdom nestled between green forests and sparkling rivers, there lived a kind king and queen who loved God with all their hearts. For many years they prayed for a child.",
        scriptureThread: "God hears the prayers of families who wait on Him.",
        picturePrompt:
          "A kind king and queen kneeling together in a warm chapel at sunrise, castle windows opening toward green forests and sparkling rivers.",
        palette: "dawn",
        symbol: "crown",
      },
      {
        title: "The first light of dawn",
        body:
          "Every morning they asked, 'Lord, if it is Your will, bless us with a son or daughter whom we can teach to know and love You.' One spring morning, a beautiful baby girl was born. They named her Aurora, because she reminded them of the first light of dawn.",
        scriptureThread: "Children are precious gifts from the Lord.",
        picturePrompt:
          "A joyful king and queen holding baby Aurora near an open castle window as soft spring dawn light fills the nursery.",
        palette: "dawn",
        symbol: "light",
      },
      {
        title: "Prayers around the cradle",
        body:
          "The whole kingdom celebrated and thanked God for the precious little girl. Flora prayed for kindness, Fauna prayed for joy, and Merryweather prayed, 'Protect this little girl all the days of her life, and remind her that You are always with her.'",
        scriptureThread: "Faithful prayers surround children with love.",
        picturePrompt:
          "Three beloved wise women praying beside baby Aurora's cradle in a candlelit castle hall while families celebrate gently in the background.",
        palette: "royal",
        symbol: "heart",
      },
      {
        title: "The jealous guest",
        body:
          "Just then, the great castle doors burst open. Maleficent stood there with jealous eyes. Pride had slowly filled her heart, and she became angry whenever others were blessed.",
        scriptureThread: "Pride and jealousy lead hearts away from joy.",
        picturePrompt:
          "A proud woman in dark medieval robes standing in open castle doors, jealous and lonely, while a joyful celebration grows quiet.",
        palette: "starlight",
        symbol: "shield",
      },
      {
        title: "A warning and a choice",
        body:
          "The king stepped forward and said, 'Maleficent, there is still time to turn away from your anger.' But she refused. She pointed toward Aurora and warned that before the princess's sixteenth birthday ended, she would touch a spinning wheel and fall into a deep sleep.",
        scriptureThread: "God invites angry hearts to turn back before harm grows.",
        picturePrompt:
          "The king speaking with calm courage in a palace hall as the queen holds baby Aurora close and the proud woman refuses his warning.",
        palette: "royal",
        symbol: "shield",
      },
      {
        title: "God is greater",
        body:
          "Fear filled the room, but Merryweather took the king's hand and whispered, 'Do not fear. God is greater than every plan of evil.' Then she prayed, 'Lord, what others mean for harm, You are able to turn for good. We trust You.'",
        scriptureThread: "God can turn harm toward good for those who trust Him.",
        picturePrompt:
          "Merryweather praying beside the king and queen in a hushed castle hall, warm light falling across baby Aurora and the gathered people.",
        palette: "dawn",
        symbol: "light",
      },
      {
        title: "The forest cottage",
        body:
          "The king ordered every spinning wheel destroyed, yet they knew Maleficent would not easily give up. Flora, Fauna, and Merryweather took Aurora to live in a small cottage deep in the forest until she was grown.",
        scriptureThread: "Wise protection can be an act of faithful love.",
        picturePrompt:
          "Three wise women carrying baby Aurora along a forest path toward a warm cottage, distant castle towers behind them at sunset.",
        palette: "garden",
        symbol: "shield",
      },
      {
        title: "A parent's prayer",
        body:
          "It was the hardest decision the king and queen had ever made. As their little girl rode away, the queen wiped away tears and prayed, 'Lord, watch over our daughter until we hold her again.'",
        scriptureThread: "God watches children when parents cannot hold them close.",
        picturePrompt:
          "The king and queen standing on castle steps with tearful hope, watching a carriage disappear toward the forest in golden evening light.",
        palette: "starlight",
        symbol: "heart",
      },
      {
        title: "Morning and evening prayers",
        body:
          "Aurora grew into a cheerful young girl. She thought Flora, Fauna, and Merryweather were simply her loving aunts. Every morning they thanked God for another day, and every evening ended with prayer.",
        scriptureThread: "Daily prayer teaches a child to trust God's care.",
        picturePrompt:
          "Young Aurora and her three loving aunts gathered around a rustic table in a forest cottage, praying in warm morning light.",
        palette: "dawn",
        symbol: "heart",
      },
      {
        title: "God writes the next page",
        body:
          "Aurora gathered flowers, baked bread, helped neighbors, and cared for injured birds and woodland animals. When she asked why they lived so far away, Flora said, 'God is writing a beautiful story, even when we cannot see the next page.'",
        scriptureThread: "Faith trusts God beyond what we can see.",
        picturePrompt:
          "Aurora in a forest clearing with flowers, fresh bread, and a small injured bird resting safely in her hands, her aunt smiling nearby.",
        palette: "garden",
        symbol: "light",
      },
      {
        title: "Lessons in the hidden years",
        body:
          "Aurora learned that kindness mattered more than beauty. She learned to forgive quickly. She learned that courage meant doing what was right even when it was difficult. Most of all, she learned to trust God.",
        scriptureThread: "God grows courage and kindness in ordinary days.",
        picturePrompt:
          "Aurora helping an elderly neighbor carry a basket near the forest cottage while sunbeams touch wildflowers and woodland animals watch peacefully.",
        palette: "garden",
        symbol: "heart",
      },
      {
        title: "The young traveler",
        body:
          "One sunny afternoon, while singing in the forest, Aurora met a young traveler named Phillip. He was kind, laughed easily, and loved helping others. They walked through the woods and talked about the beauty of God's creation.",
        scriptureThread: "God's creation invites friendship, gratitude, and wonder.",
        picturePrompt:
          "Aurora and Phillip walking through a sunlit forest path beside a sparkling stream, talking kindly among wildflowers and birds.",
        palette: "garden",
        symbol: "light",
      },
      {
        title: "The truth at last",
        body:
          "The day before Aurora's sixteenth birthday, Flora, Fauna, and Merryweather told her, 'You are Princess Aurora.' When Aurora learned her parents were alive and had missed her every day, she whispered, 'They must have missed me so much.'",
        scriptureThread: "Compassion helps us receive hard truth with grace.",
        picturePrompt:
          "Aurora seated in the cottage with her three aunts, receiving surprising news with tearful compassion as afternoon light glows through the window.",
        palette: "dawn",
        symbol: "heart",
      },
      {
        title: "Together again",
        body:
          "That evening they returned to the castle. The king and queen embraced their daughter with tears of joy. For the first time since she was a baby, their family was together again.",
        scriptureThread: "God can restore joy after a long season of waiting.",
        picturePrompt:
          "Aurora embracing the king and queen in a grand castle doorway while lanterns glow and the three wise women watch with joyful tears.",
        palette: "royal",
        symbol: "crown",
      },
      {
        title: "Pray first",
        body:
          "But Maleficent had been waiting. Hidden inside the castle, she led Aurora toward an old forgotten tower where the only spinning wheel left in the kingdom stood beneath a cloth. Aurora reached toward it and remembered, 'When something doesn't feel right, pray first.'",
        scriptureThread: "Prayer should be our first response when something feels wrong.",
        picturePrompt:
          "Aurora standing in an old castle tower before a covered spinning wheel, pausing with eyes closed in prayer as soft light enters a narrow window.",
        palette: "starlight",
        symbol: "shield",
      },
      {
        title: "Not forgotten",
        body:
          "Before Aurora could finish her prayer, her finger touched the spindle and she fell into a peaceful sleep. The queen cried and the king fell to his knees, but Merryweather stood calmly beside Aurora and said, 'God has not forgotten His promise.'",
        scriptureThread: "God's promises stand even when hope looks quiet.",
        picturePrompt:
          "Aurora sleeping peacefully in a tower room as the king kneels, the queen weeps, and Merryweather stands with calm faith in warm window light.",
        palette: "starlight",
        symbol: "light",
      },
      {
        title: "Phillip rides on",
        body:
          "When Phillip heard what had happened, he immediately rode toward the castle. The road became darker and harder with every mile. Maleficent filled the path with thorn bushes and whispered, 'You'll never reach her. Turn back. It's too late.'",
        scriptureThread: "Fear tries to stop courage before the work is done.",
        picturePrompt:
          "Phillip riding a horse along a dark forest road toward distant castle towers, thorn bushes crowding the path under a troubled sky.",
        palette: "starlight",
        symbol: "shield",
      },
      {
        title: "Step by step",
        body:
          "Phillip stopped his horse and bowed his head. 'Lord, give me strength.' Peace filled his heart. He climbed down and began clearing a path through the thorns, step by step and prayer by prayer.",
        scriptureThread: "God gives strength for the next faithful step.",
        picturePrompt:
          "Phillip kneeling in prayer beside his horse, then clearing thorn branches from a forest path as soft dawn light begins to break through.",
        palette: "dawn",
        symbol: "light",
      },
      {
        title: "Whom shall I fear?",
        body:
          "Finally Maleficent stood before him. Her heart had become so consumed with hatred that she seemed as frightening as a great dragon. Phillip remembered God's promise: 'The Lord is my light and my salvation - whom shall I fear?'",
        scriptureThread: "The Lord is our light and salvation, so fear does not rule us.",
        picturePrompt:
          "Phillip standing firm with humble courage before a towering shadow shaped like a dragon, warm heavenly light behind him, no fantasy creature details.",
        palette: "royal",
        symbol: "shield",
      },
      {
        title: "Light overcame darkness",
        body:
          "Phillip stood firm. Maleficent fled. Darkness could not overcome the light of God.",
        scriptureThread: "God's light is stronger than darkness.",
        picturePrompt:
          "A dark shadow retreating from a castle bridge as sunrise pours over Phillip, the thorny path opening toward bright castle doors.",
        palette: "dawn",
        symbol: "light",
      },
      {
        title: "Aurora wakes",
        body:
          "Phillip hurried into the quiet castle and found Aurora sleeping peacefully. He knelt beside her and prayed, 'Lord, thank You for protecting Aurora. Your will be done.' Then he gently kissed her forehead, and Aurora opened her eyes.",
        scriptureThread: "God faithfully keeps His promises in His perfect care.",
        picturePrompt:
          "Phillip kneeling beside sleeping Aurora in a sunlit castle room, praying with gratitude as birds gather outside the window.",
        palette: "dawn",
        symbol: "heart",
      },
      {
        title: "The kingdom rejoiced",
        body:
          "Sunlight poured through the windows. Birds began singing outside. The king and queen rejoiced, and the whole kingdom celebrated, not because of magic, but because God had faithfully kept His promise.",
        scriptureThread: "We give glory to God for rescue and joy.",
        picturePrompt:
          "Aurora reunited with the king, queen, Phillip, and the wise women in a bright castle hall as sunlight streams through tall windows.",
        palette: "royal",
        symbol: "crown",
      },
      {
        title: "Love God first",
        body:
          "Years later, Aurora and Phillip were married. Before the celebration began, they stood together in the castle chapel and prayed, 'Lord, help us love You first. Help us love each other well. Let our family always bring glory to You.'",
        scriptureThread: "A family is strongest when God is loved first.",
        picturePrompt:
          "Aurora and Phillip praying together in a small castle chapel before their wedding celebration, flowers and candles glowing softly.",
        palette: "royal",
        symbol: "heart",
      },
      {
        title: "God was watching",
        body:
          "Aurora became known as a queen who cared for the poor, welcomed strangers, and showed kindness to everyone. When children asked if she was afraid while she slept, she smiled and said, 'I wasn't alone. God was watching over me the whole time.'",
        scriptureThread: "God watches over His children wherever they are.",
        picturePrompt:
          "Queen Aurora welcoming children, travelers, and poor families at a castle garden table with gentle kindness and warm afternoon light.",
        palette: "garden",
        symbol: "crown",
      },
      {
        title: "What is pretend and what is real",
        body:
          "When children asked if magic had saved her, Aurora gently shook her head. 'Magic is only pretend. But God's love, God's protection, and God's promises are forever.' Princesses, castles, dragons, and talking woodland animals make stories fun to imagine, but we trust in God.",
        scriptureThread: "We do not trust in pretend magic; we trust in the living God.",
        picturePrompt:
          "Aurora reading to children in a cozy castle library, a storybook open beside a small wooden castle toy, warm lamplight and peaceful faces.",
        palette: "starlight",
        symbol: "light",
      },
      {
        title: "Psalm 121:8",
        body:
          "What is real? God hears our prayers. God watches over His children. God is stronger than evil. Kindness, courage, and faith honor Him. God keeps His promises, even when we have to wait. 'The Lord will watch over your coming and going both now and forevermore.' - Psalm 121:8",
        scriptureThread: "The Lord will watch over your coming and going both now and forevermore. - Psalm 121:8",
        picturePrompt:
          "An open Bible on Psalm 121:8 beside dawn flowers, a small crown, a shield motif, and a path leading from a forest cottage to a sunlit castle.",
        palette: "dawn",
        symbol: "shield",
      },
    ],
  },
  {
    slug: "garden-of-grace",
    title: "The Garden of Grace",
    heroName: "Mara",
    characterId: "mara",
    worldId: "rose-garden-palace",
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
    useDefaultImagePaths: true,
    useDefaultClosingImagePath: true,
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
    heroName: "Liora",
    characterId: "liora",
    worldId: "coastal-kingdom",
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
    useDefaultImagePaths: true,
    useDefaultClosingImagePath: true,
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
    "Wrap each page scene with Lilly Storybooks studio style, this book's world bible, and this heroine's character bible.",
    "Use original wording and avoid copying protected modern adaptations.",
  ].join(" ");
}
