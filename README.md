# Local — Neighborhood Services Directory

A mobile-first (responsive) web app for finding local service providers (mechanics, handymen, attorneys, auditors, clergy, electricians) through neighbor reviews and recommendations, built from a Claude Design canvas spec (`Local Services App.dc.html`).

Backed by a real shared database (Supabase/Postgres) as of the pre-launch pass — provider listings, reviews, saves, and recommendations are now visible to every visitor, not just the browser that created them. See [Data Layer](#data-layer) below.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Language | TypeScript |
| Styling | Plain CSS with custom properties (`app/globals.css`) — no Tailwind, no CSS-in-JS |
| Icons | [lucide-react](https://lucide.dev) |
| Fonts | Barlow / Barlow Condensed via `next/font/google` |
| Backend | [Supabase](https://supabase.com) — hosted Postgres + email/OTP auth, accessed via `@supabase/supabase-js` from the browser |
| State | React Context (`lib/store.tsx`) — fetches from/writes to Supabase; a small local-only slice (location preference, guest follow-up log, in-flight auth-gate action) still lives in `localStorage` |
| Routing | Next.js file-based App Router, all interactive pages are Client Components |

No custom API routes — the client talks to Supabase directly, with Postgres Row Level Security as the access-control layer (see [Data Layer](#data-layer)).

---

## Architecture

### Route structure

```
app/
├── page.tsx                     redirect: → /search if postal code known, else /onboarding
├── onboarding/page.tsx           postal code / city-wide / geolocation entry (standalone, no chrome)
├── auth/
│   ├── sign-in/page.tsx          email entry (Apple/Google disabled — no OAuth yet) + guest skip
│   └── verify/page.tsx           6-digit email OTP entry, resolves pending action on success
├── chat/[id]/page.tsx            phase-2 in-app chat (claimed providers only, standalone)
└── (main)/                       route group: everything behind the app shell
    ├── layout.tsx                 desktop nav + bottom tab bar + auth-gated redirect to onboarding
    ├── search/page.tsx             Home: location, follow-up nudge, category chips, trusted list
    ├── search/results/page.tsx     filtered/sorted results, zero-results → Recommend CTA
    ├── provider/[id]/page.tsx      provider detail: contact, save, reviews
    ├── saved/page.tsx               bookmarked providers
    └── profile/page.tsx             guest sell-card vs. signed-in trust record
```

`onboarding`, `auth/*`, and `chat/[id]` intentionally sit **outside** the `(main)` route group — they're single-task flows without the tab bar/desktop nav chrome. Everything else shares the `(main)/layout.tsx` shell.

### App shell

- **`app/layout.tsx`** (root): loads fonts, wraps the whole app in `AppProvider` (global state) and `SheetProvider` (modal system), renders the centered `.app-frame` container.
- **`(main)/layout.tsx`**: renders `<DesktopNav>` (top nav, desktop only) + `<TabBar>` (bottom nav, mobile only) around the page content, and redirects to `/onboarding` if no location is set yet.
- **`components/SheetProvider.tsx`**: a single global bottom-sheet/dialog host. Any component can call `useSheet().open(<SomeComponent />)` to push content into it; it renders as a mobile bottom sheet or a centered desktop dialog depending on viewport (see [Responsive layout](#responsive-layout)).

### Auth-gating pattern (the core interaction model)

The app is guest-browsable everywhere, but contributing (saving, reviewing, recommending) requires a real signed-in account — email + a 6-digit code sent via Supabase Auth (`supabase.auth.signInWithOtp` / `verifyOtp`).

This is implemented as two small hooks in **`lib/useActions.tsx`**:

- **`useActionResolver()`** — given a `PendingAction` (`{ type: 'save' | 'review' | 'recommend', providerId? }`), performs it: toggles a bookmark, or opens the relevant sheet.
- **`useRequireAuth()`** — if signed in, calls the resolver immediately. If a guest, stores the action as `pendingAction` (kept in `localStorage`, not the database — it's ephemeral UI state, not user data) and opens `AuthGateSheet`.

After completing sign-in + verification, `auth/verify/page.tsx` consumes `pendingAction` and runs it via the resolver, then routes to a sensible destination (back to the provider page, to search, etc.). This is what makes "sign in to save/review/recommend" feel like it resumes exactly where the user left off, instead of dumping them on a generic screen — and it kept working unchanged through the move to real auth, since only the sign-in/verify pages needed to change, not this mechanism.

### Retention loop

`logContact(providerId, name, method)` in `lib/store.tsx` records a `ContactEvent` with a `followUpAt` timestamp (~2 days after the contact) whenever a user calls, messages, or chats a provider. For signed-in users this is a row in `contact_events`; for guests (who are allowed to call/message without an account) it stays in `localStorage`, since there's no signed-in owner to attach a database row to. The Home screen (`search/page.tsx`) polls for the most recent unresolved event past its `followUpAt` time and shows a "How did it go with X?" card with a star picker; rating it posts a review, "Didn't hire them" / "Remind me later" dismiss or snooze it.

---

## Design

### Design system

All visual tokens live in `app/globals.css` as CSS custom properties — colors, spacing, shadows, easing — and no component hardcodes a color, so retheming the whole app is a single-file change (this was exercised twice: once to polish the palette, once to fully recolor it green/cream).

- **"Blueprint" aesthetic**: square corners everywhere (`border-radius: 0` on cards/buttons), hairline borders, and a corner-tick-mark motif (`.blueprint` class) borrowed from architectural drafting. Corner ticks are reserved for one-off *featured* surfaces (the follow-up nudge, the trust-stats card, the guest sell-card) — repeated list items (provider cards, reviews) use a plain bordered `.card` so the UI doesn't feel like every tile has decoration stamped on it.
- **Color palette**: cream/mint/forest-green (`#FFFDF7` / `#F0F7F0` / `#2D6A4F`), with a dedicated amber rating color (`#F59E0B`) separate from the brand accent — matched from a reference implementation at the user's request.
- **Category icons**: each `Category` maps to a lucide icon (`lib/categoryIcons.tsx`) shown in a small tile on cards and the provider header.
- **Desktop backdrop ("Neural Grid")**: at `≥768px`, the canvas behind the app card becomes a dark graph-paper grid with softly pulsing glowing nodes (pure CSS — grid via repeating `linear-gradient`, nodes via layered `radial-gradient` on a `::before`, animated with `@keyframes`, respects `prefers-reduced-motion`). Only visible on wide viewports; on an actual phone the app card fills the viewport edge-to-edge so there's no surrounding canvas to see.

### Responsive layout

The app is mobile-first; a `≥768px` media query layers on desktop behavior without any JS breakpoint logic:

- Bottom tab bar → hidden; a sticky top `DesktopNav` takes over.
- `.app-frame` widens from a 480px phone-card cap to 1160px.
- Provider listings (`.provider-list`) switch from a single-column flex list to a `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))` grid.
- Bottom sheets (`.sheet-panel`) become centered, fully-rounded dialogs instead of full-bleed sliding sheets.
- Text-heavy pages (provider detail, profile) get a `.content-narrow` (640px) reading column instead of stretching edge-to-edge.
- Single-task flows (onboarding, auth, chat) stay a centered 480px column even at desktop width.

---

## Data Layer

**Database**: Supabase-hosted Postgres. Schema + Row Level Security policies live in `supabase/schema.sql` (run once in the Supabase SQL editor); real starter data lives in `supabase/seed.sql` (17 publicly-listed Toronto businesses across all 6 categories, sourced via web search — deliberately seeded with zero reviews and `verified: false`, since fabricating reviews for real businesses would misrepresent them).

Five tables:

| Table | Purpose |
|---|---|
| `profiles` | One row per signed-up user (name, auto-created by a trigger on `auth.users` insert) |
| `providers` | Listings — seed data has `added_by = null`; user-submitted ones (via "Recommend a provider") carry the submitter's id |
| `reviews` | Provider reviews/ratings. `providers.rating` and `.review_count` are **derived** from this table at query time, never stored, so they can't drift |
| `saved_providers` | Bookmarks — `(user_id, provider_id)` composite key |
| `contact_events` | Call/message/chat log for signed-in users, drives the follow-up nudge |

**Row Level Security** is the actual access-control layer — the client ships a public "anon" key (safe by design), and Postgres policies decide what it can do: `providers`/`reviews` are publicly readable (guests browse everything) but only `authenticated` users can insert; `saved_providers`/`contact_events`/`profiles` are readable/writable only by their own owning user (`auth.uid() = user_id`).

**`lib/store.tsx`'s `AppProvider`** is still the single place every page reads/writes through (`useApp()` keeps the same shape it always had — `providers`, `savedIds`, `toggleSaved`, `addReview`, `addRecommendation`, `logContact`, `trustStats`, etc.), but internally each of those now wraps a Supabase query instead of a local array mutation. A few things deliberately **stay** client-local rather than moving to the database, since they're device/session state, not shared user data:

- `postalCode` / `locationScope` / geolocation coordinates — a casual per-device preference
- `pendingAction` — the in-flight "resume after sign-in" action
- Guest `contact_events` — guests can call/message without an account, so there's no signed-in row owner to attach them to; only signed-in users' contact events live in the database

**Distance** is computed client-side (`lib/distance.ts`, Haversine) from the provider's seeded `lat`/`lng` and the user's browser-geolocation coordinates when both are known; otherwise the UI falls back to showing the provider's neighborhood (`area_note`) instead of a fake number.

---

## Implementation Approach

The build followed the design canvas (`Local Services App.dc.html`, sections 1–4: full flow, access model, retention loop) as the functional spec, then went through several review/iteration passes:

1. **Scaffold** — Next.js + TypeScript, design-system CSS ported from the Claude Design project's `styles.css` tokens.
2. **Core flow** — onboarding, browse/search/results, provider detail, saved, profile, auth + verify.
3. **Contribution sheets** — write review, recommend, contact (WhatsApp/SMS/call/in-app chat), auth gate — built as a global sheet system rather than routes, so they overlay in place.
4. **Retention loop + phase-2 chat** — contact-event logging and the follow-up nudge; a gated in-app chat for providers who've "claimed" their profile.
5. **QA against a second implementation** — a competing build of the same spec (deployed separately on Replit) was tested end-to-end and found to be missing the contact sheet, follow-up loop, real phone verification, trust stats, and had non-persisting reviews/recommendations and a stuck-modal bug. This build was confirmed to already cover all of those; the QA pass fed into a UI polish round instead.
6. **UI polish** — card hierarchy (plain vs. featured surfaces), shadows/depth, transitions, a branded loading state, category icons.
7. **Responsive desktop layout** — added as a follow-up once it was pointed out the app rendered as a small centered mobile card on wide screens.
8. **Visual direction** — five backdrop concepts were mocked up and presented before building (Aurora Mesh, Neural Grid, Warm Gradient + Grain, Ambient Glow, Gradient Spectrum Edge); Neural Grid was chosen and implemented as CSS-only, animated, reduced-motion-aware.
9. **Provider detail rework + full recolor** — the competing app's provider-detail layout (bio field, paired rating/recommend stats, plain divided review list, share action) was replicated structurally, then its color grading (cream/mint/green/amber) was ported across every page via the CSS custom-property tokens.
10. **Pre-launch: real backend** — swapped `localStorage`/seed-data for Supabase (Postgres + RLS + email-OTP auth), migrated `lib/store.tsx`'s internals to match while keeping its public API stable, moved auth from phone-number-with-no-verification to real email OTP, and seeded 17 real Toronto businesses sourced via web search. Planned via `EnterPlanMode` first given the scope (new schema, auth rewrite, data-layer migration) — see [Backend Setup](#backend-setup) for what running it for real requires.

Verification throughout was build + typecheck (`npm run build`, `tsc --noEmit`) plus live browser checks — either automated DOM/computed-style assertions or screenshots, depending on which browser surface was available in a given session.

---

## Project Structure

```
web/
├── app/
│   ├── globals.css              design tokens + every component class
│   ├── layout.tsx                 root layout (fonts, providers, app frame)
│   ├── page.tsx                    location-based redirect
│   ├── onboarding/page.tsx
│   ├── auth/{sign-in,verify}/page.tsx
│   ├── chat/[id]/page.tsx
│   └── (main)/
│       ├── layout.tsx
│       ├── search/{page.tsx,results/page.tsx}
│       ├── provider/[id]/page.tsx
│       ├── saved/page.tsx
│       └── profile/page.tsx
├── components/
│   ├── AppLoading.tsx             hydration-gap spinner
│   ├── TopBar.tsx / TabBar.tsx / DesktopNav.tsx
│   ├── SheetProvider.tsx          global modal/sheet host
│   ├── ProviderCard.tsx / Stars.tsx
│   └── sheets/                    WriteReviewSheet, RecommendSheet, ContactSheet, AuthGateSheet
├── lib/
│   ├── types.ts                    Provider, Review, ContactEvent, PendingAction, AuthState
│   ├── data.ts                     small UI-only constants (real data now lives in Supabase)
│   ├── supabase.ts                 browser Supabase client (from env vars)
│   ├── store.tsx                   AppProvider (global state; Supabase + a small localStorage slice)
│   ├── useActions.tsx               useRequireAuth / useActionResolver
│   ├── categoryIcons.tsx
│   ├── distance.ts                  Haversine distance calculation
│   ├── format.ts                    location/distance display formatting
│   └── time.ts                      relative "time ago" formatting
├── supabase/
│   ├── schema.sql                   tables + Row Level Security policies (run once)
│   └── seed.sql                     17 real Toronto providers across all 6 categories
├── .env.local.example               Supabase URL/key template — copy to .env.local
└── start-app.bat / .claude/launch.json   desktop-icon launcher (project root)
```

---

## Backend Setup

Required once, before `npm run dev` will show any providers:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql` (optional if you'll run the Google import below).
3. In Auth settings, confirm Email OTP is enabled and its template sends a 6-digit code (not just a magic-link button).
4. Copy `.env.local.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the project's API settings page. The anon key is safe to expose client-side — RLS policies are what actually gate access.

Without this, the app still runs (falls back to an empty provider list with a console warning) — useful for UI-only work, not for testing real data.

### Importing real listings from Google Places

`scripts/import-google-places.mjs` bulk-loads real businesses for each category into `providers` via the Google Places API (New) Text Search. It's re-runnable: rows are keyed on `google_place_id`, so a second run refreshes rather than duplicates, and a hand-seeded row with the same phone number gets linked to its Google place instead of duplicated. It never touches reviews, `verified`, `claimed`, or `recommend_count` — imported businesses start at zero reviews like everything else.

1. Google Cloud console → enable **Places API (New)** → create an API key restricted to it.
2. Add `GOOGLE_PLACES_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase Settings → API) to `.env.local`. Both are server-only — never prefix them with `NEXT_PUBLIC_`.
3. If your database predates this, run `supabase/migration_003_google_places.sql`.
4. Preview, then import:

```bash
npm run import:google -- --dry-run
npm run import:google -- --city "Toronto, ON" --city "Mississauga, ON" --pages 2
```

Flags: `--city` (repeatable, exact `lib/cities.ts` string, default Toronto), `--category` (repeatable, default all six), `--pages 1-3` (20 results each), `--include-no-phone`, `--dry-run`. Each city × category × page is one billable Text Search call.

### Importing Google ratings and reviews

After the listings import, run `scripts/import-google-reviews.mjs` to pull each Google-sourced provider's Google rating, review count, Maps link, and up to 5 reviews (Google's API maximum) — one Place Details call per provider. Run `supabase/migration_004_google_reviews.sql` first on an existing database.

```bash
npm run import:google-reviews -- --dry-run --limit 3
npm run import:google-reviews                        # only providers never synced
npm run import:google-reviews -- --refresh           # re-fetch everyone
```

These go in a separate `google_reviews` table, never `reviews`: they're strangers' Google Maps reviews, not neighbor recommendations, so they don't affect `rating`/`reviewCount` and render in their own "From Google" section on the provider page (loaded per page, not with the list), with author attribution and a "See all on Google Maps" link. List cards show Google's aggregate as a separate "★ 4.8 · 60 on Google" line.

**Terms caveat:** Google's Maps Platform terms only permit storing `place_id` indefinitely (and coordinates for 30 days); persisting names/phones/addresses as this import does isn't permitted. This was a deliberate choice for simplicity — the compliant alternative is storing only `place_id` and fetching details live through a server route. Revisit before a public launch.

## Getting Started

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Or use the **"Local Services App"** desktop shortcut, which starts the dev server and opens the browser automatically.

```bash
npm run build   # production build + typecheck
```

## Known Limitations

- Apple/Google sign-in buttons are visual stubs (disabled) — no OAuth provider wired up yet, only email OTP.
- Phase-2 chat is a local, non-persistent mock conversation (no real messaging backend).
- Geolocation captures real coordinates for distance sorting, but doesn't reverse-geocode them into a postal code — the displayed postal code stays a fixed placeholder after "Use current location."
- No admin UI for managing listings yet — edit `providers`/`reviews` directly in the Supabase Studio table editor.
- No rate limiting or spam protection on user-submitted reviews/recommendations.
- New users' trust stats (and the "Trusted neighbor" badge) start honestly at zero — there's no seeded baseline anymore.
