# Next.js — UK PECR-correct Google Analytics

PECR-correct Google Analytics setup with Next.js App Router:

- `gtag('consent','default', { all denied })` runs first via `next/script` with `strategy="beforeInteractive"` (no network requests, just dataLayer state)
- The GA loader `<script>` and config `<script>` are rendered with `type="text/plain" data-tb-category="analytics"` directly in the root layout's `<head>`. Browsers don't fetch `src` on a `text/plain` script and don't execute its inline code
- Tickbox rewrites both to `text/javascript` once the visitor accepts; GA loads and tracks normally from that point on

## Why not just Consent Mode v2?

Google Consent Mode v2 with `analytics_storage: 'denied'` doesn't stop `gtag.js` from loading. With default-denied alone, the loader still fetches from `googletagmanager.com` and sends cookieless pings to `google-analytics.com`. PECR Reg 6(1) treats those as tracker requests, regardless of cookies.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000/.

## Verify

DevTools → Network → filter "google" → reload. No `gtag/js`, no `g/collect`. Click Accept all → both fire.

## Configure for your site

Edit `app/layout.tsx` and replace the `GA_ID` constant with your real GA4 Measurement ID.
