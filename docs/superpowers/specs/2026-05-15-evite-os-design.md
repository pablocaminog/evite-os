# evite-os Design Spec

**Date:** 2026-05-15  
**Status:** Approved

## Overview

Open source party invitation app. Send invitations by email and SMS, track RSVPs and counts. Designed for kids' party organizers. Runs on Cloudflare Workers; anyone can self-host.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Frontend | Astro (hybrid mode) + `@astrojs/cloudflare` adapter |
| Database | D1 (SQLite) |
| Image storage | R2 |
| Email | Cloudflare Email Workers |
| SMS | Telnyx |

## Auth Model

**Organizer:**
- Create party → receive secret `/manage/<uuid>` URL (bookmark to return)
- Optionally request magic link → email → same management URL
- Magic links: one-time use, 24h TTL

**Guest:**
- Receives personal `/invite/<uuid>` link via email or SMS
- No account required
- Link stays valid so guest can update RSVP

## Architecture

Hybrid Astro app deployed as single Cloudflare Worker with Static Assets:

- Static (pre-rendered): landing page
- SSR (dynamic): organizer dashboard, RSVP page, create party
- API routes: Astro endpoints handling all mutations

No separate backend service. No CORS needed. One `wrangler deploy`.

## Data Model

### `parties`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID, PK |
| management_token | TEXT | UUID, UNIQUE — secret organizer URL token |
| title | TEXT | NOT NULL |
| description | TEXT | |
| event_date | TEXT | ISO datetime |
| location | TEXT | |
| image_key | TEXT | R2 object key for cover image |
| organizer_name | TEXT | NOT NULL |
| organizer_email | TEXT | |
| organizer_phone | TEXT | |
| rsvp_deadline | TEXT | ISO datetime |
| created_at | TEXT | default now() |

### `guests`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID, PK |
| party_id | TEXT | FK → parties.id |
| name | TEXT | NOT NULL |
| email | TEXT | nullable — need email or phone |
| phone | TEXT | nullable — need email or phone |
| rsvp_token | TEXT | UUID, UNIQUE — personal RSVP link |
| status | TEXT | `pending` \| `attending` \| `declined` |
| guest_count | INTEGER | default 1 |
| dietary_notes | TEXT | |
| invited_at | TEXT | default now() |
| responded_at | TEXT | nullable |

### `magic_links`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | UUID, PK |
| party_id | TEXT | FK → parties.id |
| token | TEXT | UUID, UNIQUE |
| used | INTEGER | 0/1 — consumed on first click |
| expires_at | TEXT | now + 24h |
| created_at | TEXT | default now() |

**Constraints:**
- Guest must have email or phone (not both required)
- `management_token` is separate from `id` — safe to expose party id in URLs
- `rsvp_token` stays valid across updates

## Pages

### Static
| Route | Purpose |
|-------|---------|
| `/` | Landing — hero, "Create Party" CTA, how it works |

### SSR
| Route | Purpose |
|-------|---------|
| `/party/new` | Create party form |
| `/manage/[token]` | Organizer dashboard |
| `/invite/[rsvp_token]` | Guest RSVP page |
| `/magic-link` | Request magic link by email |

## API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/parties` | none | Create party → returns management URL |
| POST | `/api/parties/[id]/guests` | management_token header | Add guests |
| POST | `/api/parties/[id]/invite` | management_token header | Send email/SMS to pending guests |
| POST | `/api/rsvp/[rsvp_token]` | none (token = auth) | Submit or update RSVP |
| POST | `/api/magic-link` | none | Request magic link — only works if organizer provided email at creation |
| POST | `/api/upload` | management_token header | Upload cover image to R2 |
| GET | `/api/parties/[id]/export` | management_token header | Download guest list CSV |
| GET | `/images/[party_id]/cover` | none | Serve cover image from R2 |

Management token passed as `X-Management-Token` request header.

## Organizer Dashboard (`/manage/[token]`)

- Party details (edit inline)
- Summary: total invited / attending / declined / pending, total headcount
- Guest table: name, contact, status, count, dietary notes, invited/responded dates
- Add guest(s) form: name, email, phone
- "Send invites" button — sends to all pending guests
- "Resend" per guest
- Export CSV button
- Cover image upload

## Guest RSVP Page (`/invite/[rsvp_token]`)

- Party cover image
- Party title, date, time, location, description
- RSVP form:
  - Name (pre-filled from guest record)
  - Attending? (Yes / No)
  - How many people coming? (number input, shown if attending = Yes)
  - Dietary restrictions / notes (textarea)
  - Submit button
- After submit: confirmation message, party details summary

## Email & SMS Content

**Invitation email:**
- Subject: `You're invited to [party title]!`
- Body: party details + cover image + big RSVP button linking to `/invite/[rsvp_token]`

**Invitation SMS:**
- `[organizer_name] invited you to [party title] on [date]. RSVP: https://yourdomain.com/invite/[rsvp_token]`

**Magic link email:**
- Subject: `Your evite-os management link`
- Body: link to `/manage/[management_token]`, expires in 24h

## Image Upload

- Max size: 5MB
- Accepted: JPEG, PNG, WebP
- Stored in R2 under key `parties/[party_id]/cover`
- Served via `/images/[party_id]/cover` (Worker fetches from R2)
- Docs include prompt templates for generating party images with ChatGPT / Gemini

## Project Structure

```
evite-os/
├── src/
│   ├── pages/
│   │   ├── index.astro              # static
│   │   ├── party/
│   │   │   └── new.astro            # SSR
│   │   ├── manage/
│   │   │   └── [token].astro        # SSR
│   │   ├── invite/
│   │   │   └── [rsvp_token].astro   # SSR
│   │   ├── magic-link.astro         # SSR
│   │   └── api/
│   │       ├── parties.ts
│   │       ├── parties/
│   │       │   └── [id]/
│   │       │       ├── guests.ts
│   │       │       └── invite.ts
│   │       ├── rsvp/
│   │       │   └── [rsvp_token].ts
│   │       ├── magic-link.ts
│   │       ├── upload.ts
│   │       └── export/
│   │           └── [token].ts
│   ├── lib/
│   │   ├── db.ts         # D1 query helpers
│   │   ├── email.ts      # CF Email Workers
│   │   ├── sms.ts        # Telnyx
│   │   ├── storage.ts    # R2 upload/fetch
│   │   └── tokens.ts     # UUID generation
│   └── components/
│       ├── PartyForm.astro
│       ├── GuestTable.astro
│       ├── RsvpForm.astro
│       └── InviteForm.astro
├── migrations/
│   └── 0001_init.sql
├── docs/
│   └── image-generation-prompts.md  # LLM prompt guide
├── wrangler.toml
├── astro.config.mjs
└── package.json
```

## Configuration (wrangler.toml)

```toml
name = "evite-os"
main = "dist/_worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "evite-os"
database_id = "<your-d1-id>"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "evite-os-images"

[vars]
FROM_PHONE = "+1234567890"
FROM_EMAIL = "noreply@yourdomain.com"
APP_URL = "https://yourdomain.com"

# Secrets — set with: wrangler secret put TELNYX_API_KEY
# TELNYX_API_KEY
```

## Out of Scope

- Party capacity limits
- Payments / ticketing
- Guest comments / wall
- Push notifications
- Analytics beyond RSVP counts
- Admin panel (multi-party management across users)
