# Plan: Integration tests

**Status as of writing:** Tickbox v0.0.17. ~103 unit tests across the packages, all using `vitest` with `happy-dom` for DOM-touching code. No browser-driven tests, no SSR tests, no cross-package wired-together tests. The CI pipeline runs `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `./scripts/check-bundle-sizes.sh` on every push.

**Why this matters now:** the highest-risk feature in Tickbox is **script-tag gating** (`type="text/plain"` → `type="text/javascript"` flip in `applyConsent`). Unit tests with `happy-dom` verify the type attribute changed, but they cannot verify the browser actually fetched and executed the script. That's the bug class with legal consequences if it breaks (a tag firing pre-consent is the exact thing PECR fines exist for).

We have two reasonable paths. **Tier 1** is one focused afternoon and catches that risk class. **Tier 2** is multi-day and gives full coverage but adds maintenance overhead.

---

## What unit tests already cover

For context — these don't need to be re-tested at the integration layer:

- ConsentStore state machine (59 tests in core)
- Cookie serialisation / deserialisation, schema-version handling
- Jurisdiction resolution, vendor mode classification (UK_DUAA vs EU_GDPR)
- Google Consent Mode v2 mapping (the ConsentModeMapping merge logic)
- React `useConsent` hook return shape, banner/notice render-prop wiring
- Vue composable + `<ConsentBanner>` slot scope (incl. the regression test for the v0.0.13 modal bug)
- banner-default render with all 9 locales, `copy` override layering, locale fallback chain
- CLI scan against mocked HTML fixtures, validate against synthetic configs

What unit tests **don't** cover and need real browser / real framework runs:

1. **Script-tag gating against a real HTTP fetch.** `happy-dom` doesn't execute scripts.
2. **GTM dataLayer state after `gtag('consent', 'update', ...)`** — we test the call shape, not the downstream effect.
3. **SSR cookie hydration in Nuxt** — first-paint markup matches the cookie. Tested in isolation, not as a real Nitro request.
4. **Cross-package wiring end-to-end** — provider → headless banner → banner-default in one render tree, with consent-banner-priority logic.
5. **CLI scanner against a real live page** — currently mocked.
6. **Visual regression on banner-default** — focus traps, escape-to-close, Customise modal in real browsers.

---

## Tier 1 — Smoke test (recommended now)

**Goal:** catch the script-tag gating regression class with the smallest possible test surface.

**One Playwright test against `examples/vanilla/uk-pecr-google-analytics`.** This example already has gated `<script>` tags, Consent Mode v2 wiring, and a banner. We piggyback.

### Test scenarios

1. **Deny path** — load page, no consent cookie → banner appears → click Reject → reload → no GA request to `googletagmanager.com` ever fires (Playwright network interceptor confirms).
2. **Accept path** — load page, no consent cookie → banner appears → click Accept → reload → GA request DOES fire, and `gtag('consent','update', ...)` was called with `analytics_storage: 'granted'`.

That's it. Two scenarios, one fixture, ~50 lines of test code.

### File layout

```
.github/workflows/integration.yml           # new workflow, runs separately
packages/integration-tests/
  package.json                              # @tickboxhq/integration-tests, private
  playwright.config.ts
  src/gating.spec.ts                        # the two scenarios above
  README.md                                 # how to run locally
