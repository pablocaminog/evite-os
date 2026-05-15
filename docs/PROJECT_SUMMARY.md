# whosisdown — Project Summary

**Built:** 2026-05-15  
**Status:** MVP deployed, functional, ready for redesign

---

## What It Is

Open source party invitation app. Organizer creates a party, adds guests, sends invites by email or SMS. Guests click a personal link to RSVP. Organizer sees live counts. No accounts, no bloat.

Built as an alternative to Evite — focused on kids' parties, zero friction.

---

## Live URLs

| | URL |
|---|---|
| **App** | https://whosisdown.com (custom domain — confirm in CF dashboard) |
| **Fallback** | https://evite-os.typeauth.workers.dev |
| **Repo** | https://github.com/pablocaminog/evite-os |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Framework | Astro 6 (`output: 'server'`, hybrid) |
| Database | Cloudflare D1 (SQLite) — `evite-os` |
| Images | Cloudflare R2 — `evite-os-images` |
| Email | Cloudflare Email Workers (`SEND_EMAIL` binding) |
| SMS | Telnyx REST API |
| Tests | Vitest — 21 tests, 5 files |

---

## What Works Today

- **Create party** — title, date, location, description, cover image upload
- **Organizer dashboard** — `/manage/[token]` — guest list, RSVP counts, headcount
- **Add guests** — name + email and/or phone
- **Send invitations** — email (CF Email Workers) + SMS (Telnyx) to pending guests
- **Guest RSVP** — `/invite/[token]` — attending/declined, count, dietary notes
- **Magic link recovery** — organizer enters email, gets management link
- **Export CSV** — download guest list
- **Cover image** — upload from device, display on invite + dashboard

---

## Auth Model

- **Organizer:** 64-char hex token embedded in management URL. No account. Magic link email for recovery (24h TTL, one-time use).
- **Guest:** Personal RSVP token in link. No account. Can update RSVP anytime.

---

## Data Model (D1)

3 tables: `parties`, `guests`, `magic_links`. Schema at `migrations/0001_init.sql`.

Key constraints:
- Guest needs email OR phone (enforced at DB level)
- `guest_count >= 1` check
- Magic links: one-time use + expiry enforced in same query

---

## Configuration (wrangler.toml)

**Vars** (edit and redeploy to change):
- `APP_URL` = `https://whosisdown.com`
- `FROM_EMAIL` = needs real sender address
- `FROM_PHONE` = needs real Telnyx number

**Secrets** (set once, never committed):
```bash
wrangler secret put TELNYX_API_KEY
```

**D1 ID** (real, local only — not in git):
`8ed081e2-2a09-4152-aaac-f2046d599e92`

> `wrangler.toml` is marked `assume-unchanged` locally so the real D1 ID doesn't get committed. The public repo has `YOUR_D1_DATABASE_ID` as placeholder.

---

## What's Missing / Known Issues

| Issue | Notes |
|---|---|
| Email not fully wired | CF Email Workers needs domain verified in Email Routing |
| FROM_EMAIL placeholder | Replace `noreply@yourdomain.com` with real verified sender |
| FROM_PHONE placeholder | Replace with real Telnyx number |
| No RSVP deadline enforcement | Deadline stored but not checked server-side |
| No party edit page | Dashboard shows details but no edit form |
| No guest delete | Can add guests, can't remove them |
| No re-send throttle | Can spam invites to same guest |
| Image upload error silent | Failed upload gives no feedback to user |
| Dashboard shows date but not time | Minor display gap |

---

## File Structure

```
src/
  pages/
    index.astro              ← static landing
    party/new.astro          ← create party
    manage/[token].astro     ← organizer dashboard
    invite/[rsvp_token].astro← guest RSVP page
    magic-link.astro         ← link recovery
    api/                     ← all API routes
    images/[party_id]/cover  ← R2 image serve
  components/
    PartyForm.astro
    GuestTable.astro
    InviteForm.astro
    RsvpForm.astro
  lib/
    db.ts      ← all D1 queries
    email.ts   ← CF Email Workers
    sms.ts     ← Telnyx
    storage.ts ← R2
    tokens.ts  ← UUID/hex generation
migrations/
  0001_init.sql
docs/
  image-generation-prompts.md  ← AI prompt guide for cover images
```

---

## Next Session: Full Redesign

Current UI is functional but plain (inline styles, no design system). Redesign goals:

- Brand identity for **whosisdown.com**
- Mobile-first, polished invite page (this is what guests see — most important)
- Dashboard UX improvements (inline edit, better table, resend flow)
- Landing page that sells the product
- Consider: Tailwind or CSS-in-astro component library

**Start point for redesign:** `src/pages/invite/[rsvp_token].astro` and `src/components/RsvpForm.astro` — this is the highest-traffic, most user-facing surface.
