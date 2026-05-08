---
title: From OneTrust
description: Move from OneTrust's hosted CMP to Tickbox. Config translation, what changes, what to watch out for.
---

OneTrust is the dominant enterprise CMP. It works, it's exhaustive, it's also a separate vendor relationship, a separate billing line, a separate JavaScript bundle (~200 KB), and a separate dashboard your engineers don't usually touch. Migrating to Tickbox swaps that for a config file in your repo and a 16 KB SDK.

This guide assumes a typical OneTrust setup: a published cookie banner template, geo-aware targeting, and Google Consent Mode v2 wired up. If you have a custom integration with OneTrust's REST API, that part is more work — talk to us.

## What you keep

- Same legal posture (consent for ad tech, notice for analytics where exempt).
- Same Google Consent Mode v2 behaviour (the seven `gtag` storage keys flip with consent).
- Same basic UX (banner with Accept/Reject, customise modal with per-category toggles).

## What you lose

- **No hosted dashboard yet.** OneTrust's audit log, vendor catalogue, and analytics dashboard are not in Tickbox today. The cloud beacon + dashboard are on the roadmap (see the GitHub README's "Open priorities") — until they ship, you're keeping audit data yourself if you need it.
- **No legal scanner.** OneTrust crawls your site and tells you "you have these 47 cookies, here's a recommended classification." Tickbox doesn't. You hand-list vendors in `consent.config.ts` instead. For a first pass, run `npx @tickboxhq/cli scan https://your-site.com` to detect what's loading and translate from there.
- **No IAB TCF support.** If you're an ad-tech publisher participating in the IAB Transparency and Consent Framework, Tickbox isn't TCF-certified. Stay on OneTrust.
- **No multi-language UI yet.** OneTrust ships 50+ translations; Tickbox is English-only. i18n is on the roadmap but not shipped.

## Config translation

OneTrust's "Cookie Categories" become Tickbox's `categories`. Direct mapping:

| OneTrust | Tickbox category | Notes |
|---|---|---|
| Strictly Necessary (C0001) | `necessary: { required: true }` | Always-on. |
| Performance (C0002) | `analytics: { vendors: [...] }` | Often `notice` mode under DUAA. |
| Functional (C0003) | `functional: { vendors: [...] }` | Usually `consent` mode in EU. |
| Targeting (C0004) | `marketing: { vendors: [...] }` | Always `consent` mode. |
| Social Media (C0005) | Up to you. | Often grouped under `marketing`. |

OneTrust treats vendors as opaque IDs in its catalogue. Tickbox uses string vendor names that match its built-in classification list (`packages/core/src/jurisdictions/vendors.ts`). Look up each vendor by name; unknowns can be added either inline or via a PR to the registry.

## Banner

OneTrust banners are rendered from a template editor in their dashboard. Tickbox banners live in your component tree. Two paths:

1. **Drop-in** — `<ConsentBannerDefault />` from `@tickboxhq/banner-default`. Looks similar to OneTrust's default theme but more compact, with equal-prominence Accept/Reject (OneTrust's defaults *do not* enforce equal prominence — ICO has fined sites running OneTrust with primary-styled Accept).
2. **Custom** — render your own banner using the headless `<ConsentBanner>` render-prop. Good if you have an existing banner component you want to keep.

## Script tag migration

OneTrust uses `data-ot-ignore` and `data-ot-cookies-id` attributes to gate scripts. Tickbox uses `type="text/plain" data-tb-category`. Find-and-replace:

```html
<!-- OneTrust -->
<script data-ot-cookies-id="C0002"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>

<!-- Tickbox -->
<script type="text/plain" data-tb-category="analytics"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>
```

The PECR-correct gating is the same (`type="text/plain"` is what stops the browser fetching pre-consent — see [Concepts → Script gating](/concepts/gating/)).

## Google Consent Mode v2

OneTrust's "Google Consent Mode" toggle in their dashboard maps category IDs to gtag storage keys. Tickbox does the same via `consentMode` in your config. If you used OneTrust's defaults, Tickbox's defaults match — no extra config needed.

If you customised the OneTrust mapping, replicate it in Tickbox:

```ts
defineConsent({
  // ...
  consentMode: {
    ad_storage: { category: 'marketing' },
    ad_user_data: { category: 'marketing' },
    ad_personalization: { category: 'marketing' },
    analytics_storage: { category: 'analytics' },
  },
})
```

## Cutover

Run both in parallel for a day or two before flipping. The Tickbox cookie is `__tb_consent`, OneTrust's is `OptanonConsent` — they don't conflict, so you can have both stores live.

1. Add Tickbox alongside OneTrust. Tickbox banner stays hidden (don't render it). Confirm tag gating works for one or two test scripts.
2. Switch the active banner to Tickbox. Keep OneTrust's cookie around so visitors who already accepted aren't asked again — read `OptanonConsent`, decode it, write a `__tb_consent` cookie that mirrors the same decisions.
3. After a week, remove OneTrust's script and the cookie-mirroring code.

The mirror code is small but specific:

```ts
function migrateOneTrustCookie() {
  const otCookie = document.cookie.split('; ').find((c) => c.startsWith('OptanonConsent='))
  if (!otCookie) return
  const decoded = decodeURIComponent(otCookie.split('=')[1])
  const groups = new URLSearchParams(decoded).get('groups') ?? ''
  // groups looks like "C0001:1,C0002:1,C0003:0,C0004:0"
  const decisions: Record<string, boolean> = {}
  for (const pair of groups.split(',')) {
    const [id, val] = pair.split(':')
    if (id === 'C0001') decisions.necessary = val === '1'
    if (id === 'C0002') decisions.analytics = val === '1'
    if (id === 'C0003') decisions.functional = val === '1'
    if (id === 'C0004') decisions.marketing = val === '1'
  }
  // Write a Tickbox cookie matching the decisions, then run the migrate-once flag.
  // ... full code in @tickboxhq/cli `migrate` command (planned).
}
```

## Cost comparison

OneTrust's typical mid-market plan runs $500–2000 / month. Tickbox is OSS — running cost is your hosting, which for a static config + a few KB of JS is effectively zero. The cloud audit log + dashboard (when shipped) will be a paid tier, expected to undercut OneTrust by an order of magnitude.

## Honest caveat

If you're a publicly-traded company with a privacy office that demands a vendor with a SOC 2 report, an enterprise SLA, and a phone-callable support team — Tickbox is not that vendor today. OneTrust is. Match the tool to the buying context.
