---
title: Jurisdictions
description: How Tickbox treats UK DUAA, EU GDPR, and how to extend with custom jurisdictions.
---

A jurisdiction is the rule set Tickbox uses to decide, for each vendor in your config, whether the user needs to actively consent (`consent` mode), be told what's running (`notice` mode), or neither (`always`). Two presets ship out of the box.

## `UK_DUAA`

The UK Data (Use and Access) Act 2025 came into force 5 February 2026. It added a "statistical purposes" exemption to PECR. Privacy-friendly analytics — Plausible, GoatCounter, Fathom, server-side counters — no longer require consent in the UK as long as they don't profile individuals.

Under `UK_DUAA`:

- Privacy-first analytics → `notice` mode. Show a small information card on first visit, give an easy opt-out, no consent needed.
- Anything sitting in advertising infrastructure (Google Analytics, Google Ads, Meta Pixel, TikTok, LinkedIn, Hotjar session recordings) → `consent` mode. Full opt-in flow with first-layer Reject/Accept buttons of equal prominence.
- Required cookies (session, CSRF) → `always`.

UI requirements baked in:

- `rejectButtonOnFirstLayer: true` — Reject must be on the first banner layer
- `equalProminence: true` — Accept and Reject must look the same
- `honorGPC: false` — UK doesn't require honouring GPC signals (yet)

## `EU_GDPR`

EU rules don't have the DUAA exemption. Anything that drops a cookie or fires a tracker, including first-party analytics, needs explicit consent unless it qualifies as strictly necessary.

Under `EU_GDPR`, every non-required vendor in your config resolves to `consent` mode. There are nuances some EU DPAs (notably CNIL in France) recognise — for example, first-party analytics under "legitimate interest" without consent — but those aren't built into the preset yet. A future `EU_GDPR_CNIL` variant will surface them.

UI requirements:

- `rejectButtonOnFirstLayer: true`
- `equalProminence: true`
- `honorGPC: false` (the EDPB has been silent on GPC; can be flipped on at the project level)

## Mixing modes

If you have both kinds of vendors in your config — say, Plausible (notice-eligible) and Google Ads (consent-required) — Tickbox shows the consent banner on first visit. The customise modal lists the notice-mode category alongside the consent-mode one, so the user has full visibility but the legal flow is consent.

If a single category mixes vendors of different modes (for example, `analytics: { vendors: ['plausible', 'google-analytics'] }`), the whole category escalates to the most restrictive mode. So that example would require consent.

## `'auto'` jurisdiction

Set `jurisdiction: 'auto'` in your config and Tickbox falls back to country-code resolution via `resolveJurisdictionByCountry(code)`. You'll need GeoIP infrastructure on your end to feed it the visitor's country. Most sites just hardcode a single jurisdiction — auto-detection adds operational cost for marginal benefit unless you're serving a truly mixed audience.

## Custom jurisdictions

The `Jurisdiction` type is plain data. You can build your own:

```ts
import type { Jurisdiction } from '@tickboxhq/core'

export const SWITZERLAND_revFADP: Jurisdiction = {
  id: 'CH_revFADP',
  name: 'Switzerland (revised FADP)',
  vendorRules: {
    'plausible': 'notice',
    'google-analytics': 'consent',
    // ...
  },
  defaultMode: 'consent',
  ui: {
    rejectButtonOnFirstLayer: true,
    equalProminence: true,
    honorGPC: false,
  },
  countries: ['CH'],
}
```

Then pass it as `jurisdiction: SWITZERLAND_revFADP` in your config.

If you build something useful, please open a PR — Brazil (LGPD), US-state laws, Australia, Japan are all gaps in the built-in set.
