import type { ChildrenBook } from "@/lib/children-books/storybook";

/**
 * How Mommy and Daddy Met: Before We Knew Your Name
 * A true first-date Memory Book for Lilly — Chattanooga aquarium, sushi,
 * Rembrandt's dessert, and a respectful hand-kiss goodbye — with soft magical
 * friends who teach family virtues while Mommy and Daddy's real story stays true.
 */
export const LILLY_HOW_MOMMY_DADDY_MET_BOOK: ChildrenBook = {
  slug: "lilly-how-mommy-daddy-met",
  title: "How Mommy and Daddy Met",
  subtitle: "Before We Knew Your Name",
  series: "Lilly's Adventures",
  heroName: "Lilly",
  characterId: "lilly",
  worldId: "chattanooga-memory-book",
  castIds: ["tish", "andrew", "winston"],
  characterIds: ["lilly", "tish", "andrew", "winston"],
  sourceNote:
    "Original Lilly's Adventures Memory Book based on Mommy and Daddy's true first date in Chattanooga",
  ageRange: "Ages 3-7",
  spiritualFocus:
    "God writes a family's story before a child is born; real love is patient, respectful, and protective; kindness, listening, laughter, forgiveness, courage, and joy grow one scoop at a time; love is the bowl that holds a happy home together",
  summary:
    "At bedtime, Mommy and Daddy open the Memory Book and tell Lilly the true story of their first date. As the pages come alive, Lilly peeks into the day they met — aquarium wonders, butterflies, sushi, dessert, and a gentle goodbye — while magical friends help her see the kind of daughter her parents were already praying for.",
  coverGradient: "linear-gradient(135deg, #38bdf8 0%, #f9a8d4 50%, #fef9c3 100%)",
  coverPrompt:
    "Premium vertical children's picture-book cover. In the foreground, present-day Lilly peeks over the edge of a large open cream Memory Book with a soft heart-and-butterfly motif, eyes wide with wonder. Inside the glowing book pages, young Mommy (long pale golden-blonde waves, soft ivory-blue first-date dress) and young Daddy (short neat dark brown hair, kind first-date shirt) walk side by side through a bright aquarium hall, while a luminous pale-blue butterfly and a gentle sea turtle float near Lilly as if they can see her. Soft aquarium turquoise and porcelain-white light, airy composition, clear open space along the top for the title and near the bottom for the subtitle. Bright, clean 2D-animation storybook style. No text, logos, watermarks, or borders in the artwork.",
  useDefaultCoverPath: true,
  generationSeed:
    "Produce How Mommy and Daddy Met: Before We Knew Your Name as an illustrated Lilly's Adventures Memory Book. Keep the true first-date storyline historically accurate (drive to Chattanooga, ice cream shop wait, aquarium date, butterfly sanctuary, stingray photo, Toto's sushi near Coolidge Park, Rembrandt's dessert shop until close, respectful hand-kiss goodbye). Lilly watches from inside the Memory Book and never changes history. Magical aquarium friends teach simple virtues through conversation. Primary themes: God was writing the family before Lilly was born; real love does not rush; love protects and honors. Spiritual guidance through prayer, wonder, and kind choices — never scare, never spell-casting.",
  supportingCastPrompt: `SUPPORTING CAST, OUTFIT & PROP CONTINUITY (keep identical across every page)

Young Mommy (Tish): match approved Tish identity — long pale golden-blonde waves, soft oval face, warm smile. First-date outfit: modest soft ivory or sky-blue day dress, simple cardigan optional, neat flats. Present-day Mommy uses the same face with a soft home evening dress or cardigan in bedroom scenes.

Young Daddy (Andrew): match approved Andrew identity — short neat dark brown hair, kind eyes, clean-shaven. First-date outfit: light powder-blue or soft gingham button shirt with khaki/chino pants. Present-day Daddy uses the same face with a soft home sweater or casual shirt in bedroom scenes.

Lilly: short chestnut curls to the jaw, signature large white bow, soft powder-blue or blush bedtime pajamas in bedroom frames; in Memory Book scenes she may wear a soft day dress with white bow while peeking into memories — hair ALWAYS short ear-to-jaw curls.

Winston: Airedale terrier with black saddle and tan face/legs; appears mainly in bedroom framing scenes, resting peacefully near the bed.

MAGICAL MEMORY FRIENDS (original designs; soft, preschool-safe; never scary):
• Grandpa Turtle — wise old sea turtle with kind wrinkled smile eyes; slow gentle movements
• Ollie Octopus — soft lavender octopus with friendly round eyes; models calm breathing
• Bella Butterfly — luminous pale-blue and soft-peach butterfly; lands on kind hands
• Ray the Stingray — gentle spotted stingray in clear shallow water
• Pip the Dolphin — small playful dolphin with a bright smile
• Rembrandt Baker — kind older dessert-shop baker with flour-dusted apron and warm eyes (human; not spooky)

PROP CONTINUITY:
• Memory Book — cream hardcover with a soft heart and butterfly motif; glows gently when open
• Ice cream shop window across from the aquarium
• Mommy's car and Daddy's car (simple storybook cars; never brand logos)
• Daddy's first photo moment of Mommy looking at stingrays (painted as a tender illustrated memory, not a real photo overlay)
• Tiny golden keepsake dessert box at Rembrandt's
• Glowing scoops labeled only when a scene requests simple legible words: Kindness, Patience, Listening, Laughter, Forgiveness, Respect, Courage, Joy — and a simple bowl for Love

COMPOSITION SAFETY
Stage characters at a comfortable medium or wide distance; faces small-to-medium; generous pale negative space. When Lilly peeks into a memory, keep Mommy and Daddy as the main date, with Lilly slightly aside or semi-soft at the edge so she feels like a watcher, not a time traveler changing events.

IMAGE CONTINUITY RULES
1. Lilly, Tish, and Andrew faces stay on-model on every page.
2. Magical friends notice Lilly; young Mommy and Daddy do not see her.
3. No wings on people, no wands, no scary monsters, no romantic kiss on the lips — the goodbye is a respectful hand kiss only.
4. Do not place written words in art except the scoop/bowl labels when a scene requests them.
5. Keep aquarium and evening scenes bright, clean, and emotionally safe.
6. Leave negative space for story text matching each page layout.`,
  useDefaultImagePaths: true,
  useDefaultClosingImagePath: true,
  closingPrayer:
    "Dear God, thank You for writing our family's story before we could see it. Thank You for Mommy and Daddy, and for the day they met. Help me grow into a little girl who loves You, is kind, uses gentle words, tells the truth, obeys with a joyful heart, and fills our home with laughter. Teach me that real love is patient, respectful, and kind. Amen.",
  closingIllustrationPrompt:
    "Present-day Mommy, Daddy, and Lilly snuggle together on the bed with the open Memory Book on their laps, Winston curled at their feet. Through the bedroom window, one soft glowing butterfly rests quietly on the sill beneath a clear starry sky. Peaceful, grateful, high-key bedtime light. Leave broad clean space above the family for prayer text. No text in the artwork.",
  pages: [
    {
      title: "Bedtime Memory Book",
      body:
        "It was bedtime, and Lilly snuggled between Mommy and Daddy.\n\nWinston curled up at their feet.\n\nDaddy opened the Memory Book — a special book with a soft heart on the cover.\n\n\"This,\" he said, \"is the story of the day God began writing our family — before we even knew your name.\"",
      scriptureThread: "God begins writing a family's story long before a child can see it.",
      picturePrompt:
        "Cozy bedroom bedtime scene. Present-day Mommy (Tish), Daddy (Andrew), and Lilly snuggle on the bed. Daddy holds open a cream Memory Book with a soft heart-and-butterfly motif. Winston the Airedale rests at their feet. Soft clear lamplight, pale walls, peaceful wonder. Leave open space along the top for text.",
      palette: "home-daylight",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew", "winston"],
    },
    {
      title: "The pages come alive",
      body:
        "As Daddy turned the first page, the pictures began to shimmer.\n\nLilly leaned closer.\n\n\"Can I go inside?\" she whispered.\n\nMommy smiled. \"You can peek into our memories, sweetheart. But remember — you're watching the day we fell in love. You're not changing it.\"",
      scriptureThread: "Wonder helps a child enter a story without rewriting the truth.",
      picturePrompt:
        "Lilly leans over the open Memory Book as soft light rises from the pages like gentle sparkles of memory. Young Mommy and young Daddy appear as a soft scene inside the book. Present-day Mommy rests a hand on Lilly's back. Bright, magical but preschool-safe. Leave text space on the right.",
      palette: "starlight",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "Driving to Chattanooga",
      body:
        "\"First,\" Daddy said, \"I talked with Mommy on the phone and sent her messages.\n\nThen I decided to drive all the way to Chattanooga, where she lived.\"\n\nLilly watched young Daddy's car roll down a bright road.\n\n\"That's a long way!\" she said.\n\n\"Love is worth the trip,\" Daddy answered.",
      scriptureThread: "Love is willing to go the extra mile.",
      picturePrompt:
        "Wide bright daytime road scene. Young Daddy (Andrew likeness) drives a simple storybook car toward distant riverside city buildings. Lilly peeks softly at the edge of the memory like a watcher. Clear sky, pale greens and blues, hopeful mood. Leave open sky space for text.",
      palette: "dawn",
      symbol: "heart",
      layout: "full-spread",
      presentCharacterIds: ["lilly", "andrew"],
    },
    {
      title: "Early at the ice cream shop",
      body:
        "Daddy arrived early.\n\nHe parked his car and waited inside the ice cream shop across the street from the aquarium.\n\n\"I wanted a good spot,\" he told Lilly, \"so I could see Mommy when she pulled up.\"\n\nLilly giggled. \"Were you nervous?\"\n\nDaddy laughed. \"A little.\"",
      scriptureThread: "Patience makes room for a good beginning.",
      picturePrompt:
        "Young Daddy sits by an ice cream shop window looking across the street toward a bright aquarium building. Soft pastel ice cream colors inside the shop. Lilly peeks near the window frame of the memory, unnoticed. Clear daylight. Leave text space upper-left.",
      palette: "dawn",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "andrew"],
    },
    {
      title: "Mommy arrives",
      body:
        "Then Mommy's car pulled up.\n\nDaddy waited a moment so she could get ready.\n\n\"He didn't rush me,\" Mommy said. \"That was kind.\"\n\nLilly watched young Daddy walk across the street and meet Mommy at her car.\n\nIt was the first time they saw each other face to face.",
      scriptureThread: "Kindness gives people room to breathe.",
      picturePrompt:
        "Outside the aquarium on a bright riverside street. Young Mommy stands by her car; young Daddy walks across toward her with a warm, respectful smile. Lilly peeks from beside a lamppost edge of the memory. Friendly first-meeting energy, no crowding. Leave text space along the top.",
      palette: "coastal",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "Into the aquarium",
      body:
        "Together they walked into the aquarium.\n\nThat day, it felt almost empty.\n\nDaddy joked that he had rented the whole place just for them.\n\nLilly's eyes grew wide. \"Did you really?\"\n\nMommy laughed. \"No — but it felt that special.\"",
      scriptureThread: "God can make ordinary places feel wonderfully set apart.",
      picturePrompt:
        "Young Mommy and young Daddy enter a bright, nearly empty aquarium lobby with tall glass and soft turquoise light. Lilly tiptoes behind them inside the Memory Book glow, delighted. Spacious, airy, wondrous. Leave open space upper-right for text.",
      palette: "coastal",
      symbol: "crown",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "She knew all the fishes",
      body:
        "Mommy walked beside Daddy and told him about the fishes.\n\nShe smiled as if she knew every name.\n\n\"I was mostly reading the charts,\" Mommy admitted.\n\nLilly whispered to a silver fish, \"She's funny.\"\n\nThe fish bubbled happily, as if it agreed.",
      scriptureThread: "Joy grows when we share wonder together.",
      picturePrompt:
        "Young Mommy points at a tall aquarium tank while reading a chart; young Daddy listens with a delighted smile. Schools of silver fish swirl. Lilly stands near the glass, whispering to a friendly fish that seems to notice her. Bright turquoise water, porcelain highlights. Leave text space on the left.",
      palette: "coastal",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "A little girl who loves adventures",
      body:
        "Near the sea turtles, Daddy said softly, \"One day, I hope I have a little girl who loves adventures.\"\n\nMommy smiled. \"I hope she's kind.\"\n\nA wise old sea turtle slowly nodded.\n\nLilly covered her mouth and giggled.\n\n\"They're talking about me!\"",
      scriptureThread: "Parents dream and pray for their children before they arrive.",
      picturePrompt:
        "Young Mommy and young Daddy stand before a luminous sea-turtle exhibit. Grandpa Turtle the wise old sea turtle nods gently toward Lilly, who peeks beside the tank grinning because she knows they are dreaming of her. Soft wonder, clear water light. Leave text space at the top.",
      palette: "coastal",
      symbol: "heart",
      layout: "full-spread",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "Ollie takes a deep breath",
      body:
        "Around the corner, Ollie the soft lavender octopus wiggled a tentacle at Lilly.\n\n\"Strong feelings are okay,\" he said gently.\n\n\"But when I get scared, I don't splash everyone.\n\nI take a deep breath...\"\n\nOllie breathed in slowly.\n\n\"...and then I swim.\"",
      scriptureThread: "Self-control helps big feelings move gently.",
      picturePrompt:
        "Ollie the friendly lavender octopus faces Lilly beside a glowing tank, demonstrating a calm deep breath with soft bubble shapes. Young Mommy and Daddy continue their date in the soft background, unaware. Preschool-safe, playful, clear. Leave text space on the right.",
      palette: "coastal",
      symbol: "shield",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "The butterfly sanctuary",
      body:
        "Soon they reached the butterfly sanctuary.\n\nIt was like a big open garden under soft netting, with butterflies floating everywhere.\n\nOne beautiful butterfly landed right on Mommy's finger.\n\n\"That was so neat,\" Daddy said.\n\nLilly whispered, \"Hi, Bella.\"",
      scriptureThread: "Beauty invites us to slow down and notice.",
      picturePrompt:
        "Bright butterfly sanctuary with soft netting and flowering plants. A luminous pale-blue and peach butterfly lands on young Mommy's outstretched finger while young Daddy watches in wonder. Lilly stands nearby, quietly greeting Bella Butterfly. Airy, magical, high-key. Leave text space upper-left.",
      palette: "garden",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "A kind heart",
      body:
        "Bella Butterfly fluttered to Lilly's shoulder.\n\n\"Do you know who they're dreaming about?\" she asked.\n\nLilly grinned. \"Me!\"\n\nBella giggled. \"Then grow into the little girl they're hoping for.\n\nBeautiful wings don't make someone beautiful.\n\nA kind heart does.\"",
      scriptureThread: "True beauty begins with a kind heart.",
      picturePrompt:
        "Close tender moment: Bella Butterfly rests on Lilly's shoulder as Lilly smiles with understanding. Soft butterfly garden bokeh behind them; young Mommy and Daddy softly out of focus continuing their walk. Leave text space along the bottom.",
      palette: "garden",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "The first photo",
      body:
        "Near a little stingray pool, Mommy leaned over to look.\n\nThat was the first time Daddy ever took her picture.\n\nRay the stingray glided past like a soft shadow in the clear water.\n\nLilly peeked at the memory. \"Mommy looks happy.\"\n\n\"I was,\" Mommy said.",
      scriptureThread: "Treasured moments become part of a family's story.",
      picturePrompt:
        "Young Mommy leans gently over a clear shallow stingray touch pool, looking with soft delight as Ray the spotted stingray glides by. Young Daddy stands a little behind, capturing the first photo moment with a simple storybook camera. Lilly watches from the side. Bright, tender, clean water. Leave text space upper-right.",
      palette: "coastal",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "Good manners make everyone smile",
      body:
        "Pip the dolphin popped up in a nearby tank and grinned at Lilly.\n\n\"Good manners make everyone smile,\" he chirped.\n\n\"Saying please. Waiting your turn. Using a gentle voice.\"\n\nLilly practiced a tiny curtsy.\n\n\"Like that?\"\n\nPip clicked happily. \"Exactly like that.\"",
      scriptureThread: "Gentle manners are a gift we give other people.",
      picturePrompt:
        "Pip the small playful dolphin smiles through aquarium glass toward Lilly, who practices a polite little curtsy. Soft turquoise water and bubbles. Young Mommy and Daddy remain gently in the background of the memory. Leave text space on the left.",
      palette: "coastal",
      symbol: "crown",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "They didn't want it to end",
      body:
        "When the aquarium visit was over, nobody wanted the day to end.\n\nThey were having such a good time.\n\n\"So we jumped in the car,\" Daddy said, \"and kept going.\"\n\nLilly climbed into the Memory Book glow and rode along, quiet as a whisper.",
      scriptureThread: "Joy makes us want to linger in good company.",
      picturePrompt:
        "Young Mommy and young Daddy walk from the bright aquarium toward their cars under clear late-afternoon light, smiling. Lilly follows softly in the Memory Book shimmer at a respectful distance. Riverside city feel, hopeful. Leave text space at the top.",
      palette: "dawn",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "Toto's by the river",
      body:
        "They drove across the bridge to Toto's sushi, near Coolidge Park.\n\nInside, they talked and laughed and got to know each other more.\n\nLilly sat at an invisible little seat in the memory and listened.\n\n\"This is how friendship grows,\" Grandpa Turtle murmured from a tiny picture on the wall.",
      scriptureThread: "Listening helps love grow roots.",
      picturePrompt:
        "Warm bright sushi restaurant interior near a riverside park. Young Mommy and young Daddy sit across a simple table talking happily with sushi plates between them. Through a window, a bridge and green park glow in clear light. Lilly peeks from a soft memory shimmer beside a booth. Leave text space upper-left.",
      palette: "home-daylight",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "Rembrandt's corner table",
      body:
        "Still, they didn't want the night to end.\n\nSo they went to Rembrandt's — a coffee and dessert shop — and found a little corner table by the window.\n\nThey stayed and talked until the shop was ready to close.\n\n\"We closed them down,\" Daddy said proudly.\n\nMommy laughed. \"Near the front, on the left as you walk in.\"",
      scriptureThread: "Shared time is one of love's sweetest gifts.",
      picturePrompt:
        "Cozy dessert-and-coffee shop corner by a large window. Young Mommy and young Daddy sit at a small table with cups and a shared dessert, talking warmly as evening city light glows outside. Lilly peeks near the window reflection in soft memory light. Bright high-key interior, not dark. Leave text space on the right.",
      palette: "starlight",
      symbol: "light",
      layout: "full-spread",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "A magical dessert",
      body:
        "The kind baker saw Lilly — and somehow he wasn't surprised.\n\nHe reached beneath the counter and brought out a tiny golden keepsake box.\n\n\"For the little girl this story is becoming,\" he said.\n\nLilly's eyes sparkled.\n\n\"Is it ice cream?\"\n\nThe baker smiled. \"Even better.\"",
      scriptureThread: "God prepares sweet gifts inside a family's story.",
      picturePrompt:
        "Friendly older baker in a flour-dusted apron presents Lilly with a tiny golden keepsake box at a bright dessert counter. Soft sparkles of wonder, not scary magic. Young Mommy and Daddy remain at their corner table in the soft background, unaware. Leave text space upper-left.",
      palette: "starlight",
      symbol: "crown",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "Scoops for a happy family",
      body:
        "\"Every happy family is made one scoop at a time,\" said the baker.\n\nHe added scoops that glowed like soft light:\n\nkindness...\npatience...\nlistening...\nlaughter...\nforgiveness...\nrespect...\ncourage...\nand joy.",
      scriptureThread: "A joyful home is built one faithful choice at a time.",
      picturePrompt:
        "Open golden keepsake box on the dessert counter with eight soft glowing scoops arranged like a sundae of virtues. Simple legible scoop labels read: Kindness, Patience, Listening, Laughter, Forgiveness, Respect, Courage, Joy. Lilly watches in wonder. Clean pastry-shop light, preschool-safe sparkle. Leave text space at the top.",
      palette: "starlight",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Love is the bowl",
      body:
        "Lilly looked up. \"Where's love?\"\n\nThe baker tapped a simple shining bowl that held every scoop.\n\n\"Love,\" he said, \"is the bowl that holds everything together.\"\n\nLilly hugged the keepsake box to her heart.\n\n\"I want our family to have all of these.\"",
      scriptureThread: "Love holds every other virtue in place.",
      picturePrompt:
        "Lilly holds a shining simple bowl that contains the glowing virtue scoops. The baker smiles kindly. A small legible label on the bowl reads: Love. Warm bright shop light, tender emotion, clear composition. Leave text space on the right.",
      palette: "royal",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly"],
    },
    {
      title: "Walking her to the car",
      body:
        "At last it was time to go.\n\nDaddy walked Mommy out to her car.\n\nMommy had already told her mama, \"If this boy tries to kiss me, it will feel weird — and that will be the end.\"\n\nShe didn't kiss on a first date.\n\nAnd Daddy had no plan to rush her.",
      scriptureThread: "Respect protects a growing love.",
      picturePrompt:
        "Quiet bright evening outside the dessert shop. Young Daddy walks young Mommy toward her car with respectful space between them. Lilly follows in soft memory light, curious. Clear gentle evening — not dark or scary. Leave text space upper-left.",
      palette: "starlight",
      symbol: "shield",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "May I have your hand?",
      body:
        "Daddy opened Mommy's car door.\n\nHe helped her in.\n\nThen he asked for her hand.\n\nMommy looked surprised. \"Why do you want my hand?\"\n\n\"Just give me your hand,\" he said kindly.",
      scriptureThread: "Honor shows itself in small, careful actions.",
      picturePrompt:
        "Young Daddy holds young Mommy's car door open with gentle courtesy as she sits inside. He offers his hand respectfully. Lilly watches from nearby with wide eyes. Soft clear evening light, tender and modest. Leave text space along the top.",
      palette: "starlight",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "A kiss on the hand",
      body:
        "Daddy kissed Mommy's hand — soft and quick — and shut the door.\n\nMommy drove away.\n\nDaddy walked back to his car on cloud nine, smiling the whole long drive home.\n\nLilly tilted her head.\n\n\"Wait... why didn't Daddy kiss Mommy?\"",
      scriptureThread: "Real love can be tender without rushing.",
      picturePrompt:
        "Young Daddy gently kisses the back of young Mommy's hand beside the open car door, then begins to close it. Mommy's expression is soft and surprised in a good way. Lilly stands in the memory shimmer looking puzzled but safe. Clear evening light. Leave text space on the right.",
      palette: "starlight",
      symbol: "heart",
      layout: "full-spread",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "Real love doesn't rush",
      body:
        "Grandpa Turtle appeared in a puddle of aquarium light beside Lilly.\n\n\"Because real love doesn't rush,\" he said.\n\n\"Real love protects.\n\nReal love honors.\"\n\nLilly watched Daddy drive away, still smiling.\n\n\"I like that kind of love,\" she whispered.",
      scriptureThread: "Real love is patient, protective, and honorable.",
      picturePrompt:
        "Grandpa Turtle the wise sea turtle speaks gently to Lilly at the edge of the closing memory as young Daddy walks happily toward his car in the background. Soft star-and-aquarium light blend, peaceful teaching moment. Leave text space upper-left.",
      palette: "starlight",
      symbol: "shield",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "andrew"],
    },
    {
      title: "The Memory Book closes",
      body:
        "The magical friends waved goodbye.\n\nThe Memory Book pages fluttered and gently closed.\n\nLilly was back on the bed between Mommy and Daddy.\n\nWinston thumped his tail once, as if he had heard the whole story too.",
      scriptureThread: "A good story leads a child safely home again.",
      picturePrompt:
        "Bedroom scene: the cream Memory Book closes with a soft glow as Lilly blinks back into the present between Mommy and Daddy. Winston thumps his tail. Bella Butterfly is just visible as a tiny glow near the window before fading. Peaceful. Leave text space at the top.",
      palette: "home-daylight",
      symbol: "light",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew", "winston"],
    },
    {
      title: "I'm glad God picked you",
      body:
        "Lilly snuggled closer.\n\n\"I'm glad God picked you two to be my parents,\" she whispered.\n\nDaddy kissed the top of her head.\n\nMommy hugged her tight.\n\nThe room felt full of quiet joy.",
      scriptureThread: "Children are a blessing, and parents are a gift.",
      picturePrompt:
        "Tender close family moment on the bed: Lilly hugs Mommy and Daddy; Daddy kisses the top of her head; Mommy's arms wrap around them. Winston rests nearby. Soft clear bedtime light, grateful faces. Leave text space on the right.",
      palette: "home-daylight",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew", "winston"],
    },
    {
      title: "Before we knew your name",
      body:
        "Daddy said, \"Before we ever knew your name, we prayed God would give us a little girl who loved Him, was kind to others, obeyed her mommy and daddy, used gentle words, told the truth, and filled our home with joy.\"\n\nMommy smiled. \"And every day, we're helping you grow into that little girl.\"",
      scriptureThread: "Parents pray their children into the people God is forming.",
      picturePrompt:
        "Mommy and Daddy sit with Lilly, speaking tenderly; Lilly listens with a soft, serious, hopeful expression. The closed Memory Book rests nearby. Warm clear lamplight, intimate and safe. Leave text space along the top.",
      palette: "starlight",
      symbol: "crown",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "I'm going to keep practicing",
      body:
        "Lilly hugged them both.\n\n\"I'm going to keep practicing,\" she said.\n\nMommy brushed a curl from Lilly's cheek.\n\n\"That's all love asks, little one — one kind scoop at a time.\"",
      scriptureThread: "Growing in love is daily practice, not perfection.",
      picturePrompt:
        "Lilly hugs Mommy and Daddy with joyful determination. A tiny soft glow like a single dessert scoop of kindness floats as a gentle metaphor near the Memory Book, not flashy magic. Peaceful bedtime. Leave text space on the left.",
      palette: "dawn",
      symbol: "heart",
      layout: "picture-book",
      presentCharacterIds: ["lilly", "tish", "andrew"],
    },
    {
      title: "The storybook within the story",
      body:
        "That night, one soft butterfly rested on the windowsill under the stars.\n\nInside, the family curled up with the very book you are holding.\n\nGod had been writing their story all along —\n\nand Lilly's greatest adventure was growing into the daughter they had dreamed about.",
      scriptureThread: "God's story for a family is the greatest adventure of all.",
      picturePrompt:
        "Final wide illustration: present-day Mommy, Daddy, and Lilly curled on the bed reading the Memory Book (a storybook-within-a-story), Winston at their feet. Outside the window, one glowing pale butterfly rests on the sill beneath a clear starry sky. Soft, memorable, high-key bedtime ending. Leave broad open space for text.",
      palette: "starlight",
      symbol: "light",
      layout: "full-spread",
      presentCharacterIds: ["lilly", "tish", "andrew", "winston"],
    },
    {
      title: "God's Word for Lilly",
      body:
        "\"Love is patient, love is kind.\"\n\n— 1 Corinthians 13:4\n\n\"Be completely humble and gentle; be patient, bearing with one another in love.\"\n\n— Ephesians 4:2",
      scriptureThread: "Love is patient, love is kind. — 1 Corinthians 13:4",
      picturePrompt:
        "Soft decorative keepsake scene: the closed cream Memory Book, a pale butterfly, and a tiny golden dessert spoon rest on a pale windowsill under gentle stars. No people. Broad clean open space for Scripture text. Calm, high-key, preschool-safe.",
      palette: "starlight",
      symbol: "light",
      layout: "text-pocket",
      presentCharacterIds: [],
    },
    {
      title: "Talk About Our Story",
      body:
        "1. Where did Mommy and Daddy go on their first date?\n2. What did the butterfly teach about real beauty?\n3. What did Ollie the octopus do with big feelings?\n4. Why didn't Daddy kiss Mommy at the car?\n5. What did the baker say love is?\n6. What kind of little girl were Mommy and Daddy praying for?\n\nPractice phrase:\n\"Real love doesn't rush. Real love protects. Real love honors.\"\n\nFamily scoops to practice:\nKindness. Patience. Listening. Laughter. Forgiveness. Respect. Courage. Joy.\n\nAnd remember — love is the bowl that holds them all.",
      scriptureThread: "Families grow love by practicing it together.",
      picturePrompt:
        "A soft decorative border on cream paper: tiny butterfly, sea turtle outline, dessert spoon, and heart motifs in the corners — minimal illustration framing for a parent conversation page. Broad clean open space for text. Calm, preschool-safe, high-key palette.",
      palette: "dawn",
      symbol: "heart",
      layout: "text-only",
      presentCharacterIds: [],
    },
  ],
};
