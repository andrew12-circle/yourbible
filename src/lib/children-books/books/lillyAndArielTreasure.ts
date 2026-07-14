import type { ChildrenBook } from "@/lib/children-books/storybook";

/**
 * Lilly and Ariel: The Treasure Worth Waiting For
 * Complete 32-page story + back-matter pages for Lilly's Adventures.
 */
export const LILLY_AND_ARIEL_TREASURE_BOOK: ChildrenBook = {
  slug: "lilly-and-ariel-treasure",
  title: "Lilly and Ariel",
  subtitle: "The Treasure Worth Waiting For",
  series: "Lilly's Adventures",
  heroName: "Lilly",
  characterId: "lilly",
  worldId: "kitchen-coral-reef",
  sourceNote:
    "Original Lilly's Adventures picture book about patience, respectful words, and wise waiting",
  ageRange: "Ages 3-7",
  spiritualFocus:
    "Asking respectfully, controlling frustration, waiting patiently, trusting wise instructions; the Holy Spirit helps children practice patience, gentleness, obedience, and self-control",
  summary:
    "Lilly cannot wait for her pancake. Ariel cannot wait to explore a mysterious shipwreck. When impatience nearly leads both girls into danger, they stop, listen, and ask the Holy Spirit for help—and discover that waiting may place them exactly where they are needed.",
  coverGradient: "linear-gradient(135deg, #0284c7 0%, #f59e0b 55%, #34d399 100%)",
  coverPrompt:
    "Premium vertical children's picture-book cover. Lilly and Ariel swim side by side through a glowing tropical reef. Lilly holds one side of an old golden compass while Ariel holds the other. They smile at each other with excitement and friendship. Behind them, a baby sea turtle swims happily through a circular opening in the coral. Sebastian the bright-red crab clings dramatically to the top of a small treasure chest while Flounder the yellow-and-blue fish circles around him. In the distant background, a beautiful underwater palace rises through beams of blue and golden light. Composition suggests adventure, friendship, patience, and hidden treasure. Leave clear open space at the top for the title and space near the bottom for the subtitle. No text, logos, watermarks, or borders in the artwork. Lilly wears a flowing aqua-blue underwater dress with soft pearl details and does not have a mermaid tail. Ariel is an original storybook mermaid with long flowing red hair, sea-green tail, and lavender shell-inspired top.",
  useDefaultCoverPath: true,
  generationSeed:
    "Produce Lilly and Ariel: The Treasure Worth Waiting For as an illustrated Lilly's Adventures picture book. Primary lesson: asking respectfully, controlling frustration, waiting patiently, and trusting wise instructions. Primary Scripture: Be quick to listen, slow to speak and slow to become angry (James 1:19). Secondary theme: fruit of the Spirit — patience, gentleness, and self-control (Galatians 5:22-23). Keep the lesson inside the adventure; Lilly is not perfect and does not lecture Ariel. Spiritual guidance is shown through prayer, softened expressions, peaceful lighting, wise choices, remembered instruction, and changed behavior — never through visible spirits or magical energy. Ocean scenes stay bright, warm, and safe for preschoolers.",
  supportingCastPrompt: `SUPPORTING CAST & PROP CONTINUITY (keep identical across every page)

Ariel: young mermaid princess, long flowing red hair, sea-green tail, lavender shell-inspired top, bright blue-green eyes; energetic, curious, impulsive, affectionate, sometimes impatient. Original storybook interpretation — do not reproduce any existing film frame or studio character design.

Mama: warm, gentle, beautiful mother with accurate established facial likeness; loving and firm.

Daddy: loving, calm, protective, playful father with accurate established facial likeness; kneels at Lilly's eye level when correcting gently.

Winston: large Airedale terrier — tan face and legs, darker saddle coloring, expressive eyebrows; recurring comic relief.

King Triton: powerful but gentle underwater king, silver-white beard, strong build, golden crown, royal blue and sea-gold details, large trident used as a royal symbol rather than a magical weapon.

Sebastian: small bright-red crab with expressive eyes, dramatic gestures, humorous reactions.

Flounder: small yellow-and-blue tropical fish with a round, friendly face and loyal personality.

Baby sea turtle: same shell markings and proportions throughout the rescue sequence; mother turtle appears after the rescue.

Pearly seashell: identical whenever shown (kitchen discovery, transition, and return).

Golden compass: identical antique golden compass whenever shown; carved lid message on the discovery page must read exactly: LISTEN FIRST. SPEAK GENTLY. CHOOSE WISELY.

Current geography: keep current direction consistent across shipwreck / rescue pages.

IMAGE CONTINUITY RULES
1. Lilly's face remains consistent on every page.
2. Ariel hair length, color, tail color, facial structure, and outfit stay consistent.
3. Lilly's underwater dress remains aqua blue with pearl accents throughout the underwater sequence.
4. Do not add wings, wands, spell effects, supernatural creatures, or unexplained magical objects.
5. Do not place written words inside illustrations except the carved compass message when requested.
6. Leave appropriate negative space for story text matching each page layout.
7. Keep all scenes emotionally safe for preschool children.`,
  useDefaultImagePaths: true,
  useDefaultClosingImagePath: true,
  closingPrayer:
    "Jesus, thank You for loving me when my feelings become big. Thank You for giving me the Holy Spirit to help me. When I feel angry or impatient, help me stop my body, calm my voice, and listen. Teach me to ask respectfully, obey wisely, and trust that waiting can be good. Grow patience, gentleness, and self-control inside me. Amen.",
  closingIllustrationPrompt:
    "Lilly kneels beside her bed with her hands folded gently. Mama, Daddy, and Winston are visible at the doorway, smiling softly. Moonlight and warm lamplight create a peaceful bedtime atmosphere. Leave broad clean space above Lilly for prayer text. Soft, comforting storybook ending — no text in the artwork.",
  pages: [
    {
      title: "Sunshine and pancakes",
      body:
        "Sunshine spilled across Lilly's kitchen table.\n\nMama stood at the stove making warm, fluffy pancakes.\n\nDaddy poured the orange juice.\n\nAnd Winston sat beside Lilly's chair, staring hopefully at every bite.",
      scriptureThread: "A peaceful home is a gift from God.",
      picturePrompt:
        "Wide establishing shot of a cozy family kitchen in the morning. Mama cooks pancakes at the stove. Daddy pours orange juice at the counter. Lilly sits at the table in soft pajamas. Winston sits upright beside her chair, staring intensely at the pancakes. Warm sunlight streams through the windows. The room feels loving, lived-in, peaceful, and inviting. Leave open negative space in the upper-left corner for text.",
      palette: "dawn",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "Three whole seconds",
      body:
        '"May I please have my pancake?" Lilly asked.\n\n"It is almost ready," Mama said. "I just need to finish cooking the middle."\n\nLilly watched the pancake.\n\nShe waited.\n\nFor three whole seconds.',
      scriptureThread: "Waiting is hard even when we ask politely.",
      picturePrompt:
        "Medium shot focused on Lilly watching Mama cook. Lilly initially sits politely, hands together, trying to wait. Mama smiles over her shoulder while checking a pancake. Daddy watches with a knowing, amused expression. Include a small visual joke: Winston also stares at the pancake as though he has been waiting his entire life. Leave space along the top for text.",
      palette: "dawn",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "Patience popped",
      body:
        'Then Lilly\'s patience popped like a bubble.\n\n"I want it now!"\n\nShe pushed back her chair.\n\n"Get it, please! I\'m hungry!"\n\nHer feet stomped beneath the table.',
      scriptureThread: "Big feelings can spill out when we do not stop our bodies.",
      picturePrompt:
        "Lilly rises from her chair in frustration. Her eyebrows are lowered, her arms are tense, and one foot stomps beneath the table. Her behavior should look recognizable to a young child but not frightening or cruel. Mama pauses at the stove. Daddy looks concerned but calm. Winston startles slightly and tilts his head. Show a few metaphorical bubble shapes popping around Lilly to represent her patience disappearing, without implying magic. Leave text space in the upper-right.",
      palette: "dawn",
      symbol: "shield",
      layout: "picture-book",
    },
    {
      title: "A gentle correction",
      body:
        'Mama turned down the stove.\n\nDaddy knelt beside Lilly.\n\n"You may be hungry," he said gently, "but you may not command Mama or stomp your feet."\n\nLilly crossed her arms.\n\n"But I said please."',
      scriptureThread: "Loving parents correct without shame or anger.",
      picturePrompt:
        "Daddy kneels at Lilly's eye level with a steady, loving expression. Lilly crosses her arms and looks defensive. Mama remains nearby, calm but serious. Winston sits between them, glancing from Lilly to Daddy as though following the conversation. The scene should show firm, loving parenting without shame or anger. Leave open space along the lower-left for text.",
      palette: "dawn",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "Hot and tangled",
      body:
        'Daddy nodded.\n\n"Please is an important word. But respectful words need a respectful voice."\n\nLilly looked down at her toes.\n\nHer tummy still felt hungry.\n\nAnd now her heart felt hot and tangled too.',
      scriptureThread: "Respectful words need a respectful voice.",
      picturePrompt:
        "Close-up emotional portrait of Lilly looking down, shoulders slightly lowered. Use a gentle visual metaphor around her chest: warm swirling peach and red ribbons representing frustration and tangled feelings. The ribbons should remain subtle and storybook-like. Daddy's hand rests gently near her shoulder, giving her space rather than forcing affection. Leave text space on the right.",
      palette: "starlight",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "Stop your body",
      body:
        '"What can I do when my feelings get that big?" Lilly whispered.\n\nDaddy placed a hand over his heart.\n\n"First, stop your body."\n\nMama added, "Then take a slow breath."\n\n"And ask the Holy Spirit to help you choose what is right," Daddy said.',
      scriptureThread: "Stop your body. Take a slow breath. Ask the Holy Spirit for help.",
      picturePrompt:
        "Daddy demonstrates placing a hand over his heart and breathing slowly. Lilly watches and begins copying him. Mama kneels on Lilly's other side with a gentle smile. Show the family in a small, close triangle, creating emotional safety and connection. Winston lies down nearby and releases an exaggerated sleepy sigh for humor. Leave space above them for text.",
      palette: "dawn",
      symbol: "light",
      layout: "picture-book",
    },
    {
      title: "A whispered prayer",
      body:
        'Lilly closed her eyes.\n\nShe breathed in slowly.\n\nThen she whispered,\n\n"Holy Spirit, help me calm my body and use a gentle voice."\n\nThe hot, tangled feeling did not disappear all at once.\n\nBut it loosened a little.',
      scriptureThread: "The Holy Spirit helps us calm our bodies and choose gentleness.",
      picturePrompt:
        "Soft close-up of Lilly with closed eyes, one hand over her heart and one on her belly. Warm morning light surrounds her. The tangled emotional ribbons around her chest gently loosen and fade into soft golden and aqua curves. Do not depict a visible supernatural being. Communicate peace through light, posture, and expression. Leave a clean area in the upper-left for text.",
      palette: "dawn",
      symbol: "light",
      layout: "picture-book",
    },
    {
      title: "Clink!",
      body:
        "Just then, something went—\n\nClink!\n\nA tiny pearly seashell rolled across the table.\n\nWinston sniffed it.\n\nThe shell gave a soft little hum.\n\nWinston barked and jumped backward.",
      scriptureThread: "Wonder can arrive in ordinary moments.",
      picturePrompt:
        "A small pearly seashell rests on the kitchen table. Winston leans forward to sniff it, then jumps backward in comic surprise. Lilly's eyes widen. Mama and Daddy exchange amused, curious looks. The shell should glow gently from reflected sunlight, not with intense magical effects. Use dynamic movement and humor. Leave space across the top for text.",
      palette: "dawn",
      symbol: "crown",
      layout: "picture-book",
    },
    {
      title: "Whoosh!",
      body:
        'Lilly picked up the shell.\n\nA sound like distant ocean waves filled the room.\n\nThe kitchen faded into blue light.\n\nBubbles swirled around Lilly\'s feet.\n\nAnd before she could say "pancake"—\n\nWHOOSH!',
      scriptureThread: "God's world is full of imaginative wonder.",
      picturePrompt:
        "Transition scene between the kitchen and the underwater world. Lilly holds the seashell as ribbons of water, bubbles, and blue light curl around her. The kitchen remains partly visible behind her while coral and fish begin appearing ahead. Winston lunges playfully toward the swirling bubbles but remains in the kitchen. The transition should feel wondrous, safe, and imaginative. Leave space on the left for text.",
      palette: "starlight",
      symbol: "light",
      layout: "full-spread",
    },
    {
      title: "A sparkling sea",
      body:
        "Lilly floated beneath a sparkling sea.\n\nSchools of silver fish flashed through the water.\n\nPink coral curled around towering blue rocks.\n\nFar above, the ocean surface shimmered like a ceiling made of diamonds.",
      scriptureThread: "Creation invites awe and gratitude.",
      picturePrompt:
        "Grand underwater establishing shot. Lilly floats in awe in the foreground wearing her flowing aqua-blue underwater dress with soft pearl details. Schools of fish pass around her. Sea turtles glide overhead. The reef is filled with pink, turquoise, lavender, gold, and deep ocean blue. Sunbeams descend through clear water. Create a large sense of wonder and scale. Leave open water in the upper-left for text.",
      palette: "starlight",
      symbol: "crown",
      layout: "full-spread",
    },
    {
      title: "A bubbly hug",
      body:
        '"Lilly!"\n\nA girl with bright red hair raced toward her.\n\nAriel wrapped Lilly in a bubbly hug.\n\n"You came on the perfect day! We found an old shipwreck filled with treasure!"',
      scriptureThread: "Friendship greets us with joy.",
      picturePrompt:
        "Ariel swims joyfully toward Lilly and hugs her. Ariel's red hair flows dramatically around them. Flounder follows excitedly, and Sebastian rides on Flounder's back while holding on nervously. Both girls should show immediate warmth and friendship. Lilly in aqua-blue underwater dress; Ariel with long red hair, sea-green tail, lavender shell top. Leave text space in the upper-right.",
      palette: "garden",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "Treasure and pointy objects",
      body:
        'Ariel pointed beyond the reef.\n\n"There are golden cups, old maps, jeweled boxes, and a captain\'s compass!"\n\nSebastian cleared his throat.\n\n"There is also a strong current, broken wood, falling rocks, and several extremely pointy objects."\n\nAriel waved one hand.\n\n"Yes, yes. Those too."',
      scriptureThread: "Excitement needs wisdom beside it.",
      picturePrompt:
        "Ariel gestures enthusiastically toward a distant shipwreck. Create a small imaginative montage above or behind her showing treasure items: a compass, map, golden cup, and chest. Sebastian stands on a coral ledge, listing dangers with exaggerated seriousness. Flounder looks worried. Lilly is captivated by the treasure. Leave space at the bottom for text.",
      palette: "royal",
      symbol: "crown",
      layout: "picture-book",
    },
    {
      title: "Not yet",
      body:
        'King Triton appeared from the palace gates.\n\n"You may explore the shipwreck after the current becomes calm," he said.\n\n"For now, you must wait."\n\nAriel\'s smile vanished.\n\n"Wait?"',
      scriptureThread: "Wise instructions protect us even when we want to rush.",
      picturePrompt:
        "King Triton approaches with a calm, authoritative expression. Behind him is the grand underwater palace. He points toward visible fast-moving currents near the distant wreck. Ariel turns toward him in disbelief. Lilly watches from beside her. Show respect and authority without making King Triton intimidating. Leave text space in the upper-left.",
      palette: "royal",
      symbol: "shield",
      layout: "picture-book",
    },
    {
      title: "We want to go now",
      body:
        '"But we want to go now!" Ariel cried.\n\nShe swished her tail so hard that sand puffed everywhere.\n\n"We have been planning this all morning!"\n\nLilly\'s excitement began turning into disappointment too.\n\n"We could be very careful," Lilly added.',
      scriptureThread: "Disappointment can tempt us to argue.",
      picturePrompt:
        "Ariel swishes her tail in frustration, creating a cloud of sand. Lilly stands beside her, beginning to join the argument. Lilly should look disappointed and tempted to resist the instruction rather than fully angry. King Triton remains calm. Sebastian shields his eyes from the sand. Flounder coughs dramatically in the cloud. Leave text space at top-center.",
      palette: "starlight",
      symbol: "shield",
      layout: "picture-book",
    },
    {
      title: "Matching pout",
      body:
        '"The answer is not never," King Triton explained.\n\n"The answer is not yet."\n\nBut Ariel crossed her arms.\n\n"That is almost the same thing."\n\nLilly crossed her arms too.\n\n"It feels the same."',
      scriptureThread: '"Not yet" is still a loving answer.',
      picturePrompt:
        "Ariel and Lilly float side by side with matching crossed arms and matching pouts. This visual parallel is important: Lilly should recognize herself in Ariel, and readers should recognize the humor. King Triton looks at them patiently. Sebastian studies their identical pose with one raised eyebrow. Leave space on the left for text.",
      palette: "royal",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "Temptation",
      body:
        'Ariel whispered, "Maybe we should go without telling him."\n\nLilly looked toward the wreck.\n\nThe treasure was waiting.\n\nThe water did not look that dangerous from far away.\n\nFor one moment, going anyway sounded like a very good idea.',
      scriptureThread: "Temptation can make danger look safe from far away.",
      picturePrompt:
        "Close emotional scene. Ariel whispers into Lilly's ear while both look toward the distant shipwreck. Use composition to show temptation: the shipwreck glows invitingly in the distance, but strong curved current lines and drifting debris quietly reveal danger. Lilly's face should show uncertainty and inner conflict. Leave text in a dark-blue open-water area above them.",
      palette: "starlight",
      symbol: "shield",
      layout: "picture-book",
    },
    {
      title: "Lilly remembered",
      body:
        'Then Lilly remembered the kitchen.\n\nShe remembered her stomping feet.\n\nShe remembered Daddy saying,\n\n"Stop your body."\n\nLilly closed her eyes and became still.',
      scriptureThread: "Remembered wisdom can stop us before a wrong choice.",
      picturePrompt:
        "Lilly pauses in the water with eyes closed. Ariel continues facing the wreck, then turns back toward Lilly in confusion. Include a soft translucent memory vignette behind Lilly showing Daddy kneeling in the kitchen and placing a hand over his heart. The vignette should look like a warm memory, not a magical vision. Leave text on the right.",
      palette: "dawn",
      symbol: "light",
      layout: "picture-book",
    },
    {
      title: "We can ask together",
      body:
        'Lilly took one slow breath.\n\nThen another.\n\n"Holy Spirit," she whispered, "help me listen before I make a wrong choice."\n\nAriel\'s shoulders lowered.\n\n"Could you help me too?"\n\nLilly held out her hand.\n\n"We can ask together."',
      scriptureThread: "We grow when we ask the Holy Spirit for help together.",
      picturePrompt:
        "Lilly extends her hand to Ariel. Ariel takes it. Both girls close their eyes briefly in a simple childlike prayer. A soft beam of sunlight reaches them through the water, suggesting peace and clarity without depicting the Holy Spirit physically. Sebastian and Flounder watch quietly from nearby. Leave text space above and to the left.",
      palette: "dawn",
      symbol: "light",
      layout: "picture-book",
    },
    {
      title: "Help!",
      body:
        'Before they could finish—\n\n"Help!"\n\nA tiny voice squeaked from the reef.\n\nA baby sea turtle tumbled through the rushing current.\n\nA long ribbon of seaweed was wrapped around one flipper.',
      scriptureThread: "Waiting can place us where someone needs help.",
      picturePrompt:
        "Action scene. A baby sea turtle is swept sideways by the current, tangled in green seaweed. Its expression is frightened but not terrifying. Ariel and Lilly turn suddenly toward the sound. Flounder gasps. Sebastian points dramatically. Show fast movement through streaming bubbles and bent sea plants. Leave text space in the upper-right.",
      palette: "starlight",
      symbol: "shield",
      layout: "full-spread",
    },
    {
      title: "No ordinary swim",
      body:
        '"He is being pulled toward the shipwreck!" Flounder cried.\n\nAriel darted forward.\n\nLilly followed.\n\nThe current pushed against them harder and harder.\n\nThis was no ordinary swim.',
      scriptureThread: "Courage serves love when someone is in need.",
      picturePrompt:
        "Dynamic underwater chase. Ariel leads, Lilly swims close behind, and Flounder follows. Sebastian clings tightly to Flounder. The baby turtle is visible ahead, being pulled toward broken ship beams. Use sweeping diagonal motion, bubbles, flowing hair, and fabric. The danger should feel exciting but appropriate for preschool children. Leave open space at the lower-left for text.",
      palette: "royal",
      symbol: "shield",
      layout: "full-spread",
    },
    {
      title: "I'll hold you",
      body:
        'Ariel reached for the turtle.\n\nThe current spun her around.\n\n"I cannot hold him and swim back!" she called.\n\nLilly grabbed a sturdy piece of coral.\n\n"I\'ll hold you!"\n\nAriel took Lilly\'s hand.',
      scriptureThread: "Teamwork holds us steady when the current is strong.",
      picturePrompt:
        "Ariel stretches toward the turtle while the current twists her body. Lilly anchors herself to a thick coral branch with one arm and reaches for Ariel with the other. Their hands connect in the center of the composition. Show teamwork, strain, courage, and trust. Leave text in the calm open-water space above.",
      palette: "garden",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "The crab's job",
      body:
        '"Flounder, push the turtle toward us!" Lilly called.\n\n"Sebastian, loosen the seaweed!"\n\nSebastian\'s eyes grew wide.\n\n"Why does everyone always assign the crab the dangerous job?"\n\nBut he pinched the seaweed anyway.',
      scriptureThread: "Everyone has a part to play in helping others.",
      picturePrompt:
        "Flounder pushes gently behind the baby turtle. Sebastian carefully cuts and loosens the tangled seaweed with his claws while making a dramatic, worried face. Lilly and Ariel hold their positions nearby. Create a humorous but heroic team scene. Leave space on the left for text.",
      palette: "garden",
      symbol: "crown",
      layout: "picture-book",
    },
    {
      title: "Snip!",
      body:
        "Snip!\n\nThe seaweed broke free.\n\nThe baby turtle kicked his little flippers.\n\nAriel pulled.\n\nLilly held tight.\n\nAnd together they tumbled safely behind the reef.",
      scriptureThread: "Working together brings us safely through hard moments.",
      picturePrompt:
        "Triumphant action moment. The seaweed snaps apart. The turtle swims free as Ariel, Lilly, Flounder, and Sebastian tumble into the calm water behind a protective reef. Create bubbles, joyful surprise, and playful movement. No one should look injured. Leave clear text area along the top-left.",
      palette: "garden",
      symbol: "light",
      layout: "full-spread",
    },
    {
      title: "A wobbly pile",
      body:
        'For a moment, everyone lay in a wobbly pile.\n\nThe turtle blinked.\n\nSebastian\'s legs stuck out from beneath Flounder.\n\n"I meant to land like this," Sebastian announced.\n\nAriel began to giggle.\n\nThen Lilly did too.',
      scriptureThread: "Joy and laughter can follow a hard rescue.",
      picturePrompt:
        "Humorous aftermath. Lilly and Ariel sit or float against the sandy reef floor laughing. Flounder lies sideways, looking dizzy. Sebastian is partly trapped beneath him with only his claws and legs visible. The baby turtle sits upright and blinks innocently. Warm, relieved expressions. Leave text across the upper-right.",
      palette: "dawn",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "My baby!",
      body:
        'The baby turtle\'s mother hurried toward them.\n\n"My baby!"\n\nShe wrapped her flippers around him.\n\n"Thank you for waiting near the reef. If you had gone inside the wreck, no one would have seen him."\n\nAriel and Lilly looked at each other.',
      scriptureThread: "Waiting may place us exactly where God can use us to help someone else.",
      picturePrompt:
        "Mother sea turtle embraces the rescued baby. Lilly and Ariel watch with softened, thoughtful expressions. King Triton approaches in the background with relief and pride. Other sea creatures gather at a respectful distance. Create an emotional, tender moment. Leave space in the upper-left for text.",
      palette: "garden",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "Wisdom turns around",
      body:
        'King Triton smiled.\n\n"You listened before making a dangerous choice."\n\nAriel lowered her head.\n\n"We almost did not."\n\n"But you stopped," he said. "Wisdom is not never making mistakes. Wisdom is turning around when you know something is wrong."',
      scriptureThread: "Wisdom is turning around when you know something is wrong.",
      picturePrompt:
        "King Triton speaks gently to Ariel and Lilly. Ariel looks humbled but not ashamed. Lilly stands beside her. King Triton places one hand over his heart or gestures warmly toward them. The rescued turtle family remains nearby. The scene should communicate grace, correction, and growth. Leave text on the right.",
      palette: "royal",
      symbol: "light",
      layout: "picture-book",
    },
    {
      title: "Calm as bathwater",
      body:
        'The rushing water began to slow.\n\nThe bent sea grass stood tall again.\n\nSebastian tested the current with one claw.\n\n"Calm as bathwater," he declared.\n\nKing Triton nodded.\n\n"Now you may explore the shipwreck."',
      scriptureThread: "Patience prepares us for the right time.",
      picturePrompt:
        "Show the environment visibly calming. Sea plants rise upright. Sand settles. Sunbeams become clearer. Sebastian holds one claw into the gentle current like someone testing bathwater. King Triton gestures toward the now-safe shipwreck. Ariel and Lilly brighten with excitement. Leave text along the bottom.",
      palette: "starlight",
      symbol: "crown",
      layout: "picture-book",
    },
    {
      title: "Occupied treasure",
      body:
        'Ariel and Lilly swam through the broken doorway.\n\nInside were golden cups, rolled maps, silver buttons, and one very dusty boot.\n\nSebastian climbed inside the boot.\n\n"This treasure appears to be occupied," he said.',
      scriptureThread: "Adventure is sweeter when it is safe and shared.",
      picturePrompt:
        "Interior of an old underwater shipwreck, now safe and softly illuminated. Treasure objects rest among wooden beams: cups, maps, buttons, bottles, a telescope, and an old boot. Sebastian sits inside the boot like a tiny captain. Flounder peers into it. Lilly and Ariel laugh nearby. The wreck should feel mysterious and beautiful, never dark or haunted. Leave text in an open area of water at upper-left.",
      palette: "royal",
      symbol: "crown",
      layout: "picture-book",
    },
    {
      title: "The golden compass",
      body:
        "At the very back of the ship, Lilly found a small wooden box.\n\nInside rested an old golden compass.\n\nWords were carved into its lid:\n\nListen first. Speak gently. Choose wisely.\n\nAriel traced the letters with one finger.\n\n\"That is better than jewels.\"",
      scriptureThread: "Listen first. Speak gently. Choose wisely.",
      picturePrompt:
        "Close-up treasure discovery. Lilly opens a small wooden box containing a beautiful antique golden compass. Ariel leans close beside her. The compass reflects warm light onto their faces. The carved message may appear clearly on the inside lid because it is essential story text. Ensure the words are spelled exactly: LISTEN FIRST. SPEAK GENTLY. CHOOSE WISELY. Keep the lettering simple and legible. Leave room at the top for the main story text.",
      palette: "dawn",
      symbol: "light",
      layout: "picture-book",
    },
    {
      title: "Something was happening",
      body:
        'Ariel smiled.\n\n"I thought waiting meant nothing was happening."\n\nLilly shook her head.\n\n"Something was happening."\n\n"We were learning to listen," Ariel said.\n\n"And we were in the right place to help someone," Lilly added.',
      scriptureThread: "Waiting is not empty — God can work while we wait.",
      picturePrompt:
        "Lilly and Ariel sit together on a wooden beam inside the wreck, holding the compass between them. They share a thoughtful, happy conversation. Through a broken window behind them, the rescued baby turtle swims past with its mother. Soft golden light and blue water create a peaceful emotional resolution. Leave text in the upper-left.",
      palette: "garden",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "Back at the table",
      body:
        'The pearly shell hummed again.\n\nIn one bubbly blink, Lilly was back at the kitchen table.\n\nMama placed a warm pancake in front of her.\n\n"Thank you for waiting," Mama said.\n\nLilly looked up.\n\n"I\'m sorry I commanded you and stomped my feet."',
      scriptureThread: "Saying sorry restores peace at home.",
      picturePrompt:
        "Return to the cozy kitchen. Lilly sits at the table as Mama sets down a pancake. Daddy stands nearby. The pearly shell rests beside Lilly's plate. Lilly looks sincerely apologetic and calm. Mama's expression is warm and receptive. Winston stares at the pancake with renewed hope. Leave text along the upper-right.",
      palette: "dawn",
      symbol: "heart",
      layout: "picture-book",
    },
    {
      title: "May I please",
      body:
        'Lilly took a breath and tried again.\n\n"May I please have some syrup when you are ready?"\n\n"Yes, ma\'am," Mama said with a smile.\n\nDaddy cut one tiny pancake for Winston.\n\nWinston swallowed it in one gulp.\n\nApparently, he was still practicing patience.\n\nAnd Lilly laughed until her gentle heart felt light.',
      scriptureThread: "A gentle heart learns to ask respectfully and wait with love.",
      picturePrompt:
        "Joyful final kitchen scene. Lilly smiles at Mama and waits politely. Mama pours a small amount of syrup. Daddy gives Winston a tiny pancake. Winston swallows it immediately and stares at Daddy for another one, creating the final joke. The whole family laughs together. Use warm sunlight, relaxed body language, and a strong feeling of home, grace, growth, and love. Leave enough space near the upper-left for text.",
      palette: "dawn",
      symbol: "crown",
      layout: "picture-book",
    },
    {
      title: "Lilly's Treasure",
      body:
        "Being patient does not mean we never feel upset.\n\nIt means we stop our bodies, calm our voices, listen to wise instructions, and ask the Holy Spirit to help us choose what is right.\n\nWaiting may protect us.\n\nWaiting may prepare us.\n\nWaiting may place us exactly where God can use us to help someone else.",
      scriptureThread: "Patience is a treasure worth waiting for.",
      picturePrompt:
        "The golden compass lies beside the pearly shell on Lilly's bedside table. A small drawing made by Lilly shows herself, Ariel, and the baby turtle holding hands and flippers. Soft evening light fills the room. Leave broad clean space for text.",
      palette: "starlight",
      symbol: "light",
      layout: "text-pocket",
    },
    {
      title: "God's Word for Lilly",
      body:
        '"Be quick to listen, slow to speak and slow to become angry."\n\n— James 1:19',
      scriptureThread: "Be quick to listen, slow to speak and slow to become angry. — James 1:19",
      picturePrompt:
        "Lilly and Ariel sit together on a peaceful coral ledge as small fish swim around them. Lilly holds the golden compass. Ariel points toward the calm sea. Create a quiet, reflective scene with broad negative space for the verse. No other text in the artwork.",
      palette: "starlight",
      symbol: "light",
      layout: "text-pocket",
    },
    {
      title: "Talk About the Adventure",
      body:
        "1. Why did Mama ask Lilly to wait for her pancake?\n2. What did Lilly do when waiting became difficult?\n3. Why did King Triton tell Ariel and Lilly to wait?\n4. What helped Lilly stop before making a dangerous choice?\n5. Who needed their help while they waited?\n6. What could Lilly say instead of shouting, \"I want it now\"?\n7. What can you do when your feelings become hot and tangled?\n\nPractice phrase:\n\"May I please have it when you are ready?\"\n\nCalm-down pattern:\nStop my body.\nTake a breath.\nUse a gentle voice.\nAsk the Holy Spirit for help.\nChoose what is right.",
      scriptureThread: "Parents and children can practice patience together.",
      picturePrompt:
        "Soft decorative border of gentle coral, a tiny golden compass, and a pearly seashell on cream paper — minimal illustration framing for a parent conversation page. Broad clean open space for text. Calm, warm, preschool-safe.",
      palette: "dawn",
      symbol: "heart",
      layout: "text-only",
    },
  ],
};
