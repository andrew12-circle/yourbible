# Beta monitoring (first 5 users)

Run this checklist daily during the first beta cohort (~5 users), then weekly as you scale toward 50.

## Sentry (frontend errors)

1. Vercel → Project **yourbible** → Environment Variables → set `VITE_SENTRY_DSN` (production).
2. Redeploy after adding the DSN.
3. Sentry dashboard → filter `environment:production` → watch new issues after each invite wave.

Optional smoke test: trigger a test error in browser devtools after deploy:

```js
throw new Error("Belief Architecture Sentry smoke test");
```

## AI usage & cost (Supabase)

In Supabase SQL editor (project `itmcsyrnpcnrwviigppe`):

```sql
-- Last 7 days, total estimated spend
select
  date_trunc('day', created_at) as day,
  count(*) as events,
  sum(estimated_cost_usd) as usd
from ai_usage_events
where created_at > now() - interval '7 days'
group by 1
order by 1 desc;

-- Top users this week
select
  user_id,
  count(*) as events,
  sum(estimated_cost_usd) as usd
from ai_usage_events
where created_at > now() - interval '7 days'
group by 1
order by usd desc
limit 10;
```

**Pause invites** if daily spend spikes unexpectedly or a single user dominates usage.

## Secured endpoints

After deploying `verse-ai`, `sleep-tts`, and `framework-embed-transcript`:

```bash
node scripts/verify-prod.mjs
```

Anon-key calls to `verse-ai` and `sleep-tts` should report **401** once functions are redeployed.

## Manual smoke test (live URL)

On production (not localhost):

- [ ] Sign up / sign in (email + one OAuth provider)
- [ ] Forgot password email arrives; reset at `/auth/reset` works
- [ ] Read one chapter; search works
- [ ] Create one journal entry
- [ ] One My AI message completes
- [ ] PWA install on iOS or Android

## Cohort plan

| Wave | Users | Goal |
|------|-------|------|
| 1 | 5 | Diverse devices; fix blockers |
| 2 | 15 | Reader + journal feedback |
| 3 | 30–45 | AI + Framework if stable |

Ask each wave: *Did onboarding make sense? Did you complete one core loop? What confused you?*
