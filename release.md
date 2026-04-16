# PreModern Hamburg v1.0

## Was ist PreModern Hamburg?

A community website for the weekly PreModern Magic: The Gathering meetup in Hamburg. Built as a static Astro site deployed to GitHub Pages, with a Cloudflare Worker backend for decklist submissions.

## Features

### Event Management
- Dynamic event pages with date, location, format info, and registration links
- Events auto-synced daily from TopDeck.gg API
- Homepage groups events by status (upcoming / past) and category
- Past events sorted newest-first for quick access to recent results

### Decklist Submission & Display
- Players can submit decklists directly on the event page once the event has started
- Anti-spam captcha using random Premodern-legal card images (via Scryfall API)
- Supports Moxfield, Archidekt, and MTGGoldfish deck URLs
- Decklists stored in Google Sheets and synced to the site automatically
- Decklist section prominently placed at the top of event pages

### Infrastructure
- Static Astro site deployed to GitHub Pages with custom domain
- Cloudflare Worker for decklist submission with server-side validation
- GitHub Actions CI/CD for site deployment, worker deployment, and daily event sync
- Vitest test suites for both the site and worker

### Design
- Dark MTG-inspired theme with CSS custom properties
- German UI throughout
- Fully responsive layout
- No framework dependencies — vanilla JS for all interactivity
