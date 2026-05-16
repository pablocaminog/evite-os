# whosisdown

**The free, open-source alternative to Evite.**

Send party invitations by email or text, collect RSVPs, and see your headcount in real time — with no ads, no upsells, and no account required for guests.

→ **[whosisdown.com](https://whosisdown.com)**

---

## What it does

You create a party in under a minute. Your guests get a personal link by email or SMS and tap once to RSVP. You see live counts on your dashboard.

- **Email & SMS invites** — send to any mix of email addresses and phone numbers
- **Live RSVP tracking** — attending / declined / pending, adult + kid headcount, dietary notes
- **Cover images** — upload any photo or generate one with AI
- **No guest accounts** — guests click their link and RSVP, nothing to install or sign up for
- **Passkey sign-in** — organizers can create a secure account with a fingerprint or Face ID, no password needed
- **Guest or signed-in mode** — sign in to keep your parties forever; guest parties auto-expire after 6 months
- **Export CSV** — download your full guest list anytime
- **Human verification** — Cloudflare Turnstile on sign-up and party creation, no annoying CAPTCHAs

---

## Why

Evite exists but it's bloated, ad-supported, and paywalls basic features. This is the version that should exist: open source, no tracking, no ads, no friction.

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Framework | Astro 6 (server-side rendering) |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 (cover images) |
| Email | Cloudflare Email Workers |
| SMS | Telnyx REST API |
| Auth | WebAuthn / Passkeys (`@simplewebauthn`) |
| Bot protection | Cloudflare Turnstile |
| Styles | Tailwind CSS v4 |

---

## Self-hosting

Everything runs on Cloudflare's free tier (within limits).

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- Node.js ≥ 22

### Setup

```bash
git clone https://github.com/pablocaminog/evite-os
cd evite-os
npm install
```

**1. Create Cloudflare resources**

```bash
# D1 database
wrangler d1 create evite-os

# R2 bucket
wrangler r2 bucket create evite-os-images
```

Update `wrangler.toml` with the D1 database ID returned above.

**2. Run migrations**

```bash
wrangler d1 execute evite-os --remote --file=migrations/0001_init.sql
wrangler d1 execute evite-os --remote --file=migrations/0002_guest_adult_kid_count.sql
wrangler d1 execute evite-os --remote --file=migrations/0003_auth.sql
```

**3. Set secrets**

```bash
wrangler secret put TELNYX_API_KEY        # from telnyx.com
wrangler secret put TURNSTILE_SECRET_KEY  # from dash.cloudflare.com/turnstile
```

**4. Update `wrangler.toml` vars**

```toml
[vars]
APP_URL      = "https://yourdomain.com"
FROM_EMAIL   = "noreply@yourdomain.com"
FROM_PHONE   = "+1your_telnyx_number"
TURNSTILE_SITE_KEY = "your_turnstile_sitekey"
```

**5. Deploy**

```bash
npm run build
wrangler deploy
```

---

## Development

```bash
npm run dev       # local dev server
npm test          # run tests (Vitest)
```

---

## License

MIT — do whatever you want with it.