```

The package is private (not published to npm) and not part of the main `pnpm test`. It runs in its own GHA job that:
1. Builds the SDK packages (`pnpm -r --filter='./packages/*' build`)
2. Builds the example fixture (`cd examples/vanilla/uk-pecr-google-analytics && pnpm install && pnpm build`)
3. Serves it on a local port
4. Runs `pnpm playwright test`

Total CI time: ~90 seconds.

### Effort

**1.5–2 hours.** Most of the time is in the network interceptor logic for confirming "no request was made" — Playwright's `route.abort()` + a counter is the idiom.

### Definition of done (Tier 1)

- `.github/workflows/integration.yml` runs on every push to main, blocks PR merges on failure.
- Both scenarios green locally and in CI.
- README documents how to run locally with `pnpm -F @tickboxhq/integration-tests test:headed` for debugging.
- A bug like "applyConsent forgot to flip the type attribute" would now fail this test before reaching production.

---

## Tier 2 — Full matrix (defer until pre-1.0)

**Goal:** comprehensive end-to-end coverage across all frameworks, scenarios, and the SSR cookie story.

This is where it stops being cheap. ~3-5 days of work upfront, plus ongoing maintenance every time an example app or framework adapter changes.

### Matrix

| Framework | Scenarios |
|---|---|
| Vanilla | basic, uk-pecr-google-analytics, ai-training-optout |
| React | basic, uk-pecr-google-analytics |
| Next.js | basic, uk-pecr-google-analytics, ai-training-optout, **SSR cookie hydration** |
| Vue | basic, uk-pecr-google-analytics |
| Nuxt | basic, uk-pecr-google-analytics, ai-training-optout, **SSR cookie hydration** |

That's 16 fixtures × 2-4 scenarios per fixture = roughly 50 test cases. Plus cross-browser (Chromium / Firefox / WebKit on Playwright) gives 150+ test runs. Realistic CI time: 5-10 minutes.

### What it adds beyond Tier 1

- **SSR hydration** for Next.js + Nuxt: assert that on first paint, before any client JS runs, the rendered HTML reflects the saved consent state from the cookie. This is the kind of bug that's invisible until a real customer screenshots it.
- **Visual regression** for banner-default: snapshot the rendered banner across light/dark themes and across all 9 locales. Catches CSS regressions.
- **Customise modal interaction** in real browsers: focus trap actually works, escape closes, tab order is sensible.
- **GTM tagged-template behaviour** with a real GTM container ID: confirms `gtag('consent', 'update', ...)` reaches the dataLayer and triggers the right downstream tag fires.
- **Cross-framework consistency**: same scenario passes identically in React + Vue + Nuxt + Vanilla. Catches accidental divergence.

### Cost

**Per-fixture build time** is the slow part. Next.js and Nuxt fixtures take 30-60s each to build. CI time grows linearly with matrix size. At 16 fixtures × 30s build = 8 minutes just for builds. Tests on top of that.

**Maintenance:** every time an example app or framework adapter changes, the integration test fixture needs updating. Currently we have ~16 example fixtures and they evolve. Doable but real ongoing cost.

**Failure noise:** flaky tests are way more common at the e2e layer (timing, network jitter). Need retry logic, careful waits, no `setTimeout`-based assumptions. Otherwise CI becomes the boy who cried wolf.

### When to do this

When one or more of the following is true:
1. We're approaching v1.0 and want the safety net before declaring stable.
2. We've shipped a real customer regression that integration tests would have caught (and Tier 1 didn't).
3. We have an enterprise customer asking "do you have e2e coverage?" as part of vendor-evaluation.

Until then, the maintenance cost outweighs the marginal coverage. Tier 1 + the existing unit suite catches 90% of the realistic regression surface for 5% of the effort.

### Effort estimate

- Day 1: scaffold integration-tests package, port the Tier 1 test, add the basic React + Vue + Vanilla scenarios.
- Day 2: Next.js fixture + SSR cookie hydration test. This is the trickiest part because it requires running `next build && next start` in CI.
- Day 3: Nuxt fixture + SSR test. Similar to Next.js but Nuxt-specific.
- Day 4: AI-training-opt-out tests, visual regression baseline.
- Day 5: CI tuning (caching, parallelism), flake hunting, doc updates.

### Definition of done (Tier 2)

- All matrix combinations pass on Chromium + Firefox + WebKit.
- SSR fixtures verify zero-flicker on first paint with a saved cookie.
- Visual regression baselines committed for banner-default in light + dark mode, all 9 locales.
- CI total time under 12 minutes including the Tier 1 smoke test.
- `pnpm -F @tickboxhq/integration-tests test:headed` works locally for debugging.
- `pnpm -F @tickboxhq/integration-tests test:ui` opens the Playwright UI mode.

---

## Recommended path

1. **Now (this week or alongside `tickbox init`):** ship Tier 1. ~2 hours, catches the highest-risk class of bugs, low maintenance overhead. Single Playwright test, single fixture, single CI job.

2. **Pre-1.0 (months out, or when first paying customer is onboard):** build out Tier 2 incrementally. Don't bulk-write all 50 cases — add a fixture each time you ship a feature that touches the runtime. Spread the cost.

3. **Never (probably):** the "every framework × every browser × every scenario" full grid. Not worth the maintenance for an OSS project that already has good unit coverage.

---

## Decisions still to make

1. **Playwright vs Cypress.** Playwright wins on cross-browser support, Cypress wins on developer ergonomics. Recommend Playwright for the SSR + multi-browser story, even if Cypress is friendlier.

2. **Where to host fixtures during tests.** `pnpm http-server -p 4000 examples/vanilla/uk-pecr-google-analytics/dist` works for static. For Next.js / Nuxt, `next start` and `nuxt preview` work. Both fit in a `before:all` hook.

3. **What to do about the GA / Meta pixel network requests.** We can't actually call out to `googletagmanager.com` in CI (rate limits, flakiness, privacy). Use Playwright's `route.fulfill()` to intercept and mock the response — proves the request was MADE without actually making it.

4. **Visual regression tool.** Playwright's built-in `expect(page).toHaveScreenshot()` is fine for v1. Argos / Percy if we ever want PR-side approval workflows.

---

## Notes for whoever picks this up

- The smesolutions.uk scanner project (separate repo) already runs Playwright in CI for its own purposes. Useful prior art for the GHA workflow setup.
- Don't run integration tests on every PR initially — start with `push` to main only. Reduces friction while we learn what's flaky.
- If a test ever times out waiting for a banner to appear, the timeout is masking a real bug. Fix the underlying race rather than bumping the timeout.
- Keep the Playwright config explicit: `headless: true`, `retries: 0` in CI (we want to know about flakes), `retries: 2` locally.
