# Plan: Cloud beacon + audit dashboard

**Status as of writing:** Tickbox v0.0.17 OSS SDK is shipped. 6 packages on npm, docs live at docs.tickbox.dev with API reference and supported-vendors registry. Three real production users (`tinysystems.io`, `pictag.io`, `smesolutions.uk`). No paid tier yet.

**Why this matters:** the OSS SDK is mature. The piece that turns Tickbox from a useful library into a business is the audit log + dashboard. Compliance buyers (the people who actually pay for OneTrust / Cookiebot) need to be able to point at a UI and say "yes, here's the audit trail of every consent decision tied to a policy version, downloadable as evidence." The SDK doesn't deliver that on its own.

---

## Architecture

Three pieces, two repos, two runtimes.

```
                ┌─────────────────────────────────────┐                ┌───────────────────────────┐
                │  GKE cluster (existing)             │                │  Cloudflare (new)         │
                │                                     │                │                           │
  Operator ───▶│  Keycloak (existing) ◀──── OIDC ────│───────────────▶│  api.tickbox.dev          │
  (us / customer)│  realm: tickbox                   │   redirect      │  Worker                   │
                │                                     │   flow          │                           │
                │  ┌───────────────────────────┐      │                │   POST /v1/events  ──┐    │
                │  │  app.tickbox.dev          │      │  HTTPS + JWT   │   GET  /v1/events  ──┤    │
                │  │  Go + chi + templ + htmx  │──────│───────────────▶│   POST /v1/sites    ─┤    │
                │  │  Helm chart, flux-managed │      │  (session)     │   …                  │    │
                │  └───────────────────────────┘      │                │                      ▼    │
                │                                     │                │   ┌─────────────────────┐ │
                └─────────────────────────────────────┘                │   │       D1            │ │
                                                                       │   │  (SQLite)           │ │
       Visitors' browsers ────────────────────────────────────────────▶│   │   - users           │ │
       (customer.com with @tickboxhq/cloud)                            │   │   - sites           │ │
                                                                       │   │   - consent_events  │ │
                                                                       │   └─────────────────────┘ │
                                                                       └───────────────────────────┘
```

The three new pieces:

1. **`@tickboxhq/cloud`** — opt-in npm package. One export: `beacon(state, options)` that POSTs a consent-change event to `api.tickbox.dev`. Wired into `applyConsent` via the existing `onApply` hook so existing apps add it with one line: `import { beacon } from '@tickboxhq/cloud'` plus `cloud: { apiKey: '...' }` in the config.

2. **`api.tickbox.dev`** — Cloudflare Worker. Receives consent events from the SDK (API-key auth), serves the dashboard's read endpoints (Keycloak JWT auth), writes to D1.

3. **`app.tickbox.dev`** — Go dashboard, deployed on GKE alongside the existing `tickbox-docs` workload. Server-rendered HTML with htmx for filters/pagination. Session is a signed cookie containing the Keycloak JWT.

### Why this stack

- **Go + templ + htmx for the dashboard.** The user is a Go developer with an existing GKE cluster, Helm charts, flux automation, and Keycloak. Using Next.js would mean a new runtime, a new deploy pipeline, and a ~100 MB image. Go gives us a static binary in a ~20 MB scratch image that drops into the existing Helm/flux flow with no new tools. The dashboard is server-rendered HTML for a table view, filters, and a CSV export — exactly the workload htmx was designed for.

- **Cloudflare Workers + D1 for the ingest path.** Pay-per-request, no idle cost. A site with 100k pageviews and 5% banner interaction is ~5k events / day. D1 is SQLite-shaped — perfect for an append-mostly audit log queried by `site_id + time range`. Estimated cost: $5/month at MVP (just the Workers Paid base for custom domains), ~$35/month at 1k customers.

- **Keycloak for auth.** Already running in the cluster. Replaces the magic-link + Resend / SES path the original draft had. Dashboard becomes a standard OIDC client (~80 LOC with `go-oidc`); the Worker verifies the Keycloak JWT against the realm's JWKS for dashboard API calls. Removes ~150 LOC of auth code and one external SaaS dependency.

