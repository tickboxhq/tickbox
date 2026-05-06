# Tickbox Nuxt example

Nuxt 4. Easiest of the lot — the module wires everything up.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000/.

## What's wired up

- `nuxt.config.ts` — adds `@tickboxhq/nuxt` to `modules`
- `app/consent.config.ts` — declarative config (auto-discovered at `~/consent.config`)
- `app/app.vue` — uses `useConsent` (auto-imported) and `<ConsentBanner>` (auto-registered) directly. No manual `<ConsentProvider>` wrap, no imports

The module also reads the consent cookie on the server via `useRequestHeaders`, so the SSR'd HTML reflects the visitor's saved choice on first paint.

## Bonus: SSR-safe by default

Unlike the bare Vue example, you don't need to think about whether `useConsent` runs on server or client. The module's plugin handles both contexts.
