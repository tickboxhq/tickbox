# Tickbox React example

React + Vite. Shows the provider, the `useConsent` hook, and the headless `<ConsentBanner>` with a render-prop.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

## What's wired up

- `src/consent.config.ts` declares two categories: an exempt one (Plausible) and a consent-required one (Google Ads, Meta Pixel)
- `src/main.tsx` wraps the app in `<ConsentProvider config={config}>`
- `src/App.tsx` reads marketing consent via `useConsent('marketing')` and renders the banner via `<ConsentBanner>`

The banner only opens on first visit (or when `policy.version` changes). Use the "Reset consent" button to test the flow again.