- **One repo, two deploys.** The `tickboxhq/platform` repo holds the Go dashboard (deploys to GKE via Helm/flux) and the Worker (deploys to Cloudflare via wrangler). Same-repo because the wire format (the `POST /v1/events` payload, the GET response shape) is shared and changes lockstep.

- **Separate `@tickboxhq/cloud` package, not bundled in core.** Keeps OSS SDK truly zero-dependency cloud-free. Nobody using only `@tickboxhq/core` accidentally sends data anywhere.

---

## Data model (D1 schema)

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,    -- 'usr_xxx'
  keycloak_sub  TEXT UNIQUE NOT NULL,-- the OIDC `sub` claim — stable identity
  email         TEXT NOT NULL,       -- denormalised from Keycloak for display
  created_at    INTEGER NOT NULL
);

CREATE TABLE sites (
  id            TEXT PRIMARY KEY,    -- 'site_xxx'
  owner_id      TEXT NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  domain        TEXT,                -- the site's domain for display + sanity checks
  api_key_hash  TEXT NOT NULL,       -- bcrypt of the public API key
  api_key_prefix TEXT NOT NULL,      -- first 8 chars for display ('tb_pk_a1b2…')
  created_at    INTEGER NOT NULL
);

CREATE TABLE consent_events (
  id             TEXT PRIMARY KEY,   -- 'evt_xxx', uuid
  site_id        TEXT NOT NULL REFERENCES sites(id),
  visitor_hash   TEXT,               -- sha256 of cookie value, NOT the cookie itself
  jurisdiction   TEXT NOT NULL,      -- 'UK_DUAA' / 'EU_GDPR' / etc
  policy_version TEXT NOT NULL,
  decisions      TEXT NOT NULL,      -- JSON {analytics: true, marketing: false, …}
  user_agent     TEXT,
  country_code   TEXT,               -- from CF-IPCountry header
  created_at     INTEGER NOT NULL
);

