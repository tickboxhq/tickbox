---
title: Overview
description: How Tickbox is structured and which package you need.
---

Tickbox is a small monorepo of focused packages. Pick the framework adapter that matches your stack — it pulls in `@tickboxhq/core` for you.

## Packages

| Package | What it gives you |
|---|---|
| `@tickboxhq/core` | Types, jurisdictions, the consent store, side-effects (script gating, Consent Mode v2 wiring), AI opt-out generators. Framework-agnostic. |
| `@tickboxhq/react` | `<ConsentProvider>`, `useConsent()`, headless `<ConsentBanner>` and `<ConsentNotice>`. |
| `@tickboxhq/vue` | Same as React but Vue 3. |
| `@tickboxhq/nuxt` | Nuxt 3 / 4 module. Auto-imports `useConsent`, auto-registers banner + notice components, serves `/ai.txt` from a Nitro route, hydrates the cookie on the server via `useRequestHeaders`. |
| `@tickboxhq/banner-default` | Drop-in styled banner and notice. Use this if you don't want to design your own. Includes translations for en, de, fr, es, it, nl, pt, pl. |
| `@tickboxhq/cli` | `tickbox scan <url>` and `tickbox validate` for your config. |

## How a typical setup looks

1. Write `consent.config.ts` once. It's a versioned source of truth — it ends up in your repo, and the audit trail (when you wire that up later) ties decisions to a `policy.version`.
2. Wrap your app in `<ConsentProvider config={config}>`. The Nuxt module does this for you.
3. Render a banner — either roll your own with the headless `<ConsentBanner>`, or drop in `<ConsentBannerDefault />`.
4. Gate your tracking scripts with `<script type="text/plain" data-tb-category="analytics" src="...">`. Tickbox flips the type after consent.

That's the whole loop.

## Next pages

- [Vanilla JS](/getting-started/vanilla/) — the core package with no framework
- [React / Next.js](/getting-started/react/)
- [Vue](/getting-started/vue/)
- [Nuxt](/getting-started/nuxt/)
- [Default styled banner](/getting-started/banner-default/) — the no-design path

If you'd rather understand the model first, head to [Concepts → Jurisdictions](/concepts/jurisdictions/).
