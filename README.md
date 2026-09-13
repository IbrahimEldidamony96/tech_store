# Tech Store

A full-stack bilingual (EN/AR) e-commerce platform built to demonstrate production-grade full-stack architecture: authentication & RBAC, cart/wishlist, checkout with atomic stock handling, a payment/shipment state machine, verified-purchase reviews, and a full admin dashboard.

## Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Framework  | Next.js 16 (App Router)                               |
| Language   | TypeScript                                            |
| Database   | PostgreSQL                                            |
| ORM        | Prisma 7 (driver adapters, `@prisma/adapter-pg`)      |
| Auth       | Auth.js v5 (Google OAuth + Credentials, JWT sessions) |
| Styling    | Tailwind CSS v4                                       |
| Validation | Zod                                                   |

## Features

- **Catalog** — categories (with hierarchy), brands, products with option/value/variant support (e.g. size × color)
- **Auth & RBAC** — Google OAuth + email/password, JWT sessions, admin-only routes enforced in `proxy.ts` (Next.js 16's middleware convention)
- **Cart & Wishlist** — IDOR-protected, optimistic UI updates
- **Checkout** — atomic stock decrement via Prisma transactions, coupon validation, real Bosta-tied shipping cost calculated before the order is placed
- **Orders** — payment/shipment state machine with guarded transitions (`canTransitionOrder`, `canTransitionPayment`, `canTransitionShipment`)
- **Reviews** — five-condition verified-purchase check before a review is allowed
- **Admin dashboard** — full CRUD for products, categories, brands, options, values, variants, and per-governorate shipping rates

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local, or a free instance on [Neon](https://neon.tech) / [Supabase](https://supabase.com))
- A Google Cloud OAuth Client (for Google sign-in)

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your env file (see table below) then fill in the values
cp .env.example .env
# On Windows PowerShell, use: Copy-Item .env.example .env

# 3. Generate the Prisma client (required — app/generated/prisma is gitignored)
npx prisma generate

# 4. Run migrations against your database
npx prisma migrate dev

# 5. Seed demo data (optional but recommended)
npx prisma db seed

# 6. Start the dev server
npm run dev
```

App runs at `http://localhost:3000`.

> **Windows note:** if you ever recreate folders with bracket names (e.g. `[id]`), use `New-Item -ItemType Directory -LiteralPath "app\api\products\[id]"` — plain PowerShell paths misinterpret `[id]` as a wildcard.

## Environment Variables

| Variable                       | Description                                                                                                                                  | Example                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`                 | Postgres connection string                                                                                                                   | `postgresql://user:pass@localhost:5432/techstore` |
| `AUTH_SECRET`                  | Encrypts Auth.js JWTs/cookies. **Must be named `AUTH_SECRET`**, not `BETTER_AUTH_SECRET`                                                     | generate below                                    |
| `AUTH_GOOGLE_ID`               | Google OAuth Client ID                                                                                                                       | from Google Cloud Console                         |
| `AUTH_GOOGLE_SECRET`           | Google OAuth Client Secret                                                                                                                   | from Google Cloud Console                         |
| `BOSTA_API_KEY`                | Bosta business API key                                                                                                                       | from business.bosta.co → API settings             |
| `BOSTA_BASE_URL`               | Bosta API base URL (optional, defaults to production)                                                                                        | `https://stg-app.bosta.co` for testing            |
| `BOSTA_WEBHOOK_SECRET`         | Your own secret — set as the custom Authorization header value in Bosta's webhook dashboard settings                                         | any random string                                 |
| `DEFAULT_SHIPPING_FEE`         | Fallback shipping fee (EGP) used for any governorate that hasn't been configured yet at `/admin/shipping-rates` (optional, defaults to `75`) | `75`                                              |
| `PAYMOB_SECRET_KEY`            | Paymob secret key (starts `skl_`)                                                                                                            | from Paymob dashboard → Developers                |
| `PAYMOB_PUBLIC_KEY`            | Paymob public key (starts `pk_`)                                                                                                             | from Paymob dashboard → Developers                |
| `PAYMOB_HMAC_SECRET`           | Used to verify the payment webhook is genuinely from Paymob                                                                                  | from Paymob dashboard → Developers                |
| `PAYMOB_INTEGRATION_ID_CARD`   | Integration ID for the card payment method                                                                                                   | from Paymob dashboard → Payment Integrations      |
| `PAYMOB_INTEGRATION_ID_WALLET` | Integration ID for mobile wallets (e.g. Vodafone Cash)                                                                                       | from Paymob dashboard → Payment Integrations      |
| `CLOUDINARY_CLOUD_NAME`        | Cloudinary cloud name                                                                                                                        | from Cloudinary dashboard                         |
| `CLOUDINARY_API_KEY`           | Cloudinary API key                                                                                                                           | from Cloudinary dashboard                         |
| `CLOUDINARY_API_SECRET`        | Cloudinary API secret — never exposed to the browser                                                                                         | from Cloudinary dashboard                         |

Generate `AUTH_SECRET` (works the same in PowerShell, bash, or macOS):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

For Google OAuth, set the authorized redirect URI in Google Cloud Console to:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://<your-domain>/api/auth/callback/google`

## Demo Accounts (after seeding)

| Role     | Email                 | Password      |
| -------- | --------------------- | ------------- |
| Admin    | `admin@techstore.com` | `password123` |
| Customer | `ahmed@example.com`   | `password123` |

Coupon code: `WELCOME10`

## NPM Scripts

| Command                  | Purpose                          |
| ------------------------ | -------------------------------- |
| `npm run dev`            | Start local dev server           |
| `npm run build`          | Production build                 |
| `npm run start`          | Run the production build         |
| `npm run lint`           | Run ESLint                       |
| `npx prisma studio`      | Browse the database visually     |
| `npx prisma migrate dev` | Create/apply a migration locally |
| `npx prisma db seed`     | Re-run the seed script           |

## Deploying to the Cloud (Neon + Vercel)

**One-time prep — before your first deploy:**

Add a `postinstall` hook so Vercel regenerates the Prisma client on every build (Vercel doesn't know to run this otherwise):

```jsonc
// package.json
"scripts": {
  "postinstall": "prisma generate",
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

**1. Create the database (Neon)**

```bash
# Install Neon's CLI (one-time)
npm install -g neonctl

# Log in and create a project
neonctl auth
neonctl projects create --name tech-store

# Get the pooled connection string (use this one for serverless — it goes through PgBouncer)
neonctl connection-string --pooled
```

> Prefer the web UI? Create a project at [console.neon.tech](https://console.neon.tech), then copy the **pooled** connection string — Vercel's serverless functions open many short-lived connections, and the pooled endpoint avoids exhausting Postgres's connection limit. (Supabase works the same way: use its "Transaction" pooler connection string, port `6543`.)

**2. Apply your schema to the cloud database**

```bash
# macOS/Linux — point at the cloud DB for this one command
DATABASE_URL="<your-neon-pooled-url>" npx prisma migrate deploy

# Windows PowerShell
$env:DATABASE_URL="<your-neon-pooled-url>"; npx prisma migrate deploy

# Optional: seed demo data into the cloud DB too (PowerShell)
$env:DATABASE_URL="<your-neon-pooled-url>"; npx prisma db seed
```

**3. Deploy to Vercel**

```bash
npm install -g vercel

vercel login
vercel link          # links this folder to a Vercel project

# Add each env var (repeat for AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET)
vercel env add DATABASE_URL production
vercel env add AUTH_SECRET production
vercel env add AUTH_GOOGLE_ID production
vercel env add AUTH_GOOGLE_SECRET production

# Ship it
vercel --prod
```

After the first deploy, update the Google OAuth redirect URI to your live `*.vercel.app` (or custom) domain.

## Payments — Paymob Integration

Card and mobile wallet payments go through [Paymob](https://accept.paymob.com) (Intention API + Unified Checkout). Cash on Delivery skips this entirely.

- Checkout creates the order, then starts a Paymob payment intention and redirects the customer to Paymob's hosted checkout page.
- Paymob calls back `POST /api/webhooks/paymob?hmac=...` when payment succeeds or fails — the handler verifies the HMAC signature before touching the database (fields/order documented in `lib/paymob.ts`, sourced from Paymob's own official AI-integration reference, not guessed).
- If a customer abandons the Paymob page or the intention fails to create, the order stays `PENDING` and a **"Complete Payment"** button appears on `/orders/[id]` to generate a fresh payment link — Paymob's `client_secret` is single-use.
- Admin's "Mark Payment Paid/Failed" buttons are now a manual override/reconciliation tool (e.g. a webhook got lost), not the primary path.
- This store is Egypt-only for now — the country code sent to Paymob (`EGY`) is hardcoded in `lib/paymob.ts`.

## Shipping — Bosta Integration

Bosta is this store's only, default shipping carrier — there's no other carrier option in checkout.

- The customer picks their governorate, area, and district through three cascading dropdowns backed live by Bosta's own data (`app/api/bosta/cities` → `app/api/bosta/zones` → `app/api/bosta/districts`) — never free text. This matters because Bosta's location model has three real tiers, not two: a governorate (`cityId`) contains many zones, and each **zone** contains many **districts** — `districtId` is what delivery creation actually validates against (confirmed the hard way via Bosta's own `Error 3003: District Not Found` when a zone ID was sent in that field instead). The resolved `cityId`/`districtId` are cached on the address (and snapshotted onto the order at checkout) so later steps never have to re-match a name back to an id.
- For addresses that predate this three-level flow (no cached ids), `lib/bosta.ts` falls back to matching the saved area name against a zone, then uses the first district within it — not perfectly precise, but always a real, valid district rather than failing.
- **Shipping cost is calculated before the order is placed**, not after. Bosta doesn't expose a public real-time price-quote API — their business pricing is a negotiated flat-rate card per governorate, set up when you sign up with them — so this app keeps its own `ShippingRate` table (one fee per real Bosta governorate) managed at **`/admin/shipping-rates`**. Checkout (`app/api/checkout/route.ts`) and the live cost preview shown on the checkout page (`app/api/checkout/shipping-cost/route.ts`) both read from this same table via `lib/shipping-cost.ts`, so the price the customer sees is exactly what gets charged. Any governorate without a configured rate falls back to `DEFAULT_SHIPPING_FEE` rather than blocking checkout. Orders over 1000 EGP still ship free, layered on top of the real per-governorate fee.
- Admin clicks **"Ship with Bosta"** on an order → we call `POST https://app.bosta.co/api/v2/deliveries?apiVersion=1` with the order's cached `cityId`/`districtId` and store the returned `trackingNumber`/`bostaDeliveryId`.
- Register your webhook **once** in the Bosta dashboard (Settings → API Integration → Request OTP → Set Up Your Webhook), not per-delivery: URL `https://<your-domain>/api/webhooks/bosta`, plus a custom Authorization header — set its value to your `BOSTA_WEBHOOK_SECRET` (our handler reads it from the `x-webhook-secret` request header).
- Cancelling an order in the admin also attempts to cancel the Bosta delivery (best-effort — won't block cancellation if Bosta rejects it, e.g. already picked up) and updates the local shipment status to `RETURNED` once Bosta confirms.

## Known Gotchas (learned the hard way)

- `app/generated/prisma` must be regenerated with `npx prisma generate` any time `app/` is replaced or after a fresh clone.
- Use `AUTH_SECRET` — using `BETTER_AUTH_SECRET` causes a persistent `MissingSecret` error.
- `@relation` attributes in `schema.prisma` must stay single-line; multi-line breaks the parser.
- Next.js 16 renamed `middleware.ts` → `proxy.ts` with a named `proxy` export (already done here).
- `typedRoutes: false` in `next.config.ts` avoids false-positive type errors on dynamic `href` template literals.
- Prisma 7 does **not** auto-run seeds on `migrate dev`/`migrate deploy` — always run `npx prisma db seed` explicitly.
- `ShippingRate` starts empty after a fresh clone/seed — checkout still works (via `DEFAULT_SHIPPING_FEE`), but visit `/admin/shipping-rates` and fill in what Bosta actually quoted you per governorate.
- Bosta's `cancelBostaDelivery`/`getBostaTracking` endpoint shapes in `lib/bosta.ts` haven't been exercised against a real API response yet (unlike `/cities`, `/zones`, and `POST /deliveries`, which have) — if either errors, paste the response back and we'll correct it against what Bosta actually returns.
