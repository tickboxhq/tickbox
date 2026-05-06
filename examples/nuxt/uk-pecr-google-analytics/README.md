# Nuxt — UK PECR-correct Google Analytics

Demonstrates the PECR-correct way to load Google Analytics:

- `gtag('consent','default', { all denied })` runs first (just dataLayer state, no network)
- The GA loader and config scripts are rendered as `type="text/plain" data-tb-category="analytics"` via `nuxt.config.ts` head, so the browser does NOT fetch `gtag.js` or send any pings before consent
- Tickbox flips both scripts to `text/javascript` once the visitor accepts, GA then loads and tracks normally

## Why this matters

Google Consent Mode v2 with `analytics_storage: 'denied'` is **not enough** for PECR. With Consent Mode default-denied alone, `gtag.js` still loads from `googletagmanager.com` and sends "cookieless pings" to `google-analytics.com`. PECR Regulation 6(1) treats those as tracker requests, regardless of whether cookies are set. UK compliance scanners catch this.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000/.

## Verify it works

1. Open DevTools → Network tab, filter for "google"
2. Reload — you should see **no** `gtag/js` request, **no** `g/collect` request
3. Click "Accept all"
4. Now the `gtag/js` request fires, then `g/collect` pings start
5. Reload — the cookie is set; banner stays closed; GA runs as normal

## Configure for your site

Edit `nuxt.config.ts` and replace `G-XXXXXXXX` with your real GA4 Measurement ID. There's also a `GA_ID` constant at the top to make it slightly easier.
