---
title: Consent modes
description: The three modes — consent, notice, always — and what UI each one drives.
---

Tickbox normalises every category into one of three modes. The mode determines whether the user has to opt in, whether they just need to be told, or whether the cookies fire silently.

## `consent`

The user must opt in before scripts in this category run. Implications:

- A consent banner shows on first visit until the user makes a decision.
- Equal-prominence Accept All and Reject All on the first layer (UK ICO and EU EDPB requirement).
- `<script type="text/plain" data-tb-category>` tags don't execute until consent is granted.
- Google Consent Mode v2 fires `consent: denied` on initial state and updates on user choice.

Used for: ad tech (Google Ads, Meta Pixel, TikTok, LinkedIn UET), session replay (Hotjar, FullStory, MS Clarity), first-party analytics that touch advertising infrastructure (Google Analytics, GTM).

## `notice`

The user is informed but doesn't have to opt in — the scripts run by default. Implications:

- A notice card shows on first visit with an explanation and an easy opt-out.
- Once acknowledged (or once any decision is stored), the card stays hidden.
- Scripts in `notice`-mode categories run before any user action.

Used for: privacy-friendly analytics that qualify for the UK DUAA "statistical purposes" exemption — Plausible, GoatCounter, Fathom, Pirsch, Umami, server-side counters.

`notice` mode only exists under `UK_DUAA` today. Under `EU_GDPR`, even these vendors resolve to `consent` mode.

## `always`

No consent or notice required. Implications:

- Required for site function — session cookies, CSRF tokens, language preferences.
- Toggle is force-on and disabled in the customise modal.
- Cannot be denied.

Used for: anything in the "strictly necessary" PECR exemption.

## Equal prominence — what it actually means

UK ICO and EU EDPB have been explicit and have fined sites where Accept All looked dramatically more prominent than Reject All. The threshold isn't "must be identical" — it's "could a casual user fairly easily click Reject too." In practice this means:

- Same visual weight (same border / fill / size)
- Same colour family — bright Accept + grey Reject is the most-fined pattern
- Same padding and font weight
- Equal positioning (Reject on the first layer, not buried behind a "Manage" link)

`@tickboxhq/banner-default` enforces this by giving Accept and Reject the same `.tb-btn-equal` class. If you build your own banner, replicate the rule.

The customise modal's Save button can be primary-styled because the user has already engaged with a deliberate configuration flow — equal prominence applies to the *decision* surface, not to subsequent steps within an opted-in flow.

## How modes resolve

Mode resolution happens in `resolveCategories(config, jurisdiction)`. For each category:

1. Required categories → `always`.
2. Otherwise, look up each vendor's rule for the active jurisdiction.
3. If any vendor in the category requires `consent`, the whole category becomes `consent` (most restrictive wins).
4. If all vendors are `notice`-eligible, the category becomes `notice`.
5. If the category has no vendors listed, the jurisdiction's `defaultMode` applies.

You can override the inferred mode by setting `mode` on a category, but it's rarely needed — getting the vendor list right is usually the cleaner answer.
