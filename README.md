# Lovable/Cursor project

This is a Lovable-generated Vite + React + TypeScript app with Supabase
integrations. The repository is set up so changes made in Cursor can be pushed
to GitHub and picked up by Lovable.

## Local development

Prerequisites:

- Node.js 20.19 or newer
- npm

Install dependencies:

```sh
npm ci
```

Start the development server:

```sh
npm run dev
```

Vite serves the app on port `8080` by default.

## Environment variables

The frontend expects these Vite variables:

```sh
VITE_SUPABASE_PROJECT_ID=your_project_ref
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
# Publishable key (sb_publishable_…) or legacy anon JWT (eyJ…) from Dashboard → Settings → API Keys
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Copy `.env.example` to `.env` and paste keys from the same Supabase project.
Copy the full publishable key carefully (easy to confuse `0` and `O`). Legacy
anon JWT in the same variable also works with `@supabase/supabase-js`.

## Useful commands

```sh
npm run lint     # run ESLint
npm run test     # run Vitest
npm run build    # create a production build
npm run preview  # preview the production build locally
```

## Supabase

Supabase migrations live in `supabase/migrations`, and Edge Functions live in
`supabase/functions`. Frontend code imports the generated client from
`src/integrations/supabase/client.ts`.
