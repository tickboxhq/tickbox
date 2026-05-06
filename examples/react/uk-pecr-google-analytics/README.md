# React — UK PECR-correct Google Analytics

Loads Google Analytics in a way that doesn't fire any tracker requests until the visitor consents:

- `gtag('consent','default', { all denied })` runs first (just dataLayer state, no network)
- The GA loader and config scripts in `index.html` are `type="text/plain" data-tb-category="analytics"`, so the browser doesn't fetch `gtag.js` or run any inline code
- Tickbox flips them to `text/javascript` once the visitor accepts; GA loads and tracks normally from that point on

## Why not just Consent Mode v2?

Google Consent Mode v2 with `analytics_storage: 'denied'` is **not enough** for PECR. With Consent Mode default-denied, `gtag.js` still loads from `googletagmanager.com` and sends "cookieless pings" to `google-analytics.com`. PECR Reg 6(1) treats those as tracker requests, regardless of whether cookies are set. UK compliance scanners catch this.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

## Verify

DevTools → Network → filter "google" → reload. No `gtag/js`, no `g/collect`. Click Accept all → both fire as expected.

## Configure for your site

Edit `index.html` and replace `G-XXXXXXXX` with your real GA4 Measurement ID (in two places).