CREATE INDEX idx_events_site_time ON consent_events(site_id, created_at DESC);
```

### Privacy guarantees baked in

- **`visitor_hash`, not `visitor_id`.** The cookie value is SHA-256'd in the browser before sending. A database leak doesn't deanonymize visitors. We can still answer "did this same browser consent before?" by hashing the same cookie value and looking it up.
- **No IP addresses stored.** `CF-IPCountry` gives a country code for jurisdiction stats without the raw IP, which would be PII under GDPR.

---

## Auth

Two surfaces, both terminate at Keycloak.

### Ingest path (Worker accepts beacon events)

- Site config in the customer's app: `cloud: { apiKey: 'tb_pk_…' }`
- Worker on `POST /v1/events`:
  1. Read `X-API-Key` header
  2. Look up site by `api_key_prefix` (indexed first 8 chars), verify bcrypt of the rest
  3. Write the event to D1
- No Keycloak involved. The API key is the credential. ~30 LOC of validation logic.

### Dashboard path (Go service on GKE → Worker for reads)

- Go dashboard is registered as an OIDC client in the `tickbox` realm (Keycloak).
- Login: `/auth/login` → 302 to Keycloak → user authenticates → 302 back with `?code=…` → exchange for tokens → store signed Keycloak JWT in `tb_session` HttpOnly cookie.
- Every dashboard request to the Worker carries the JWT in `Authorization: Bearer …`.
- Worker verifies the JWT against the realm's JWKS endpoint (cached for an hour), extracts `sub`, looks up the user in D1.
- Logout: clear cookie + redirect to Keycloak's `end_session_endpoint`.

No magic-link code, no Resend / SES, no KV for one-time codes.

---

## Phasing

### MVP (5 days, target $5/month infra cost)

Goal: a user can sign in via Keycloak, create a site, install `@tickboxhq/cloud`, and see their consent events in a table within 30 seconds of an interaction.

- [ ] **Day 1 — Worker + D1.** Scaffold Cloudflare Worker in `api/`. `schema.sql` for the three tables. `POST /v1/events` (API-key auth) and `GET /v1/events?site_id=…` (Keycloak JWT auth). Wrangler config + custom domain on `api.tickbox.dev`. Vitest + miniflare for unit tests.

- [ ] **Day 2 — `@tickboxhq/cloud` npm package.** Lives in the existing `tickbox/packages/cloud/` directory of the OSS repo (it's an SDK package, not platform code). `beacon(state, options)` POSTs to the Worker. `localStorage` retry queue with exponential backoff, drops after 24h. Vitest snapshots of the wire format. Plug into `applyConsent` via the existing `onApply` hook.

- [ ] **Day 3 — Go dashboard skeleton.** `cmd/dashboard/main.go` with chi router. OIDC client against Keycloak (`go-oidc`). `templ` templates for layout, login redirect, "you're signed in" stub. Tailwind via CLI (no Node runtime). Dockerfile multi-stage → scratch image. Helm chart `tickbox-platform` cloned from `tickbox-docs`. Flux release in `clusters/gke_tinyplatform/tickbox-platform/`. Ingress on `app.tickbox.dev` with letsencrypt-prod. First green deploy.

- [ ] **Day 4 — Sites + events views.** `templ` pages: site list, site detail (events table with htmx pagination and filter by jurisdiction / date range), "create site" form, API-key rotation. Worker endpoints to back them: `POST /v1/sites`, `GET /v1/sites`, `POST /v1/sites/:id/rotate-key`. Per-site stats (events/day, jurisdiction breakdown, decision splits) computed server-side, rendered as SVG.

- [ ] **Day 5 — Polish + first onboarding.** CSV export (streaming, `encoding/csv` to `http.ResponseWriter`). Empty states. Friendly errors. Walk `tinysystems.io` or `pictag.io` through `@tickboxhq/cloud` install and watch the first real event hit the dashboard.

Stop here if feedback says "this is enough to pay for." Otherwise continue.

### Sellable (~5 more days)

- [ ] Webhook out (POST event to a customer's URL on every consent change)
- [ ] Free tier: 1k events / month, paid tier: unlimited + retention policy
- [ ] Stripe integration for billing
- [ ] Per-site policy-version diff view ("show me what changed between v1 and v2 of the policy")
- [ ] Public marketing page at `tickbox.dev` (currently blank)
- [ ] Per-customer retention policy (cron `DELETE` on `consent_events` older than N days)

### Enterprise-tier (defer until requested)

SSO via Keycloak's federation, SCIM, custom retention, SOC 2 evidence collection, dedicated support contact. None of this until a $10k+/year customer asks.

---

## Future schema: billing + plans

When we wire up Stripe in the Sellable phase, the data still lives in D1. **Stripe is the source of truth; D1 is a read-cache.** This avoids a second database while keeping page renders cheap (no Stripe API call in the hot path).

### Where each piece lives

| Thing | Where | Why |
|---|---|---|
| Customer + payment method | Stripe | Stripe owns PCI scope; we never touch card data |
| Subscription state (`active` / `past_due` / `canceled`) | Stripe (source) → mirrored in D1 | Mirror so dashboard reads stay one D1 lookup |
| Plan definitions (`entry` / `pro` / `unlimited` + limits) | Code | Code-reviewed config, not customer data |
| Stripe Price IDs | Stripe | Stripe owns the price; we reference by ID |
| Per-customer usage counters (events / month) | D1 | Incremented on ingest, read for quota gates |
| Stripe webhook events processed | D1 (`stripe_events` idempotency log) | So Stripe retries don't double-process |
| Invoice history | Stripe (rendered by Customer Portal) | No reason to mirror |

### Schema additions

One column on `users`, three new tables. All in D1.

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

CREATE TABLE subscriptions (
  user_id            TEXT PRIMARY KEY REFERENCES users(id),
  stripe_sub_id      TEXT NOT NULL,
  plan               TEXT NOT NULL,        -- 'entry' | 'pro' | 'unlimited'
  status             TEXT NOT NULL,        -- 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_end INTEGER NOT NULL,     -- unix ms
  updated_at         INTEGER NOT NULL
);

CREATE TABLE usage_counters (
  user_id      TEXT NOT NULL,
  period_start INTEGER NOT NULL,           -- unix ms, start of billing month
  events_used  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period_start)
);

CREATE TABLE stripe_events (
  event_id     TEXT PRIMARY KEY,           -- Stripe's event id; idempotency key
  type         TEXT NOT NULL,
  payload      TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);
```

