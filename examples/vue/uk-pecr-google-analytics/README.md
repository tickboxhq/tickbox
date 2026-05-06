# Vue — UK PECR-correct Google Analytics

Loads Google Analytics in a way that doesn't fire any tracker requests until consent.

- `gtag('consent','default', { all denied })` runs first (no network requests)
- The GA loader and config in `index.html` are `type="text/plain" data-tb-category="analytics"` — browser does not fetch `gtag.js` or run the inline code
- Tickbox flips the type to `text/javascript` once consent is granted; GA loads and tracks normally from that point on

## Why not just Consent Mode v2?

Consent Mode v2 with `analytics_storage: 'denied'` doesn't stop `gtag.js` from loading. With default-denied alone, `gtag.js` still fetches from `googletagmanager.com` and sends "cookieless pings" to `google-analytics.com`. PECR Reg 6(1) treats those as tracker requests, regardless of cookies.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

## Verify

DevTools → Network → filter "google" → reload. No `gtag/js`, no `g/collect`. Click Accept all → both fire.

## Configure

Edit `index.html` and replace `G-XXXXXXXX` with your GA4 Measurement ID (in two places).
