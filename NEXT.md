# Next sessions

This file is the working "what to pick up next" doc. The full backlog lives in `BACKLOG.md`. This is the prioritised slice.

## State at end of session 2026-05-06

- Five npm packages published at `0.0.10`: `@tickboxhq/{core,react,vue,nuxt,cli}`
- 65 tests passing (50 core + 10 cli + 3 react + 2 vue)
- CI + release workflows green and self-validating
- Three production sites running Tickbox: `tinysystems.io` (manager), `pictag.io` (PECR-correct GA), `smesolutions.uk` (AI training opt-out only)
- README humanised, `examples/` folder has 5 frameworks × 3 scenarios
- `BACKLOG.md` tracks all polish items

## Top three for the next session

### 1. Banner UX for `notice` mode in the store

**Problem:** The store's `shouldShowBanner()` only opens the banner for `consent` mode categories. For `notice` mode (DUAA-exempt analytics), the banner stays closed by default. Today the workaround is a custom `storedAt === null` check — used in the `manager` app's `ConsentNotice.vue` — to drive a separate notice UI.

**Fix:** Add first-class support for opening the notice card on first visit. Maybe a new `noticeOpen` field on `ConsentState`, or extend `isOpen` to encode "consent vs. notice" instead of a single boolean. Either way the SDK should drive it, not the user.

**Acceptance:** A site with only DUAA-exempt analytics (Plausible, GoatCounter, etc.) sees a notice card on first visit without writing a `storedAt === null` watcher. Existing manager app integration simplifies to one prop.

**Estimate:** half a day.

### 2. Playwright-rendered scan in `@tickboxhq/cli`

**Problem:** `tickbox scan` only sees the server HTML. Pages where vendors are injected by JavaScript (via Google Tag Manager, dynamic imports, single-page-app routing) report no vendors found.

**Fix:** Add a `--render` flag that drives the URL through Playwright with a real browser, captures network requests, matches them against `VENDOR_PATTERNS`. Playwright is heavy (~300 MB browser), so install it on demand: prompt the user to run `npx playwright install chromium` if not already installed.

**Acceptance:** `tickbox scan --render https://gtm-using-site.com` lists pixel tags that fire after JS hydration. Without `--render` the existing static-HTML behaviour is unchanged.

**Estimate:** 1–2 days. The first half is wrangling Playwright lifecycle (install detection, browser launch, network interception); the second is adding meaningful output.

### 3. Documentation site at `docs.tickbox.dev`

**Problem:** README is ~280 lines and growing. It tries to be a pitch, install guide, API reference, and FAQ at once.

**Fix:** Pick a doc generator. Options:
- **Fumadocs** — modern, built on Next.js 15, popular in 2026
- **Mintlify** — hosted, beautiful default theme, free tier for OSS
- **Nextra** — battle-tested, works for many SDK docs sites

Set up `docs/` directory in the Tickbox repo (or a separate repo) and split the README into:
- Getting started (one page per framework, ~1 minute reading each)
- Concepts (jurisdictions, modes, gating, audit trail)
- API reference (auto-generated from JSDoc/TSDoc)
- Recipes (Matomo, Hotjar, multi-jurisdiction, AI training opt-out)
- Migration guides (OneTrust → Tickbox, Cookiebot → Tickbox, react-cookie-consent → Tickbox)

Deploy at `docs.tickbox.dev` (subdomain of the existing domain).

**Estimate:** 1–2 days. The hard part is structuring the content; the tool itself is mostly mechanical.

## Other items worth considering

### `tickbox init` — interactive scaffold

Walks the user through creating a `consent.config.ts`. Prompts for jurisdiction (UK_DUAA / EU_GDPR / auto), category names, vendors. Half a day with a prompts library like `@clack/prompts`.

### Bot blocking integration with Cloudflare

Site-level signal (`/ai.txt`) is one half of AI opt-out. Active enforcement is the other half. We've decided **not** to be a reverse proxy, but a Cloudflare Workers API that *configures* the customer's existing Cloudflare bot rules from `consent.config.ts` is a real integration. Talks to Cloudflare's API; user gives us a token. Day or two.

### EU_GDPR vendor classification refinement

Currently EU_GDPR classifies every vendor in `ALL_TRACKING_VENDORS` as `consent`. Some EU DPAs (notably CNIL in France) accept first-party analytics under "legitimate interest" without consent. A more nuanced preset (`EU_GDPR_CNIL`?) could surface those exemptions. Carefully — wrong classification could cause a regulator complaint. Half a day for the rules + a day for legal review.

### Cloud beacon — POST consent events to an audit log

The OSS SDK is fully usable without our cloud, but for paying customers the audit-log endpoint is the value. Build:
- `@tickboxhq/cloud` package with `beacon(state)` that POSTs to `api.tickbox.dev`
- Cloudflare Workers + D1 backend at `api.tickbox.dev` (D1 is enough for early)
- Dashboard at `app.tickbox.dev` (Next.js + auth + table view)

Two days for the backend skeleton, a week for a usable dashboard. Don't rush; this is paid-tier infrastructure.

### More framework adapters

`@tickboxhq/svelte`, `@tickboxhq/astro`, `@tickboxhq/solid`. Defer until someone asks. Each is a day's work given the framework-agnostic core.

### Bundle-size optimisation

Core is at 15.1 KB, budget is 18 KB. Could trim ~2 KB by splitting `ai-txt.ts` and the vendor catalogue into a separate sub-export so they tree-shake when unused. Worth it before Tickbox grows much more. Half a day.

## Things explicitly NOT doing soon

- **Reverse proxy / WAF mode** — Cloudflare does this better. Stay out of the data path; just configure their rules from our control plane.
- **TCF certification** (IAB) — only matters for ad-tech publishers. None of our current users need it.
- **SOC 2** — only matters when we have enterprise customers. Not yet.
- **Legal services** — we're software. We help customers implement consent; we don't provide legal advice.

## Process notes for the next session

- Always commit `pnpm-lock.yaml` alongside any `package.json` change. The CI `--frozen-lockfile` will fail otherwise. (Caught this in v0.0.5.)
- Use `gh run view <id> --log-failed` to debug CI failures, not screenshots. (Saved time in v0.0.3 → v0.0.4.)
- The bump script auto-runs `pnpm lint:fix` so package.json formatting drift doesn't break CI.
- For each new release, verify locally before bumping: `pnpm build && pnpm test && pnpm lint && pnpm typecheck && ./scripts/check-bundle-sizes.sh`.
