# @tickboxhq/integration-tests

Browser-driven smoke test for the highest-risk Tickbox behaviour: **script-tag
gating**. Unit tests (happy-dom) verify the `type` attribute flips; they cannot
verify the browser actually fetched and executed the gated script. A tag firing
pre-consent is the exact thing PECR fines exist for, so it gets a real browser.

Private package — not published to npm, not part of the main `pnpm test`. It
runs in its own GitHub Actions job (`.github/workflows/integration.yml`).

## What it covers

One fixture: `examples/vanilla/uk-pecr-google-analytics`. Two scenarios:

1. **Deny** — load → banner → Reject → reload → no request to Google's tag
   servers ever fires, gated `<script>` tags stay `type="text/plain"`.
2. **Accept** — load → banner → Accept → reload → `googletagmanager.com/gtag/js`
   *is* requested and Consent Mode v2 was updated with
   `analytics_storage: 'granted'`.

The fixture pins `@tickboxhq/core@0.0.1` from esm.sh; the test intercepts that
import and serves the locally-built `packages/core/dist/index.js`, so it
exercises the SDK in this repo. Google requests are intercepted and fulfilled
empty — we prove the request was *made* without actually calling out.

## Run locally

```sh
pnpm -r --filter='@tickboxhq/core' build      # the test serves the local build
pnpm -F @tickboxhq/integration-tests exec playwright install chromium
pnpm -F @tickboxhq/integration-tests test         # headless
pnpm -F @tickboxhq/integration-tests test:headed  # watch it run
pnpm -F @tickboxhq/integration-tests test:ui      # Playwright UI mode
```

If a test times out waiting for the banner, the timeout is masking a real bug —
fix the race, don't bump the timeout.
