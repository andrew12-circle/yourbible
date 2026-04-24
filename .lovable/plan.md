
# Your Bible — Phase 1 + 2

A premium, personal Bible reader that feels like the real thing — leather, ribbon bookmarks, side tabs, AI verse breakdowns, and a calm sleep mode. Built on Lovable Cloud with API.Bible for translations.

## Look & feel
- **Warm cream paper** background, deep cordovan-leather accents, gold edge highlights
- **Serif body type** (Crimson Pro / Lora) for scripture, clean sans for UI chrome
- Subtle paper grain, soft drop shadows, gold/foil-style detailing — not skeuomorphic-cheesy, premium-restrained

## Phase 1 — The Bible itself

### 1. Onboarding & accounts
- Email + password sign-up via Lovable Cloud
- After sign-up: pick a **cover** (cordovan, black, blush, sand linen) and a **highlight palette** (classic warm, pastel, jewel)
- These choices become "My Bible" defaults — editable later in settings

### 2. Reader
- Single-column reading view with verse numbers as small superscript
- Cream page with soft vignette; chapter title in serif display
- Top bar collapses on scroll for a clean reading surface
- Translation switcher (NIV / ESV / KJV / NLT — whichever the API.Bible key allows)

### 3. Side tabs (real Bible navigation)
- Vertical tabs along the right edge, grouped by section: Law / History / Poetry / Prophets / Gospels / Acts / Epistles / Revelation
- Color-coded by section, abbreviated book names (Gen, Exo, Lev…)
- Tap = jump. Drag finger down = scrub through books with haptic-style preview popover
- Active book sits slightly proud, brighter

### 4. Tap-to-Understand (AI breakdown)
- Tap any verse → bottom sheet with tabs: **Summary · Context · Apply · Deep Dive**
- "Ask about this verse" free-form chat anchored to that verse
- Powered by Lovable AI Gateway (Gemini default — free during promo period)

### 5. Highlights & notes
- Long-press a verse → choose a highlight color (palette from onboarding)
- Highlights render with a **hand-drawn marker look**: uneven edges, slight transparency, faint streak texture, imperfect start/end (SVG mask + filter, not flat rectangles)
- Each color can be named/assigned meaning ("Promises", "Identity", etc.)
- Add a personal note to any verse; notes stack in the margin and show as a small dot when collapsed

## Phase 2 — Make it feel real

### 6. Ribbon bookmarks
- Up to 3 fabric ribbons (red, gold, blue) hanging from the top edge of the page
- Drag to reposition, tap edge to jump to saved spot, rename per ribbon ("Daily reading", "Sermon", "Study")
- Subtle physics — gentle sway when you scroll/turn pages, no cartoon bounce

### 7. Focus Mode ("Secret Place")
- One tap dims chrome, hides all social/community surfaces, mutes badges
- Soft transition: contrast lowers slightly, motion stills, only text + highlights + ribbons + audio remain
- Honest about scope: this silences the app, not the whole phone

### 8. Sleep Mode
- Full-screen dark experience, minimal controls
- Choose: scripture (Psalms / Gospels / themed sets like Peace, Provision, Healing), narrator voice, background (soft piano, rain, ambient pad), duration (10/20/until-asleep)
- ElevenLabs voice via edge function — calm pacing, gentle pauses between verses, fade-in / fade-out
- Background audio mixed low under the voice

## Settings — "My Bible"
- Cover · Tab palette · Highlight palette · Font (serif/sans) · Page tone (cream/warm white) · Layout (classic/reading/journal)
- Live preview as you change

## Data model (Lovable Cloud)
- `profiles` — display name, customization (cover, palette, font, layout)
- `highlights` — user_id, book, chapter, verse, color, label
- `notes` — user_id, verse reference, body, created_at
- `bookmarks` — user_id, label, color, reference, position
- `ai_conversations` — verse-anchored chat threads
- RLS so each user only sees their own data

## What's NOT in this build (deferred)
- Threads / cross-reference web view
- Praise Reports
- Live Reading (presence avatars)
- Church Mode + bulletin upload
- Legacy Bible scanning
- Curated YouTube content

These all stay on the roadmap for Phase 3+ once the core feels great.

## Setup needed before building
- **API.Bible key** — sign up at scripture.api.bible, I'll prompt to add it as a secret
- **ElevenLabs** — connect via the ElevenLabs connector for Sleep Mode voice
- **Lovable AI Gateway** — auto-provisioned, no setup
- **Lovable Cloud** — auto-provisioned for auth + database
