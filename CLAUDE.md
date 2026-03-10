# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Immo2025 is a French-language real estate rental investment simulator, built as a PWA. Users create property entries with purchase price, loan details, rental estimates (classic + Airbnb), and the app computes yields, cash-flow, and loan costs. Single-user, fully local (SQLite).

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint via Next.js
- No test framework is configured

## Stack

- **Next.js 16** with App Router, React 19, TypeScript
- **Tailwind CSS v4** (via `@tailwindcss/postcss` plugin, no `tailwind.config` file — config is in CSS)
- **SQLite** via `better-sqlite3` — local file `data.db` (auto-created, gitignored)
- **PWA** — manifest, service worker (`public/sw.js`), installable on mobile/desktop
- Path alias: `@/*` maps to `./src/*`
- `next.config.ts` declares `better-sqlite3` in `serverExternalPackages`

## Architecture

**Server vs Client split:** Route pages (`src/app/**/page.tsx`) are server components that fetch data via `@/lib/db`. Interactive UI is in `"use client"` components under `src/components/`.

**Database layer:** `src/lib/db.ts` — singleton `better-sqlite3` instance, auto-creates tables on first access:
- `properties` — property data + `source_url` for scraped listings
- `scraping_manifests` — cached CSS selectors per site hostname (unique on `site_hostname + page_pattern`)

**Server Actions:** `src/lib/actions.ts` — `saveProperty`, `removeProperty`, and `scrapePropertyFromUrl` (orchestrates scraping pipeline).

**Calculation engine:** `src/lib/calculations.ts` is purely functional — `calculateAll(property)` takes a `Property` and returns a `PropertyCalculations` object. All financial computations (loan payments, yields, cash-flow for both classic rental and Airbnb) happen here, client-side. No calculations are stored in the database.

**Data models:** `Property` (`src/types/property.ts`) and `ScrapingManifest` (`src/types/scraping.ts`).

**Smart scraping system** (`src/lib/scraping/`):
- `orchestrator.ts` — entry point: tries JSON-LD → cached manifest → AI generation, with fallback to manual
- `fetcher.ts` — fetch HTML + extract/parse JSON-LD structured data (schema.org)
- `direct-scraper.ts` — applies CSS selectors from a manifest using Cheerio
- `ai-generator.ts` — calls Gemini 2.0 Flash to generate CSS selectors from cleaned HTML
- `html-cleaner.ts` — strips scripts/styles/SVG, truncates to ~40K chars before AI call
- `normalizers.ts` — "250 000 €" → 250000, "45 m²" → 45
- `constants.ts` — thresholds, user agent, field lists
- AI is only called on first scrape of a new site or when selectors break (>3 failures). Manifests are cached in SQLite.
- Requires `GEMINI_API_KEY` in `.env.local` for AI-powered scraping; without it, JSON-LD extraction still works.

**Key routes:**
- `/` — redirects to `/dashboard`
- `/dashboard` — card view (mobile) / sortable table (desktop) with computed metrics
- `/property/new` — create property form with live calculation preview
- `/property/[id]` — detail view with full financial breakdown
- `/property/[id]/edit` — edit form pre-filled with existing data

**PWA / Mobile UX:**
- Bottom tab bar on mobile (Dashboard / Nouveau), top navbar on desktop
- Safe area handling for notch/home bar (`env(safe-area-inset-*)`)
- All touch targets min 44px, inputs use `inputMode` for proper mobile keyboards
- Service worker with network-first caching strategy

## Conventions

- UI is entirely in French
- Currency formatting uses `fr-FR` locale with EUR
- Notary fees auto-calculate at 7.5% (ancien) or 2.5% (neuf) unless manually overridden
- `PropertyForm` builds a fake `Property` object (empty id) to run `calculateAll` for live preview
