import type { ChildrenBook } from "@/lib/children-books/storybook";

/**
 * Lilly, Anna, and Elsa: The Treasure of the King's Heart
 * A Lilly's Adventures picture book about gratitude, God's wisdom, and the
 * truth that a family's greatest inheritance is love, kindness, courage, and
 * obedience — not gold. Lilly wears three different outfits across the story
 * (travelling arrival, a dress-up gown, and an explorer pinafore) and the three
 * girls play dress-up together early on.
 */
export const LILLY_ANNA_ELSA_TREASURE_BOOK: ChildrenBook = {
  slug: "lilly-anna-elsa-treasure",
  title: "Lilly, Anna, and Elsa",
  subtitle: "The Treasure of the King's Heart",
  series: "Lilly's Adventures",
  heroName: "Lilly",
  characterId: "lilly",
  worldId: "arendelle-castle",
  // The story keeps its real names for readers, but the image model refuses to
  // depict protected franchise characters by name, so the prompt-only text uses
  // neutral stand-ins (the visual descriptions carry the actual look).
  promptSafeReplacements: [
    { find: "ARENDELLE", replace: "EVERDALE" },
    { find: "Arendelle", replace: "Everdale" },
    { find: "Anna", replace: "Annie" },
    { find: "Elsa", replace: "Elsie" },
    { find: "Olaf", replace: "Pip" },
    { find: "Sven", replace: "Bramble" },
    { find: "Kristoff", replace: "Nils" },
  ],
  sourceNote:
    "Original Lilly's Adventures picture book about gratitude, God's wisdom, and a family's true inheritance",
  ageRange: "Ages 3-8",
  spiritualFocus:
    "God's wisdom is the greatest treasure; gratitude opens the heart; love, kindness, courage, and obedience become a family's greatest inheritance; trusting the Lord with all your heart",
  summary:
    "Lilly visits Anna and Elsa in Arendelle for a day of dress-up and castle exploring. When she finds a hidden letter left by their parents, the friends follow a trail of clues through the castle and discover that the greatest treasure was never gold — it was the wisdom and love their parents planted in their hearts.",
  coverGradient: "linear-gradient(135deg, #38bdf8 0%, #a5b4fc 55%, #fef9c3 100%)",
  coverPrompt:
    "Premium vertical children's picture-book cover, wide and airy with the castle as the hero of the image. Seen from a gentle distance so the figures are small-to-medium in the frame, Lilly and her two royal friends stand together at the foot of the grand snowy castle steps, turned slightly toward each other as they hold an old ribbon-tied parchment map between them. Lilly (short chestnut curls to her jaw, signature large white bow, powder-blue dress with a cream travelling cape) is in the middle; a cheerful sister with auburn braids in a teal outfit is on one side, and a gentle sister with a platinum-blonde side braid in an ice-blue gown on the other. A little friendly snowman and a friendly reindeer stand lower in the scene. Rising high above them is the enormous snow-crowned castle with tall towers and waving banners over a calm blue fjord; drifting snow catches the clear light. Keep generous pale sky and open snow around the figures. Bright, airy, clean 2D-animation storybook style, high-key ice-blue and porcelain-white palette with limited clean gold. Leave clear open space along the top for the title and near the bottom for the subtitle. No text, logos, watermarks, or borders in the artwork.",
  useDefaultCoverPath: true,
  generationSeed:
    "Produce Lilly, Anna, and Elsa: The Treasure of the King's Heart as an illustrated Lilly's Adventures picture book. Primary lesson: God's wisdom is the greatest treasure, and love, kindness, courage, and obedience are a family's greatest inheritance. Primary Scripture: Trust in the Lord with all your heart (Proverbs 3:5-6). Keep the lesson inside the adventure; Lilly is a kind friend who notices small things, not a lecturer. Spiritual guidance is shown through prayer, gratitude, tender remembering, wise words carved by loving parents, and changed hearts — never through visible spirits, ice magic, or glowing energy. Give Lilly a couple of different outfits across the story and include a joyful dress-up scene with Anna and Elsa. Every castle scene stays bright, clean, and safe for preschoolers.",
  supportingCastPrompt: `SUPPORTING CAST, OUTFIT & PROP CONTINUITY (keep identical across every page)

Anna: cheerful, warm young woman; strawberry-blonde/auburn hair in two neat braids; light freckles; everyday outfit is a teal-and-black bodice, black skirt, and teal cape; bubbly, loving, affectionate. Original storybook interpretation — do not reproduce any existing film frame or studio character design.

Elsa: gentle, graceful older sister; platinum-blonde hair in a soft side braid; calm kind eyes; everyday outfit is an elegant ice-blue gown with a pale cape; warm, reassuring, tender. Original storybook interpretation — do not reproduce any existing film frame or studio character design.

Olaf: small friendly snowman — three round white snow segments, two thin twig arms, a stubby carrot nose, three dark round coal buttons, three little twig hairs, big goofy happy smile; gentle comic relief. Original interpretation only.

Sven: large friendly reindeer — warm brown coat, tan face and muzzle, small branching antlers, big expressive dark eyes; loyal and playful. Original interpretation only.

Kristoff: kind young mountain man — tousled blond hair, sturdy tan-and-brown winter tunic, warm easygoing laugh. Original interpretation only.

LILLY OUTFIT CONTINUITY (she changes clothes three times — keep each look consistent within its scenes):
• OUTFIT A — Travelling Arrival: powder-blue dress with a cream knee-length hooded travelling cape and small brass clasp, white tights, little boots, signature large white bow. Used for the arrival and welcome pages.
• OUTFIT B — Dress-Up Gown: a borrowed play princess gown in ice-blue and silver-white with a soft sash and a small felt/paper crown, worn over her dress for the dress-up scenes only. Anna and Elsa also wear playful dress-up gowns and paper crowns in those scenes.
• OUTFIT C — Explorer Pinafore: a comfy sage-green pinafore dress over a cream long-sleeve blouse, white tights, little boots, a small canvas satchel across her body, signature large white bow. Used for hide-and-seek, the whole treasure hunt, the staircase, the chamber, and the ending — practical for climbing stairs and carrying a lantern.

Lilly's hair is ALWAYS her short chestnut curls ending around the ears and jaw with her signature large white bow — never long or shoulder-length, in every outfit.

PROP CONTINUITY (identical whenever shown):
• Ribbon-tied parchment — aged cream paper wrapped in a faded blue ribbon; the front reads exactly: FOR OUR BELOVED DAUGHTERS, WHEN THE TIME IS RIGHT
• The letter inside reads exactly: THE GREATEST TREASURE WE LEAVE YOU IS NOT MADE OF GOLD. FOLLOW THE CLUES, AND YOU'LL UNDERSTAND.
• A little hand-drawn treasure map with a tiny drawn crown at the bottom
• Engraved wooden kitchen spoon: SERVE OTHERS WITH JOY
• The King's leather Bible with a few verses marked in gold ink
• Engraved metal shield: PROTECT THOSE WHO CANNOT PROTECT THEMSELVES
• Garden clue plaque: HOPE GROWS WHERE LOVE IS PLANTED
• An old wooden music box (same design each time)
• Enormous grandfather clock; clue reads: TIME IS ONE OF GOD'S GREATEST GIFTS. SPEND IT LOVING PEOPLE.
• Matching hand-lanterns for the underground passage
• Ancient handleless gold door carved: ONLY THANKFUL HEARTS MAY ENTER
• Carved gold treasure chest (same design each time)
• Handmade dollhouse that is a tiny replica of the Arendelle castle
• Thick leather book lettered on the cover: FOR ANNA AND ELSA — OUR GREATEST TREASURE

COMPOSITION SAFETY (apply to every page)
Stage the characters at a comfortable medium or wide distance so faces are small-to-medium in the frame; keep clear breathing room between characters and avoid extreme close-ups or tight clusters of several faces pressed together. Favor full-figure or three-quarter staging with generous pale negative space and airy backgrounds. Groups should feel open and spacious, never crowded edge-to-edge.

IMAGE CONTINUITY RULES
1. Lilly's face and short curls remain consistent on every page.
2. Anna's braids/streak/outfit and Elsa's braid/gown stay consistent across pages.
3. Follow the Lilly outfit plan above for each scene.
4. Do NOT add wings, wands, spell effects, ice magic, glowing energy, or supernatural creatures. The gold door simply swings open gently when they give thanks.
5. Do NOT place written words inside illustrations except the specific engraved/handwritten prop text listed above when a scene requests it; keep any such lettering simple and legible.
6. Leave appropriate negative space for story text matching each page layout.
7. Keep all scenes emotionally safe for preschool children; snow and whites stay truly white.`,
  useDefaultImagePaths: true,
  useDefaultClosingImagePath: true,
  closingPrayer:
    "Dear God, thank You for the people who love me and for Your Word that lasts forever. Help me trust You with all my heart. Teach me to serve others with joy, to be brave and gentle, and to be thankful for every gift You give. Help me remember that the greatest treasure is knowing and loving You. Amen.",
  closingIllustrationPrompt:
    "Lilly, Anna, and Elsa sit close together on a window seat in a bright castle hall, the leather book of letters and the little parchment map resting on their laps, hands folded in a gentle thankful prayer. Olaf and Sven rest peacefully nearby. Snowy mountains and the calm fjord glow softly through the tall window in clear pale daylight. Lilly wears her sage-green explorer pinafore with her white bow. Leave broad clean space above them for prayer text. Soft, comforting storybook ending — no text in the artwork.",
  pages: [
    {
      title: "An invitation to Arendelle",
      body:
        "A special invitation arrived for Lilly.\n\n\"Come visit us in Arendelle!\"\n\nWhen she stepped off the little boat, Lilly looked up and up and up.\n\nA giant castle rose high above the shining fjord, its towers reaching into the clouds.",
      scriptureThread: "God fills His world with wonder and welcome.",
      picturePrompt:
        "Wide establishing shot. Lilly stands small at the bottom of grand snowy castle steps beside the calm blue fjord, gazing up in amazement at an enormous snow-crowned castle with tall towers, waving banners, and drifting snowflakes that catch the clear light like tiny crystals. Lilly wears Outfit A: powder-blue dress with cream hooded travelling cape and her white bow. A little sailing boat rests at the dock behind her, pine mountains beyond. Bright, airy, high-key ice-blue and white palette. Leave open sky in the upper-left for text.",
      palette: "dawn",
      symbol: "crown",
      layout: "full-spread",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "A joyful welcome",
      body:
        "Olaf raced down the steps to greet her.\n\nSven nudged her shoulder with his soft nose.\n\nKristoff laughed as Anna ran down the castle stairs and wrapped Lilly in a huge hug.\n\nElsa welcomed her with a warm, gentle smile.",
      scriptureThread: "Friends are one of God's kindest gifts.",
      picturePrompt:
        "Joyful welcome on the snowy castle steps. Olaf the little snowman races toward Lilly with arms wide; Sven the reindeer nudges her shoulder; Kristoff laughs nearby; Anna (auburn braids, teal outfit) hugs Lilly warmly; Elsa (platinum side braid, ice-blue gown) smiles gently with an open hand of welcome. Lilly wears Outfit A (powder-blue dress, cream cape, white bow). Everyone shows immediate warmth. Bright clean daylight, castle doors open behind them. Leave text space along the top.",
      palette: "royal",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The dress-up trunk",
      body:
        "\"Before we explore,\" Anna said, \"let's play dress-up!\"\n\nElsa opened an enormous wardrobe.\n\nOut spilled sparkling gowns, feathered hats, flowing capes, ribbons, and little paper crowns.\n\nLilly gasped with delight.",
      scriptureThread: "Joy and play are gifts to share together.",
      picturePrompt:
        "Bright bedroom scene. Elsa opens a tall carved wardrobe overflowing with playful gowns, feathered hats, capes, ribbons, and little paper crowns. Anna holds up two gowns excitedly. Lilly, still in Outfit A, presses her hands to her cheeks in delight. Olaf tries a floppy feathered hat that slides over his carrot nose for comic effect. Pale walls, tall window with snowy mountains, clean high-key palette. Leave open space in the upper-right for text.",
      palette: "royal",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Twirl like royalty",
      body:
        "The three friends twirled in front of tall mirrors.\n\nLilly wore a shimmering ice-blue gown and a little crown.\n\nAnna spun until her cape swirled.\n\nElsa curtsied like a real queen.\n\nAnd they laughed and laughed.",
      scriptureThread: "A cheerful heart is like good medicine.",
      picturePrompt:
        "Playful dress-up scene before tall mirrors. Lilly wears Outfit B: a shimmering ice-blue and silver-white play gown with a soft sash and a small paper crown over her white bow, twirling happily; her short chestnut curls stay short. Anna twirls in a playful dress-up gown with her cape swirling; Elsa curtsies gracefully in a sparkly dress-up gown and paper crown. Mirrors reflect their joy. Olaf claps his twig arms and Sven peeks through the doorway. Bright airy room, ice-blue and blush palette. Leave text space along the bottom.",
      palette: "royal",
      symbol: "crown",
      layout: "full-spread",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Time to explore",
      body:
        "When the giggles finally settled, the friends changed into comfy clothes.\n\n\"Now,\" said Elsa, \"let's explore the whole castle together.\"\n\n\"Hide-and-seek first!\" cried Anna.\n\nNone of them knew they were about to uncover a secret hidden for many years.",
      scriptureThread: "God often hides good surprises inside ordinary days.",
      picturePrompt:
        "A bright grand castle hall with tall arched windows. Lilly (now in Outfit C: sage-green pinafore over a cream blouse, small canvas satchel, white bow) stands ready to play with Anna and Elsa. Anna points playfully toward a corridor for hide-and-seek; Elsa smiles. Olaf and Sven join eagerly. Pale stone, clean daylight, snowy peaks through the windows. Leave open space in the upper-left for text.",
      palette: "dawn",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The loose stone",
      body:
        "While everyone counted for hide-and-seek, Lilly tiptoed into one of the oldest towers.\n\nSomething small was fluttering behind a loose stone in the wall.\n\nShe leaned closer.\n\nWhat could it be?",
      scriptureThread: "God helps us notice the small things others miss.",
      picturePrompt:
        "Inside an old stone castle tower with a narrow arched window and soft pale light. Lilly (Outfit C, sage-green pinafore, satchel, white bow) crouches curiously by the wall, peering at a small corner of aged paper fluttering behind a slightly loose stone. Dust motes drift in the light. Quiet, cool, curious mood — not scary. Leave text space on the right.",
      palette: "starlight",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "An old parchment",
      body:
        "Carefully, Lilly reached in.\n\nShe pulled out an old parchment wrapped with a faded blue ribbon.\n\nAcross the front, in beautiful handwriting, were the words:\n\n\"For our beloved daughters, when the time is right.\"\n\nLilly's eyes grew wide.",
      scriptureThread: "Words of love can wait quietly for exactly the right day.",
      picturePrompt:
        "Close, tender moment. Lilly (Outfit C) holds an aged cream parchment tied with a faded blue ribbon; on the front, simple legible handwriting reads exactly: FOR OUR BELOVED DAUGHTERS, WHEN THE TIME IS RIGHT. Her eyes are wide with wonder. Soft pale tower light. The lettering is the only text in the image and must be clear. Leave text space in the upper-left.",
      palette: "starlight",
      symbol: "crown",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "She runs to find them",
      body:
        "Lilly forgot all about hide-and-seek.\n\nShe held the parchment close and hurried through the halls.\n\n\"Anna! Elsa!\" she called. \"Come quickly — I found something!\"",
      scriptureThread: "Good news is meant to be shared.",
      picturePrompt:
        "Lilly (Outfit C, satchel bouncing) runs down a bright grand castle corridor holding the ribbon-tied parchment carefully in both hands, calling out with excitement. Tall windows show the snowy fjord. Anna and Elsa appear ahead, turning toward her with curious smiles. Clean daylight, pale stone and ice-blue banners. Leave text space in the upper-right.",
      palette: "royal",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Trembling hands",
      body:
        "Anna gently unfolded the letter with trembling hands.\n\nInside was only one sentence:\n\n\"The greatest treasure we leave you is not made of gold. Follow the clues, and you'll understand.\"\n\nElsa pressed a hand to her heart.",
      scriptureThread: "The best treasures are not made of gold.",
      picturePrompt:
        "Three friends gathered close in a quiet, bright hall. Anna (auburn braids) gently unfolds the aged letter with trembling, careful hands; Elsa (platinum braid) rests a hand on her own heart, eyes soft. Lilly (Outfit C) leans in between them. The open letter shows one legible handwritten line: THE GREATEST TREASURE WE LEAVE YOU IS NOT MADE OF GOLD. FOLLOW THE CLUES, AND YOU'LL UNDERSTAND. Tender, emotional, safe. Leave text space at the top.",
      palette: "starlight",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "A crown and a little map",
      body:
        "At the very bottom of the letter, Mom and Dad had drawn a tiny crown.\n\nAnd beside the crown was a little map.\n\nAnna and Elsa looked at each other.\n\n\"The treasure hunt,\" whispered Anna, \"has begun.\"",
      scriptureThread: "God guides us one step, one clue, at a time.",
      picturePrompt:
        "Close-up of three pairs of hands holding the letter and a little hand-drawn treasure map. At the bottom of the letter is a small, simple drawn crown; beside it the folded map shows tiny castle rooms and a dotted path. Lilly (Outfit C), Anna, and Elsa lean over it together with bright, hopeful faces. Clean pale daylight. Keep only the drawn crown and map marks — no other text. Leave space along the bottom for text.",
      palette: "royal",
      symbol: "crown",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Royal Kitchen",
      body:
        "The first clue led to the royal kitchen.\n\nThere they found an old wooden spoon engraved with three words:\n\n\"Serve others with joy.\"\n\nAnna smiled softly. \"Mother always served everyone before herself.\"\n\n\"Loving people,\" Lilly said, \"often begins with serving them.\"",
      scriptureThread: "Serve others with joy.",
      picturePrompt:
        "A warm, bright royal castle kitchen with pale walls, copper pots, and a sunny window. Lilly (Outfit C) holds up an old wooden spoon engraved with the legible words SERVE OTHERS WITH JOY. Anna touches her heart, remembering her mother; Elsa smiles gently beside her. Olaf peeks over the counter. Clean daylight, no amber wash. The engraved spoon text is the only lettering. Leave text space in the upper-left.",
      palette: "home-daylight",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Library",
      body:
        "The next clue waited in the library.\n\nWhen Elsa tilted an old candlestick, a tall bookshelf slid aside.\n\nBehind it rested the King's favorite Bible, with special verses marked in gold.\n\n\"God's wisdom lasts forever,\" said Lilly, \"even when people leave this earth.\"",
      scriptureThread: "God's wisdom lasts forever.",
      picturePrompt:
        "A grand two-story castle library with tall shelves and soft pale light. A large bookshelf has slid aside to reveal a hidden nook holding an open leather Bible with a few verses marked in gold ink. Elsa stands by an old candlestick lever; Lilly (Outfit C) and Anna gaze in wonder at the Bible. Sven's antlers peek through the doorway. Bright, airy, clean palette. Keep lettering minimal and unreadable except the sense of marked verses. Leave text space on the right.",
      palette: "royal",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Armory",
      body:
        "In the armory, Kristoff lifted down an old shield.\n\nInstead of \"Fight harder,\" it read:\n\n\"Protect those who cannot protect themselves.\"\n\n\"True strength,\" Lilly reminded everyone, \"is gentle.\"",
      scriptureThread: "True strength protects and is gentle.",
      picturePrompt:
        "A castle armory lined with polished shields and helmets, cool pale light from high windows. Kristoff holds down a round engraved metal shield so the friends can read it; the legible words read PROTECT THOSE WHO CANNOT PROTECT THEMSELVES. Lilly (Outfit C), Anna, and Elsa look on thoughtfully. The shield text is the only lettering. Bright, clean, not dark or scary. Leave text space in the upper-left.",
      palette: "royal",
      symbol: "shield",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Garden",
      body:
        "In the walled winter garden, Elsa stopped still.\n\nTiny flowers were somehow blooming right beneath the snow.\n\nA little plaque nearby read:\n\n\"Hope grows where love is planted.\"\n\nAnna smiled and squeezed her sister's hand.",
      scriptureThread: "Hope grows where love is planted.",
      picturePrompt:
        "A serene walled castle garden dusted with clean white snow, pale stone arches, clear pale-blue sky. A cluster of delicate flowers blooms bravely up through the snow beside a small stone plaque reading the legible words HOPE GROWS WHERE LOVE IS PLANTED. Elsa (ice-blue gown) gazes softly; Anna squeezes her hand; Lilly (Outfit C) crouches to admire the flowers. Snow stays truly white. Leave text space in the upper-right.",
      palette: "garden",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Music Room",
      body:
        "In the music room, Olaf bumped an old music box.\n\nIt began to play a soft lullaby — the very song their mother used to sing.\n\nAnna's eyes filled with quiet tears.\n\nLilly hugged her without saying a word.\n\nSometimes love does not need many words.",
      scriptureThread: "Love can comfort without any words at all.",
      picturePrompt:
        "A tender music room with a piano, soft draperies, and pale window light. An old open wooden music box plays; Olaf stands beside it looking gently sorry. Anna (auburn braids) has quiet tears on her cheeks; Lilly (Outfit C) wraps her in a comforting hug; Elsa rests a hand on Anna's shoulder. Emotional but safe and warm. Cool-neutral, clean light — no amber. Leave text space at the top.",
      palette: "starlight",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Clock Tower",
      body:
        "High in the clock tower, Sven sniffed an enormous grandfather clock.\n\nTucked inside was the next clue:\n\n\"Time is one of God's greatest gifts. Spend it loving people.\"\n\nLilly thought of Mama and Daddy back home, and hugged the little card close.",
      scriptureThread: "Time is one of God's greatest gifts.",
      picturePrompt:
        "Inside a bright clock tower with an enormous ornate grandfather clock and a round window showing snowy peaks. Sven the reindeer has nosed open a little door in the clock, revealing a clue card that legibly reads TIME IS ONE OF GOD'S GREATEST GIFTS. SPEND IT LOVING PEOPLE. Lilly (Outfit C) holds the card thoughtfully; Anna and Elsa lean in. The clue card text is the only lettering. Clean, airy, high-key. Leave text space in the upper-left.",
      palette: "royal",
      symbol: "crown",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Secret Staircase",
      body:
        "Behind a heavy tapestry, the map pointed to a winding staircase.\n\nIt spiraled far, far beneath the castle.\n\nEveryone carried a lantern.\n\nThe air grew cooler.\n\nThe mystery grew bigger.",
      scriptureThread: "Courage means taking the next step, together.",
      picturePrompt:
        "A pulled-back stone tapestry reveals a winding spiral staircase descending deep beneath the castle. Lilly (Outfit C), Anna, and Elsa each carry a glowing hand-lantern as they step down carefully together; Olaf and Sven follow. Cool pale-blue stone, soft lantern light, gentle adventurous mood — mysterious but safe, never frightening. Leave open space in the upper-left for text.",
      palette: "starlight",
      symbol: "light",
      layout: "full-spread",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Final Door",
      body:
        "At the very bottom stood an ancient golden door.\n\nIt had no handle at all.\n\nCarved above it were the words:\n\n\"Only thankful hearts may enter.\"\n\nThe friends looked at one another.",
      scriptureThread: "Gratitude opens what force cannot.",
      picturePrompt:
        "At the bottom of the stairs stands a tall ancient gold door set in pale stone, with NO handle. Carved above it, the legible words read ONLY THANKFUL HEARTS MAY ENTER. Lilly (Outfit C), Anna, and Elsa stand before it holding lanterns, thoughtful and a little awed. The polished gold door catches soft light while the whites and pale stone stay clean and bright. The carved words are the only lettering. Leave text space in the upper-right.",
      palette: "royal",
      symbol: "shield",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Thankful hearts",
      body:
        "Instead of pushing and pulling, Lilly said,\n\n\"Let's thank God for everything He's given us.\"\n\nEveryone joined hands.\n\nThey thanked God for family, for memories, for friendship, and for love.",
      scriptureThread: "Give thanks to the Lord, for He is good.",
      picturePrompt:
        "Lilly (Outfit C), Anna, and Elsa stand in a small circle holding hands with their heads gently bowed in a simple, sincere thankful prayer before the gold door; lanterns rest at their feet. Olaf and Sven wait quietly nearby. Soft pale light, peaceful and reverent — no visible spirits or glowing energy, just gentle warmth in their faces. Leave clean space above them for text.",
      palette: "starlight",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The door opens",
      body:
        "Slowly...\n\nquietly...\n\nthe great door swung open all by itself.\n\nGolden light spilled out across the stone.\n\nThe friends stepped inside.",
      scriptureThread: "God welcomes the grateful in.",
      picturePrompt:
        "The tall ancient gold door swings gently open on its own, and clean bright light with soft gold reflections spills out across the pale stone passage toward Lilly (Outfit C), Anna, and Elsa, who step forward in wonder holding their lanterns. No magical energy or sparks — simply a door opening and light beyond. Bright and hopeful, whites stay white. Leave open space in the upper-left for text.",
      palette: "royal",
      symbol: "light",
      layout: "full-spread",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The Treasure Chamber",
      body:
        "The room shone with soft golden light.\n\nJeweled crowns, beautiful paintings, and ancient maps filled every shelf.\n\nBut something felt different to Lilly.\n\nNone of it felt like the real treasure.\n\nIn the very center sat a beautifully carved golden chest.",
      scriptureThread: "The real treasure is easy to walk right past.",
      picturePrompt:
        "A grand underground treasure chamber, bright and airy rather than dark: pale stone walls, jeweled crowns, framed paintings, and rolled ancient maps on shelves, jewels catching gentle light. Lilly (Outfit C), Anna, and Elsa stand in awe. In the center, on a low pedestal, sits a beautifully carved gold treasure chest. Clean high-key palette with limited gold accents; whites and pale stone stay bright. Leave text space at the top.",
      palette: "royal",
      symbol: "crown",
      layout: "full-spread",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The golden chest",
      body:
        "Anna knelt down and slowly lifted the lid.\n\nEveryone leaned in close.\n\nInside the great golden chest were only two things.",
      scriptureThread: "What matters most often comes quietly.",
      picturePrompt:
        "Close scene. Anna (auburn braids) kneels and slowly lifts the carved lid of the gold treasure chest; Lilly (Outfit C) and Elsa lean in close with held breath and hopeful faces. Soft light glows from within the chest onto their faces without any magical sparks. Olaf peeks between them. Bright, tender, clean palette. Leave text space in the upper-right.",
      palette: "royal",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Treasure One: the dollhouse",
      body:
        "First was a magnificent handmade dollhouse — a tiny Arendelle castle.\n\nEvery room had little furniture, little books, little paintings, and little blankets.\n\n\"Mom built this,\" Anna whispered.\n\nElsa smiled through happy tears. \"And Dad made all the little furniture.\"",
      scriptureThread: "Love is often built by patient, unseen hands.",
      picturePrompt:
        "A beautiful handmade dollhouse that is a tiny detailed replica of the Arendelle castle, its front open to reveal little rooms with tiny furniture, tiny books, tiny paintings, and tiny blankets. Anna (auburn braids) touches it with wonder; Elsa (ice-blue gown) smiles with gentle happy tears; Lilly (Outfit C) kneels beside them admiring the tiny details. Bright, warm-hearted, clean daylight feel. Leave text space at the top.",
      palette: "royal",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Treasure Two: the letters",
      body:
        "Beneath the dollhouse rested a thick leather book.\n\nGold letters on the cover read: \"For Anna and Elsa — Our Greatest Treasure.\"\n\nInside were dozens of handwritten letters — one for lonely days, one for brave choices, one for forgiving, one that simply said, \"Read this whenever you miss us.\"",
      scriptureThread: "God's love is written into every day we face.",
      picturePrompt:
        "Anna and Elsa hold open a thick leather-bound book on their laps; its cover legibly reads FOR ANNA AND ELSA — OUR GREATEST TREASURE in gold letters. Inside are many folded handwritten letters, a few fanned out. Elsa reads softly; Anna holds one to her heart; Lilly (Outfit C) sits close beside them, moved. Bright, tender, clean palette. The cover title is the only clear lettering. Leave text space in the upper-left.",
      palette: "dawn",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "What their parents wanted",
      body:
        "Anna closed the book and hugged Lilly tightly.\n\n\"If you hadn't noticed that little letter, we never would have found this.\"\n\nElsa nodded. \"You didn't just help us find treasure. You helped us remember what our parents wanted us to become.\"",
      scriptureThread: "A thankful helper leaves a lasting gift.",
      picturePrompt:
        "Warm group embrace in the bright chamber. Anna (auburn braids) hugs Lilly (Outfit C) tightly with grateful tears of joy; Elsa (ice-blue gown) leans in with a gentle hand on them both, the leather book of letters held close. Olaf and Sven watch happily nearby. Emotional, safe, tender; clean high-key light. Leave text space in the upper-right.",
      palette: "dawn",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The greatest treasure",
      body:
        "Lilly grinned. \"The greatest treasure was never hidden in the chest.\n\nIt was hidden in your parents' hearts all along.\"\n\nAs they climbed back up the stairs together, the castle felt warmer than before — not because of magic, but because love, gratitude, and God's truth had been rediscovered.",
      scriptureThread: "Wisdom and love are treasures that can never be lost.",
      picturePrompt:
        "The friends climb back up the winding stone stairs toward bright daylight, faces glowing with joy. Lilly (Outfit C) walks between Anna and Elsa, all three arm in arm and smiling; Anna carries the leather book of letters; Olaf and Sven follow happily. Clean pale light pours down from above, the castle feeling bright and full of love. Leave open space in the upper-left for text.",
      palette: "dawn",
      symbol: "crown",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Lilly's Treasure",
      body:
        "God's wisdom is the greatest treasure of all.\n\nGold can be spent, and jewels can be lost.\n\nBut love, kindness, courage, and obedience become a family's greatest inheritance.\n\nAnd when we thank God with all our hearts, He opens beautiful things before us.",
      scriptureThread: "The greatest inheritance is love, wisdom, and faith.",
      picturePrompt:
        "A softly decorated keepsake scene: the little parchment map, the faded blue ribbon, and the leather book of letters rest on a pale window seat beside a small drawing Lilly made of herself with Anna, Elsa, Olaf, and Sven. Snowy mountains glow gently through the tall window in clear pale daylight. No people in frame. Broad clean space for text.",
      palette: "starlight",
      symbol: "light",
      layout: "text-pocket",
      presentCharacterIds: [],
    },
    {
      title: "God's Word for Lilly",
      body:
        "\"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.\"\n\n— Proverbs 3:5-6",
      scriptureThread: "Trust in the Lord with all your heart. — Proverbs 3:5-6",
      picturePrompt:
        "Lilly (Outfit C), Anna, and Elsa sit together on a bright window seat overlooking the snowy fjord, the King's leather Bible open gently on Lilly's lap as they read together. Peaceful, reflective, clean pale daylight with broad negative space for a Scripture verse. No other text in the artwork.",
      palette: "royal",
      symbol: "light",
      layout: "text-pocket",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Talk About the Treasure",
      body:
        "1. Where did Lilly find the hidden letter?\n2. What did each clue teach Anna and Elsa about their parents?\n3. Why did the golden door only open for thankful hearts?\n4. What were the two treasures inside the chest?\n5. Why was that better than gold and jewels?\n6. What are some treasures God has given your family?\n\nPractice phrase:\n\"Thank You, God, for everything You've given us.\"\n\nTreasure-hunt habits:\nServe others with joy.\nBe gentle and brave.\nSpend time loving people.\nTrust God with all your heart.",
      scriptureThread: "Families can hunt for God's treasures together.",
      picturePrompt:
        "A soft decorative border on cream paper: a tiny drawn crown, a little faded-blue ribbon, a small key, a snowflake, and a miniature castle in the corners — minimal illustration framing for a parent conversation page. Broad clean open space for text. Calm, warm, preschool-safe, high-key palette.",
      palette: "dawn",
      symbol: "heart",
      layout: "text-only",
      presentCharacterIds: [],
    },
  ],
};
