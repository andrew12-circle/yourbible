---
description: Ship checklist after major changes (Vercel, Supabase edge functions, secrets)
alwaysApply: false
---

# Deployment checklist

When you finish **major** work (new features, production fixes, `supabase/functions/`, API keys, or `vercel.json` / build config), remind the user to ship using this checklist. Link `docs/deploy.md` for copy-paste commands.

## 1. Git → Vercel (frontend)

- Commit and **push to GitHub** on the production branch (usually `main`).
- Vercel is connected to Git: **push triggers production deploy**. Do **not** tell the user to click **Publish** or manually deploy in the Vercel dashboard.
- Ask them to confirm the latest deployment **succeeded** in the Vercel dashboard (or GitHub deployment status).

## 2. Supabase edge functions

If anything under `supabase/functions/` changed (including `_shared/`):

- Deploy **affected** functions to project ref `itmcsyrnpcnrwviigppe` (see `supabase/config.toml`).
- Example: `npx supabase functions deploy framework-fetch-transcript --project-ref itmcsyrnpcnrwviigppe`
- Shared code changes may require redeploying every function that imports from `_shared/`.

Optional CI: `.github/workflows/deploy-supabase-functions.yml` (auto-deploys when repo secret `SUPABASE_ACCESS_TOKEN` is set; otherwise skips with a notice).

## 3. Edge secrets (not local `.env`)

- **Local `.env` does not affect deployed edge functions.** New or rotated keys must be set in Supabase:
  - `npx supabase secrets set KEY=value ... --project-ref itmcsyrnpcnrwviigppe`
- Common keys: `GEMINI_API_KEY`, `ASSEMBLYAI_API_KEY`, `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `API_BIBLE_KEY`, `YOUTUBE_DATA_API_KEY`, etc. (see `.env.example`).

## 4. Smoke test production

After deploy, suggest verifying on the **live** site (not localhost):

- Login / auth still works
- If relevant: Framework artifact detail, transcript fetch, or other paths you touched

## When to skip

- Docs-only, comments-only, or local-only changes with no deploy surface → no checklist needed.
