# Tickbox Next.js example

Next.js App Router. Provider lives in a Client Component (it needs `useEffect` for hydration), the rest of the app reads consent through `useConsent`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000/.

## What's wired up

- `app/consent.config.ts` — declarative config (server-safe TypeScript file)
- `app/consent-provider.tsx` — Client Component wrapping `<ConsentProvider>` (`'use client'`)
- `app/layout.tsx` — Root layout uses the provider so all pages can read consent
- `app/page.tsx` — Client Component using `useConsent('marketing')` and the headless banner

## Why a separate provider file?

`<ConsentProvider>` runs an effect on mount to read the cookie, so it must be a Client Component. Keeping it in its own file (`consent-provider.tsx`) means `layout.tsx` itself can stay as a Server Component, which is the recommended Next.js pattern.
