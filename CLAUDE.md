# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Immo2025 is a French-language real estate rental investment simulator, built as a PWA. Users create property entries with purchase price, loan details, rental estimates (classic + Airbnb), and the app computes yields, cash-flow, and loan costs.

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint via Next.js
- No test framework is configured

## Stack

- **Next.js 16** with App Router, React 19, TypeScript
- **Tailwind CSS v4** (via `@tailwindcss/postcss` plugin, no `tailwind.config` file — config is in CSS)
- **SQLite** via `@libsql/client` — local file `file:data.db` in dev, Turso remote DB in prod
- **PWA** — manifest, service worker (`public/sw.js`), installable on mobile/desktop
- Path alias: `@/*` maps to `./src/*`

## Architecture

**Server vs Client split:** Route pages (`src/app/**/page.tsx`) are async server components that fetch data via `@/lib/db`. Interactive UI is in `"use client"` components under `src/components/`.

**Database layer:** `src/lib/db.ts` — `@libsql/client` with lazy init. All functions are **async**. Auto-creates tables + runs migrations on first access.
- `properties` — property data + `source_url`, `image_urls` (JSON), `prefill_sources` (JSON tracking data origins)
- `scraping_manifests` — cached CSS selectors per site hostname
- Env vars: `TURSO_DATABASE_URL` (defaults to `file:data.db`), `TURSO_AUTH_TOKEN` (optional for local)

**Server Actions:** `src/lib/actions.ts` — `saveProperty`, `removeProperty`, `scrapeAndSaveProperty`, `rescrapeProperty`, `extractAndUpdateFromText`, `fetchMarketDataForCity`.

**Calculation engine:** `src/lib/calculations.ts` is purely functional — `calculateAll(property)` returns `PropertyCalculations`. All financial computations happen client-side. No calculations stored in DB.

**Market data:** `src/lib/market-data.ts` — DVF API (purchase prices via cquest + geo.api.gouv.fr) + static rent reference table (~60 French cities). Returns `MarketData` with both purchase and rental estimates.

**Data models:** `Property` (`src/types/property.ts`) and `ScrapingManifest` (`src/types/scraping.ts`).

**Smart scraping system** (`src/lib/scraping/`):
- `orchestrator.ts` — entry point: JSON-LD → cached manifest → AI multi-round pipeline
- `fetcher.ts` — fetch HTML + extract/parse JSON-LD + extract images (og:image, JSON-LD)
- `direct-scraper.ts` — applies CSS selectors from a manifest using Cheerio
- `ai-generator.ts` — calls Gemini 2.5 Flash-Lite to generate CSS selectors + extract values
- `ai-validator.ts` — quick local validation + AI coherence check
- `text-extractor.ts` — fallback: extracts property data from user-pasted text via AI
- `html-cleaner.ts` — strips scripts/styles/SVG, truncates to ~40K chars before AI call
- `constants.ts` — thresholds, user agent, field lists
- AI called on first scrape or when selectors break (>3 failures). Manifests cached in DB.
- Requires `GEMINI_API_KEY` in `.env.local` for AI features.

**Prefill tracking:** `prefill_sources` JSON field stores `{ field: { source, value } }` for each auto-filled field. Sources include "Scraping (IA)", "Observatoire des loyers", "Estimation DVF (5.5%)", "Collage texte (IA)", etc.

**Key routes:**
- `/` — redirects to `/dashboard`
- `/dashboard` — card view (mobile) / sortable table (desktop) with computed metrics
- `/property/new` — create property form with live calculations; URL import auto-saves and redirects
- `/property/[id]` — detail view with financial breakdown + market data comparison
- `/property/[id]/edit` — edit form with real-time cascading calculations
- `/share` — PWA share target landing page

**PWA / Mobile UX:**
- Share target: receive URLs from native share menu → auto-scrape
- Bottom tab bar on mobile, top navbar on desktop
- Safe area handling, 44px touch targets, mobile keyboard `inputMode`

## Conventions

- UI is entirely in French
- Currency formatting uses `fr-FR` locale with EUR
- Notary fees: `notary_fees = 0` means auto-calculated (7.5% ancien / 2.5% neuf); `> 0` = user override
- `PropertyForm` builds a fake `Property` to run `calculateAll` for live preview
- Property always created on URL import, even if scraping fails (URL preserved)
- Text paste fallback is a planned **premium feature** — keep functional but plan gating later
