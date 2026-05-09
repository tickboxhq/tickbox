# Tickbox examples

Each subfolder is a framework. Inside each framework folder, there's one folder per scenario. Every scenario is a runnable starter project that installs Tickbox from npm.

## Frameworks

- [`vanilla/`](./vanilla) — plain HTML + JS via `@tickboxhq/core`
- [`react/`](./react) — React + Vite
- [`nextjs/`](./nextjs) — Next.js App Router
- [`vue/`](./vue) — Vue 3 + Vite
- [`nuxt/`](./nuxt) — Nuxt 4 module

## Scenarios available in each framework

| Scenario | Frameworks | What it shows |
| --- | --- | --- |
| `basic/` | all | Mixed vendors (privacy-friendly + consent-required), custom banner, demonstrates the SDK API |
| `uk-pecr-google-analytics/` | all | PECR-correct Google Analytics: `type="text/plain"` script gating + Consent Mode v2 default-denied. No requests to Google before consent. |
| `ai-training-optout/` | vanilla, nextjs, nuxt | `/ai.txt` (Spawning.ai format) and `robots.txt` AI-bot rules generated from the consent config. Vite-only React/Vue can use the build-time pattern from `vanilla/` |

## Run any scenario

```bash
cd examples/<framework>/<scenario>
npm install
npm run dev
```

(Vanilla doesn't need a build step — just open `index.html`.)

## Default styled banner

Every scenario above renders its own banner using the headless `<ConsentBanner>` so you can see the SDK API directly. If you don't want to design a banner at all, install `@tickboxhq/banner-default` and drop in `<ConsentBannerDefault>` (React/Vue/Nuxt only).

```tsx
import { ConsentBannerDefault } from '@tickboxhq/banner-default/react'

<ConsentBannerDefault locale="auto" policyUrl="/privacy" />
```

It ships with translations for `en`, `de`, `fr`, `es`, `it`, `nl`, `pt`, `pl`. BCP-47 tags work (`fr-CH` → `fr`); unknown locales fall back to English. See the [i18n recipe](https://docs.tickbox.dev/recipes/i18n/) for details on auto-detect, integrating with `next-intl` / `vue-i18n`, and shipping your own translations.