### Flow

1. **Upgrade button on the dashboard.** Go handler calls Stripe API → creates a Checkout Session → 302 redirect to Stripe's hosted page.
2. **User pays.** Stripe redirects back; Go handler confirms with Stripe API and writes the initial `subscriptions` row.
3. **Stripe webhooks** (`subscription.updated`, `invoice.paid`, etc.) hit the Worker at `POST /v1/stripe/webhook`. The Worker verifies the `Stripe-Signature` header, idempotency-checks against `stripe_events`, upserts the mirror, returns 200.
4. **Quota check on ingest.** Worker reads the current `usage_counters` row before inserting into `consent_events`; over-limit → 429. The mirror is read-only on this path.

### What runs where

- **Stripe webhook handler:** Cloudflare Worker (`POST /v1/stripe/webhook`). Pay-per-request, naturally idempotent if keyed on `event_id`.
- **Checkout / Customer Portal session creation:** Go dashboard (it has the user session, it owns the redirect).
- **Quota enforcement on ingest:** Worker. One extra indexed lookup per event.

### What we are explicitly NOT doing

- A second database for billing (e.g. Postgres in GKE). Everything fits in D1 — three tables, ~12 columns total, point-lookup access.
- Storing card numbers, full Stripe customer objects, or invoice line items. Stripe holds those; we link out to the Customer Portal.
- Plans in the database. They're code constants, deployed and reviewed like any other config.

---

## Decisions still to make

1. **Visitor identity hash input.** Cookie value alone (deterministic per cookie reset) vs cookie value + visitor IP hash (deterministic per visitor across cookie resets — useful for "did this visitor consent before"). The latter has GDPR implications because IP is PII. Stick with cookie-value-only for v1.

2. **Pricing.** Probably $19/month entry tier (1 site, 10k events/month), $49 for 5 sites, $199 for unlimited + retention. Match Cookiebot's positioning but undercut by an order of magnitude. Decision can wait until MVP is shippable.

3. **Failure mode.** If the beacon API is down, do we drop events or queue them? Recommend: client-side queue in `localStorage`, retry with exponential backoff, drop after 24h. Test for this is in the cloud package tests.

4. **Keycloak realm scope.** New `tickbox` realm (clean separation, easy to delete if we ever migrate auth providers) vs reusing an existing realm. Recommend new realm.

5. **Self-registration in Keycloak.** Enable "register" link on the login page, or invite-only for v1? Recommend self-registration on so customers can onboard without a manual step.

---

## Definition of done (MVP)

- A new user can:
  1. Visit `app.tickbox.dev`, sign in via Keycloak (self-register if no account).
  2. Create a site, get an API key.
  3. Add `@tickboxhq/cloud` to their project, paste the key, deploy.
  4. See their first consent event in the dashboard within 30 seconds of an interaction.
- The OSS SDK still works without `@tickboxhq/cloud` installed (no breaking change).
- Banner-default and the headless components don't change.
- `pnpm typecheck && pnpm test && pnpm lint && pnpm build && ./scripts/check-bundle-sizes.sh` all green for the SDK side.
- `go test ./... && go vet ./...` green for the platform side.
- New CHANGELOG entry under v0.1.0 (this is a major-enough surface that we should bump from 0.0.x).

---

## Files to expect

### `tickboxhq/platform` repo (private, new)

