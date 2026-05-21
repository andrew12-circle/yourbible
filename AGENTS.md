# Agent guide (yourbible)

Before finishing work, run **`npm run lint`**, **`npm run test`**, and **`npm run build`** — all must pass.

## File size

- Max **2000 lines** per `src/**/*.{ts,tsx}` (`max-lines` ESLint + `npm run check:file-size`).
- Plan splits around **1600 lines**.

## Layout

- **Pages** → **hooks** → **components** → **lib**
- Hooks before any early `return` in components.

## Cursor rules

See `.cursor/rules/` — especially `file-size-and-structure.mdc` and `react-pages.mdc`.
