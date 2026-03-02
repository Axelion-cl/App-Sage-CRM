# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
```

There are no automated tests in this project.

## Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY
FORCEMANAGER_PUBLIC_KEY     # FM username
FORCEMANAGER_PRIVATE_KEY    # FM password
CRON_SECRET                 # Bearer token protecting /api/cron/classify
```

## Architecture

This is a Next.js 16 App Router PWA for BIENEK (a distribution company) that tracks purchase orders (OC = Orden de Compra) by classifying incoming emails using Gemini AI.

### Data Flow

1. **Fetch** — `forcemanager.ts` pulls today's emails from ForceManager (Sage Sales Management) CRM API v4 and user list.
2. **Cache check** — `dashboard-service.ts` queries Supabase to find already-classified emails by `fm_email_id`.
3. **Classify** — New emails are sent to Gemini (`classifier.ts`), max 5 at a time with 2s delay (rate limit: 15 RPM). Each call uses up to 10 recent manual-feedback examples for few-shot learning.
4. **Persist** — Results are upserted to `tracking_emails` in Supabase with `onConflict: 'fm_email_id'`.
5. **Display** — Dashboard shows OC counts aggregated per sales rep.

### Key Architectural Decisions

**ForceManager API workarounds** (`src/lib/forcemanager.ts`):
- The `dateCreated` filter is silently broken in FM API — date filtering is done in JavaScript after fetching.
- Emails are sorted by ID ascending (oldest first). To get today's emails, the code finds the last page via exponential probing + binary search, then walks backward until it passes the target date.
- Maximum 50 results per page regardless of `rowcount` parameter.
- Auth: POST to `/login` → JWT returned → pass via `X-Session-Key` header. Token is cached in module scope.

**Classification logic** (`src/lib/classifier.ts`):
- Uses `gemini-2.5-flash`. Returns `{ esOC, motivo, confianza, fuentePrincipal }`.
- Prompt analyzes subject, body (truncated at 5000 chars), and attachment filenames together.
- When in doubt, classifier is biased toward `esOC: true` (false positives preferred over missed orders).
- `manual_override: true` rows are never re-classified; they feed few-shot examples to future requests.

**Dashboard behavior** (`src/lib/dashboard-service.ts`):
- If `targetDate === today` (America/Santiago timezone), it fetches FM and classifies new emails.
- If `targetDate` is a past day, it reads only from Supabase (historical data, no FM calls).
- Non-sales users (xavi, claudia caamaño, bienek force) are filtered out by name matching.

### Pages and Routes

| Path | File | Type |
|------|------|------|
| `/` | `src/app/page.tsx` | RSC — redirects to `/login` |
| `/login` | `src/app/login/page.tsx` | Login form |
| `/dashboard` | `src/app/dashboard/page.tsx` | RSC — OC summary per rep, supports `?date=YYYY-MM-DD` |
| `/dashboard/[salesRepId]` | `src/app/dashboard/[salesRepId]/page.tsx` | RSC — per-rep email list with feedback |
| `/dashboard/logs` | `src/app/dashboard/logs/page.tsx` | RSC — full classification log table |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/sync` | POST | Re-classify emails for one sales rep on a given date. Respects `manual_override`. |
| `/api/sync-all` | POST | Re-classify all emails for all reps on a given date. Used by `GlobalSyncButton`. |
| `/api/feedback` | PATCH | Mark an email as OC/not-OC manually. Sets `manual_override: true`. |
| `/api/cron/classify` | GET | Vercel cron job (daily at 22:00 UTC). Protected by `CRON_SECRET` bearer token. |

### Supabase Schema (`tracking_emails`)

```
id (UUID, PK)
fm_email_id (int, unique)   — ForceManager email ID
subject, body
is_oc (bool)
classification_reason (text) — Gemini's explanation
confidence ('alta'|'media'|'baja')
sales_rep_id (int)
received_at (timestamptz)
manual_override (bool)       — If true, never re-classify via sync
feedback_notes (text)
created_at
```

### Client Components

Under `src/app/dashboard/[salesRepId]/`:
- `EmailListClient.tsx` — interactive email list with filtering tabs
- `FeedbackButtons.tsx` — thumbs up/down to trigger `/api/feedback`
- `EmailContentModal.tsx` — modal to view raw email body
- `ExpandableReason.tsx` — expand/collapse Gemini classification reason
- `SyncButton.tsx` — triggers `/api/sync` for the current rep

Top-level dashboard client components:
- `GlobalSyncButton.tsx` — triggers `/api/sync-all`
- `DateSelector.tsx` — date picker that updates `?date=` query param

### Design System

- Dark theme: background `#020617`, accent `#10b981` (emerald-500)
- CSS class `glass` = glassmorphism card style (defined in `globals.css`)
- CSS class `animate-reveal` = staggered fade-in animation
- Font: Outfit (Google Fonts via `next/font`)
- All locale/date formatting uses `es-CL` or `en-CA` with `timeZone: 'America/Santiago'`