```
platform/
├── cmd/
│   └── dashboard/main.go              # Go entrypoint, chi mux, OIDC wiring
├── internal/
│   ├── auth/
│   │   ├── oidc.go                    # Keycloak OIDC client (go-oidc)
│   │   └── middleware.go              # session cookie verify, set request user
│   ├── handlers/
│   │   ├── sites.go                   # site CRUD pages
│   │   ├── events.go                  # events table + htmx fragments
│   │   ├── export.go                  # CSV export
│   │   └── auth.go                    # /auth/login, /auth/callback, /auth/logout
│   ├── views/
│   │   ├── layout.templ               # base layout
│   │   ├── sites.templ                # site list + detail
│   │   ├── events.templ               # events table + filters
│   │   └── views_templ.go             # generated by `templ generate`
│   └── apiclient/
│       └── client.go                  # typed client for api.tickbox.dev
├── web/
│   ├── static/
│   │   ├── htmx.min.js
│   │   └── style.css                  # built by tailwindcss
│   └── tailwind.config.js
├── api/                               # Cloudflare Worker (TypeScript)
│   ├── src/
│   │   ├── index.ts                   # Worker entrypoint
│   │   ├── events.ts                  # POST /v1/events, GET /v1/events
│   │   ├── sites.ts                   # site CRUD
│   │   └── auth.ts                    # JWT verification against Keycloak JWKS
│   ├── schema.sql                     # D1 migrations
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
├── Dockerfile                         # multi-stage: golang:1.23-alpine → scratch
├── go.mod
├── go.sum
├── .github/
│   └── workflows/
│       ├── platform-release.yml       # build Go image, push to ghcr, flux picks up
│       └── api-release.yml            # wrangler deploy on api/ changes
└── README.md
```

### `tiny-systems/charts/charts/tickbox-platform/` (new)

Cloned from `tickbox-docs`, swap:
- `image.repository: ghcr.io/tickboxhq/platform`
- Container port (Go binary listens on configurable port, default 8080)
- `ingress.hosts[0].host: app.tickbox.dev`
- Env vars: `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET` (from external-secrets), `API_BASE_URL=https://api.tickbox.dev`, `SESSION_SECRET` (from external-secrets)

### `tiny-systems/flux-config/clusters/gke_tinyplatform/tickbox-platform/` (new)

Same four-file shape as `tickbox-docs/`:
- `helm-releases.yaml`
- `image-automation.yaml`
- `image-policy.yaml`
- `image-repositories.yaml`

### `tickbox/packages/cloud/` (new package in existing OSS monorepo)

```
packages/cloud/
├── src/
│   ├── index.ts                       # exports beacon(), applyConsentWithBeacon(), CloudOptions
│   ├── queue.ts                       # localStorage retry queue
│   └── __tests__/
│       └── cloud.test.ts
├── package.json
├── README.md
├── tsconfig.json
└── tsup.config.ts
```

---

## Notes for whoever picks this up

- **Keycloak realm + client.** The user has created a `tickbox` realm. Client config needed: `app.tickbox.dev` as redirect URI, confidential access type, `Standard Flow` + `Direct Access Grants Disabled`. Client secret goes into external-secrets, mounted into the dashboard pod and the Worker.
- **DNS.** `api.tickbox.dev` (Cloudflare Workers route) and `app.tickbox.dev` (GKE Ingress) need new records. Both zones already pointed at the right place — just add the records.
- **Don't ship the cloud package opt-in by default.** Users who haven't asked for it should not have their consent events leaving their server.
- **Cluster context for reference:** `gke_tinyplatform_europe-west2-a_cluster-1`, namespace `tickbox`.
- **Coordinate the v0.1.0 SDK release with `tinysystems.io`** so they can roll the cloud beacon in their next maintenance window.
- **Image automation is wired up in flux for `tickbox-docs`** — clone the pattern; flux will auto-roll new platform images once we push to `ghcr.io/tickboxhq/platform`.
