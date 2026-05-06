# Tickbox examples

Each subfolder is a standalone, runnable example showing Tickbox in one framework. They install Tickbox from npm (not the local workspace), so you can copy any folder out of this repo and use it as a starting point.

| Folder | Stack | What it shows |
| --- | --- | --- |
| [`vanilla/`](./vanilla) | Plain HTML + JS | `@tickboxhq/core` directly, no framework, custom banner via the DOM |
| [`react/`](./react) | React + Vite | `<ConsentProvider>`, `useConsent`, custom banner |
| [`nextjs/`](./nextjs) | Next.js (App Router) | Client-component provider, auto-gated `<script>` tags |
| [`vue/`](./vue) | Vue 3 + Vite | `<ConsentProvider>`, `useConsent` composable, custom banner |
| [`nuxt/`](./nuxt) | Nuxt 4 | `@tickboxhq/nuxt` module with auto-imports + scoped-slot banner |

## Run any example

```bash
cd examples/<name>
npm install
npm run dev
```

(Vanilla doesn't need a build step — just open `index.html`.)

## Two scenarios in every example

Each `consent.config.ts` (or inline config in vanilla) shows both:

1. A category that **doesn't need a banner** under DUAA (privacy-first analytics like Plausible/GoatCounter resolve to `notice` mode)
2. A category that **does need consent** (Google Ads, Meta Pixel etc. resolve to `consent` mode)

Drop your own vendors into the lists and the resolution updates automatically.
