---
title: Remote theming
description: Edit banner copy and colours from the dashboard — fetched and applied by the SDK at runtime, no redeploy.
---

The compliance contract — jurisdiction, categories, vendors, policy version — lives in `consent.config.ts` under PR review, where it belongs. **Presentation** — the banner's copy and colours — does not need a code review or a deploy. Remote theming lets a marketing team edit it from the dashboard at [app.tickbox.dev](https://app.tickbox.dev) while the SDK picks it up on the next page load.

## How it works

```
Dashboard banner editor            Worker (api.tickbox.dev)        Your site
app.tickbox.dev/sites/{id}/banner   PUT /v1/theme/{siteId}  ──►  D1 (site_themes)
                                    GET /v1/theme/{siteId}  ◄──  <ConsentBannerDefault siteId="…" />
```

From your side it is **one prop** on the styled banner:

```tsx
import config from './consent.config'

<ConsentBannerDefault policyUrl={config.policy?.url} siteId="site_xxxxxxxxxxxx" />
```

```vue
<ConsentBannerDefault :policy-url="config.policy?.url" site-id="site_xxxxxxxxxxxx" />
```

The `siteId` is the one shown on your site's page in the dashboard. With it set, on mount the banner:

1. reads the last theme from `localStorage` and renders **synchronously** — no flicker, works offline;
2. fetches `https://api.tickbox.dev/v1/theme/{siteId}` in the background;
3. applies the fetched copy and colours, and caches the result for the next load.

A failed fetch is silent: the banner keeps rendering with the cached theme, or the baked-in defaults if there is no cache. The cloud is never in the critical path.

## What you can change remotely

| Field | Effect |
| --- | --- |
| `copy.title` / `body` | Banner heading and body text |
| `copy.buttonAccept` / `buttonReject` / `buttonCustomise` | Button labels |
| `copy.privacyLink` | Privacy-policy link text |
| `colors.accent` | Primary button (`--tb-primary-bg`) |
| `colors.background` | Banner background (`--tb-bg`) |
| `colors.text` | Body text (`--tb-fg`) |
| `locale` | BCP-47 tag or `auto` |

Anything compliance-related is deliberately **not** here — changing which vendors are gated is a code change, not a marketing tweak.

## Precedence

Remote values win where set; everything else falls through to what you already had, so a partial theme is always safe:

- **Text:** remote theme → your `copy` prop → locale pack → English
- **Colours:** remote theme → `prefers-color-scheme` / `data-tb-theme` → baked default

## Without the cloud

`siteId` is optional. Omit it and the banner is fully local — copy comes from the `copy` prop and locale packs, colours from the [CSS custom properties](#styling-without-the-dashboard) below. Nothing is fetched and nothing leaves the browser.

### Styling without the dashboard

The same three colours are plain CSS custom properties. Set them on `:root` (or any wrapper around the banner) and skip the cloud entirely:

```css
:root {
  --tb-primary-bg: #1f2328; /* accent — primary button */
  --tb-bg: #ffffff;         /* banner background */
  --tb-fg: #1f2328;         /* body text */
}
```

The [interactive builder](https://tickbox.dev/builder) generates this block for you with live preview.

## Self-hosting the endpoint

`cloudEndpoint` defaults to `https://api.tickbox.dev`. Override it only if you run your own copy of the Worker:

```tsx
<ConsentBannerDefault siteId="site_…" cloudEndpoint="https://consent.example.com" />
```
