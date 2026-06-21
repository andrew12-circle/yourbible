# Ship checklist (YourBible)

Production stack: **Vercel** (Vite SPA) + **Supabase** (DB, auth, edge functions).  
Supabase project ref: `itmcsyrnpcnrwviigppe` (also in `supabase/config.toml`).

---

## 1. Frontend — Git push → Vercel

Vercel is wired to this repo. Pushing to the production branch (usually `main`) triggers a build and deploy automatically.

```bash
git add -A
git commit -m "your message"
git push origin main
```

- **Do not** use Vercel’s manual **Publish** button when Git integration is enabled; push is the source of truth.
- Confirm the deployment **succeeded** in the [Vercel dashboard](https://vercel.com) (latest commit = Ready).

### Push blocked on workflows

If `git push` fails with:

```text
refusing to allow an OAuth App to create or update workflow
`.github/workflows/...` without `workflow` scope
```

GitHub is rejecting the push because your credential (Cursor, VS Code, `gh`, or Git Credential Manager) can update repo files but **not** GitHub Actions workflow files. This is an auth **scope** issue, not a YAML problem. Prefer fixing auth; keep the workflow file in the repo.

**Fix (recommended): grant `workflow` scope**

| Tool | What to do |
|------|------------|
| **GitHub CLI** | `gh auth refresh -s workflow` then push again. Or re-login: `gh auth login -s workflow,repo` |
| **Git Credential Manager (HTTPS)** | Sign out of GitHub in Windows Credential Manager / GCM, then sign in with a **PAT** that includes **`workflow`** (and `repo`) |
| **Cursor / VS Code** | Source Control may use an OAuth token without `workflow`. Use **SSH** remote, or push from a terminal after `gh auth login -s workflow,repo`, or configure HTTPS with a PAT that has `workflow` |

**Workaround (only if you cannot fix auth yet)**

Push everything except the workflow file, then add the workflow on GitHub (web UI or a later push after auth is fixed):

```bash
# From repo root, on the branch you are pushing (e.g. main)
git stash push -m "workflow-temp" -- .github/workflows/deploy-supabase-functions.yml
git push origin main
git stash pop
```

Or copy the workflow file aside, commit the removal temporarily, push, restore the file locally, and add it via **GitHub → Add file** in the browser. Do **not** delete the workflow from the project long-term unless you intend to drop CI deploy.

Build settings live in [`vercel.json`](../vercel.json): Vite app, `npm run build`, output `dist`, SPA rewrites to `index.html`.

---

## 2. Supabase edge functions

**Local `.env` is not used by deployed functions.** Code under `supabase/functions/` must be deployed separately.

### Deploy one function

```bash
npx supabase functions deploy framework-fetch-transcript --project-ref itmcsyrnpcnrwviigppe
```

### Deploy another function (same pattern)

```bash
npx supabase functions deploy framework-analyze --project-ref itmcsyrnpcnrwviigppe
npx supabase functions deploy framework-chat --project-ref itmcsyrnpcnrwviigppe
npx supabase functions deploy my-ai-chat --project-ref itmcsyrnpcnrwviigppe
npx supabase functions deploy sleep-tts --project-ref itmcsyrnpcnrwviigppe
```

If you changed `supabase/functions/_shared/`, redeploy every function that imports those modules (or redeploy all function folders you rely on in production).

### Login (CLI)

```bash
npx supabase login
# or set SUPABASE_ACCESS_TOKEN in your shell / .env for scripts
```

### Optional: GitHub Action

[`.github/workflows/deploy-supabase-functions.yml`](../.github/workflows/deploy-supabase-functions.yml) runs on pushes to `main` that touch `supabase/functions/**`.

- **With** repo secret **`SUPABASE_ACCESS_TOKEN`** (Supabase → Account → Access Tokens): deploys every function folder (except `_shared`) automatically.
- **Without** the secret: the workflow **succeeds** and prints a notice — it does not fail your push. Use the manual `functions deploy` commands above until you add the secret.

Add the secret: GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → name `SUPABASE_ACCESS_TOKEN`, value your `sbp_...` token.

---

## 3. Edge secrets

Set secrets on the Supabase project (placeholders below — use real values, never commit them):

```bash
npx supabase secrets set \
  GEMINI_API_KEY=your_gemini_key \
  ASSEMBLYAI_API_KEY=your_assemblyai_key \
  DEEPGRAM_API_KEY=your_deepgram_key \
  --project-ref itmcsyrnpcnrwviigppe
```

Sync transcript keys from local `.env` (when present):

```bash
powershell -ExecutionPolicy Bypass -File scripts/sync-transcript-secrets.ps1
```

**AssemblyAI** is strongly recommended for long videos without captions (accepts YouTube watch URLs). **Deepgram** needs a direct audio URL; the edge function resolves one when possible.

### YouTube transcript worker (free, captioned videos)

1. Deploy via [Render Blueprint](https://dashboard.render.com/blueprints) using root [`render.yaml`](../render.yaml) (Docker service in `worker/youtube-transcript/`).
2. Copy the service URL and `WORKER_TOKEN` from Render env vars into `.env` as `TRANSCRIPT_WORKER_URL` and `TRANSCRIPT_WORKER_TOKEN`.
3. Run `scripts/sync-transcript-secrets.ps1`, then redeploy `framework-fetch-transcript`.

Or run `powershell -ExecutionPolicy Bypass -File scripts/deploy-transcript-worker.ps1` for a short checklist.

Other keys as needed (see [`.env.example`](../.env.example)):

```bash
npx supabase secrets set OPENAI_API_KEY=your_openai_key --project-ref itmcsyrnpcnrwviigppe
npx supabase secrets set ELEVENLABS_API_KEY=your_elevenlabs_key --project-ref itmcsyrnpcnrwviigppe
npx supabase secrets set API_BIBLE_KEY=your_api_bible_key --project-ref itmcsyrnpcnrwviigppe
npx supabase secrets set YOUTUBE_DATA_API_KEY=your_youtube_key --project-ref itmcsyrnpcnrwviigppe
```

List current secret names (values hidden):

```bash
npx supabase secrets list --project-ref itmcsyrnpcnrwviigppe
```

After transcript-related secret or code changes, redeploy:

```bash
npx supabase functions deploy framework-fetch-transcript --project-ref itmcsyrnpcnrwviigppe
```

---

## 4. Smoke test production

Run automated checks (from repo root):

```bash
npm run verify:prod
# Optional: PRODUCTION_URL=https://your-domain.com npm run verify:prod
```

On the **live** URL (not `localhost`):

1. Sign in / session still works.
2. Password reset: **Forgot password?** on `/auth` → email link → `/auth/reset`.
3. Read one chapter; one My AI message; one journal entry.
4. Check browser network tab for failing edge function calls (401/500).

### Auth redirect URLs (Supabase dashboard)

Under **Authentication → URL configuration**, add:

- **Site URL:** your production origin (e.g. `https://your-domain.com`)
- **Redirect URLs:** same origin, plus `https://your-domain.com/auth/reset` and `https://your-domain.com/onboarding`

Or run (reads `.env` + sets URLs for thecirclesystem.com):

```bash
powershell -ExecutionPolicy Bypass -File scripts/configure-auth-urls.ps1
```

### Sentry (recommended for beta)

Set `VITE_SENTRY_DSN` in Vercel (production). Or sync from `.env`:

```bash
powershell -ExecutionPolicy Bypass -File scripts/set-vercel-env.ps1
```

Redeploy after adding the DSN. See [beta-monitoring.md](./beta-monitoring.md).

### Secured AI endpoints (beta)

After changing `verse-ai`, `sleep-tts`, or `framework-embed-transcript`:

```bash
npx supabase functions deploy verse-ai sleep-tts framework-embed-transcript --project-ref itmcsyrnpcnrwviigppe
```

`npm run verify:prod` should report **401** for anon calls to `verse-ai` and `sleep-tts`.

---

## 5. Beta invite

See [beta-invite.md](./beta-invite.md) for copy-paste invite text and [beta-monitoring.md](./beta-monitoring.md) for the first-cohort checklist.

---

## Quick reference

| Change | Action |
|--------|--------|
| React / Vite / `src/` only | `git push` → verify Vercel |
| `supabase/functions/` | `functions deploy` for affected names |
| New API key for edge | `secrets set` + redeploy affected functions |
| `vercel.json` / build | `git push` → verify Vercel build logs |

Cursor agents should follow [`.cursor/rules/deployment.md`](../.cursor/rules/deployment.md) after major changes.
