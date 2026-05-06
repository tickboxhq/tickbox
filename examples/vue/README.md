# Tickbox Vue example

Vue 3 + Vite. Composition API.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

## What's wired up

- `src/consent.config.ts` — declarative config
- `src/App.vue` mounts `<ConsentProvider>` once
- `src/Content.vue` is the actual app — uses `useConsent('marketing')` and the headless `<ConsentBanner>` with a scoped slot

## Why two components

`useConsent` reads the store from Vue's `inject()`. The component that *provides* (`<ConsentProvider>`) can't also be the one that *injects* — you need a child. So `App.vue` is just the wrapper, and the real UI lives in `Content.vue`. In a Nuxt project the module handles this via plugin, so you can just call `useConsent` anywhere.
