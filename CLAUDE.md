# CLAUDE.md

## Project

PreModern Hamburg — a static Astro site for a weekly PreModern Magic: The Gathering community in Hamburg. Deployed to GitHub Pages.

## Commands

- `npm run dev` — start Astro dev server
- `npm run build` — build static site
- `npm test` — run all tests (vitest)
- `npm run sync` — sync events from TopDeck.gg API
- `npm run sync:decklists` — sync decklists from Google Sheets (needs `GOOGLE_SHEET_ID` env var)
- `cd worker && npm run dev` — start Cloudflare Worker locally (needs `.dev.vars` with `GOOGLE_PRIVATE_KEY`)
- `cd worker && npm test` — run worker tests

## Architecture

- **Site:** Astro static site, no framework components, vanilla JS for interactivity
- **Data:** `src/data/events.json` (events), `src/data/decklists.json` (decklists), `src/data/events.ts` (types + helpers)
- **Worker:** `worker/` — Cloudflare Worker for decklist submission with Premodern card captcha (Scryfall API) and Google Sheets storage
- **Sync scripts:** `scripts/sync-events.ts` (TopDeck.gg → events.json), `scripts/sync-decklists.ts` (Google Sheets → decklists.json)
- **CI/CD:** GitHub Actions — `deploy.yml` (site), `deploy-worker.yml` (worker), `sync-events.yml` (daily sync at 06:00 UTC)

## Style

- German UI text throughout the site
- Emoji icons for section headers (📅 📋 🎮 etc.)
- Dark theme with CSS custom properties, no component library
- All styling is CSS-in-Astro (scoped `<style>` blocks)

## Testing

- Vitest for both main project and worker
- Tests colocated with source: `src/**/*.test.ts` and `scripts/**/*.test.ts`
- Worker tests: `worker/src/**/*.test.ts`
- Guard `main()` calls with `process.argv[1]?.includes("script-name")` to prevent execution during test imports
