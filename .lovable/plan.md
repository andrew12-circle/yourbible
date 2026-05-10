## Goal

After login, instead of dropping straight into John 1, show an **app-style home screen** that lets you pick where to go: the Bible reader, your Framework, etc. Like a phone home screen with tiles.

## Changes

### 1. New route: `/home`
A new `HomePage` becomes the post-login landing screen.

Layout (mobile-first, since the preview is at 621px):
- Top: greeting (`Good morning, {name}`) + small profile/settings icon
- Grid of large tappable tiles, 2 columns on mobile, 3–4 on desktop
- Bottom: a small "Continue reading" row showing the last chapter you were on (if any), so you can jump straight back in

### 2. Tiles on the home screen

Each tile = icon + label + 1-line subtitle, routes to:

- **Bible** → `/read/Jhn/1` (or last-read chapter)
- **Framework** → `/framework`
- **Beliefs** → `/framework/beliefs`
- **Chat** → `/framework/chat`
- **Daily reading** → `/framework/daily`
- **Study** → `/framework/study`
- **Tensions** → `/framework/tensions`
- **Digest** → `/framework/digest`
- **Sleep mode** → `/sleep`
- **Settings** → `/settings`

(Final tile selection can be trimmed — see question below.)

### 3. Routing change
- `Index` (`/`) currently redirects logged-in users to `/read/Jhn/1`. Change it to redirect to `/home` instead.
- Add `<Route path="/home" element={<HomePage />} />` in `App.tsx`.
- `HomePage` itself guards: if no user → `/auth`, if not onboarded → `/onboarding`.

### 4. "Continue reading"
Read the last chapter from `localStorage` (the reader already tracks position) or from the `reading_progress` table if it exists. If nothing yet, hide the row.

## Out of scope
- No changes to the Bible reader, Framework pages, or auth flow itself.
- No new database tables.

## Technical notes
- New file: `src/pages/HomePage.tsx`
- Edit: `src/pages/Index.tsx` (redirect target), `src/App.tsx` (add route)
- Pure frontend, uses existing design tokens (`paper-texture`, `leather`, etc.) so it matches the rest of the app
