---
title: Script gating (PECR)
description: How Tickbox stops tracker scripts from firing pre-consent — and why Google Consent Mode v2 alone isn't enough for PECR.
---

PECR Regulation 6(1) treats *any request to a tracker domain* as a tracking action that needs consent — regardless of whether cookies are involved. Compliance scanners check for these requests on the pre-consent state of the page. Most teams discover this the hard way after their first audit.

## The Consent Mode v2 trap

Google's Consent Mode v2 is good. It tells `gtag` to hold back analytics and ad data until consent is granted. But it doesn't stop `gtag.js` from loading. With Consent Mode default-denied:

```html
<script src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
```

The browser still fetches `gtag.js` from `googletagmanager.com`. `gtag.js` then fires "cookieless pings" to `google-analytics.com`. Both requests are tracker requests under PECR Regulation 6(1). A scanner sees them. ICO has noted this pattern.

Consent Mode v2 ≠ PECR-compliant on its own. You need to gate the script tags themselves.

## Tag gating

Tickbox uses an old but solid trick: `<script type="text/plain">` browsers refuse to fetch or execute. Tickbox's `applyConsent` step rewrites the type to `text/javascript` once consent is granted, and the browser loads the script normally.

```html
<!-- Before consent: type="text/plain" prevents fetch and execution -->
<script type="text/plain" data-tb-category="analytics"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
<script type="text/plain" data-tb-category="analytics">
  gtag('js', new Date())
  gtag('config', 'G-XXX')
</script>
```

`data-tb-category` ties the gating to a category in your config. When the user grants `analytics`, all matching scripts switch on. When they deny it later, `applyConsent` doesn't re-flip them — see [Limits](#limits) below.

## What a PECR-correct GA setup looks like

```html
<head>
  <!-- Safe to run pre-consent: only sets dataLayer state, no network calls -->
  <script>
    window.dataLayer = window.dataLayer || []
    function gtag() { dataLayer.push(arguments) }
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })
  </script>

  <!-- Gated: doesn't fetch or run until consent is granted -->
  <script type="text/plain" data-tb-category="analytics"
          src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
  <script type="text/plain" data-tb-category="analytics">
    gtag('js', new Date())
    gtag('config', 'G-XXX')
  </script>
</head>
```

Tickbox's `applyConsent` does two things on every state change:

1. Flips `text/plain` → `text/javascript` for granted categories.
2. Calls `gtag('consent', 'update', { ... })` with the seven storage keys mapped from your categories.

Both together: the script loads, and `gtag.js` knows it's been granted.

## Limits

**Tag gating activates blocked scripts on grant. It can't unload a script that has already executed.** If a user accepts analytics, GA loads, then they revoke — the GA library is in memory. You have two options:

1. Page reload after revocation (cleanest, but disruptive).
2. Vendor-specific opt-out flag, set in your category subscriber:

```ts
store.subscribe((state) => {
  if (typeof window === 'undefined') return
  const granted = state.decisions.analytics === true
  if (granted) {
    window.localStorage.removeItem('skipgc')
  } else {
    window.localStorage.setItem('skipgc', 't') // GoatCounter respects this
  }
})
```

For Matomo: `_paq.push(['optUserOut'])`. For GA via `gtag`: `gtag('set', { send_page_view: false })` and stop sending events.

## SSR

The Nuxt module reads the `__tb_consent` cookie on the server via `useRequestHeaders` and hydrates the store with it. SSR'd HTML reflects the visitor's saved choice on the first paint — no flicker, no hydration mismatch.

For Next.js, you can read the cookie in a server component or route handler, decode it (URL-encoded JSON), and pass the resulting state to a client component. Or accept the flicker and mount the banner client-only — usually fine for most sites.
