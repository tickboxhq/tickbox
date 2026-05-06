# Next.js — AI training opt-out

Serves `/ai.txt` from the App Router via a route handler. The file content is generated on each request from the consent config — no rebuild needed when you flip `ai_training`.

## Run it

```bash
npm install
npm run dev
```

Visit http://localhost:3000/ai.txt.

## What's wired up

- `app/consent.config.ts` — declares the policy
- `app/ai.txt/route.ts` — Next.js route handler that calls `generateAiTxt(config)` from `@tickboxhq/core`

The route is `force-static` by default so the response is cached at the edge after the first hit. Bump `policy.version` in your config to invalidate.

## For `robots.txt` augmentation

If you have an existing `robots.txt`, you can merge the AI-bot Disallow rules:

```ts
// app/robots.ts (Next.js convention)
import { generateAiBotRobotsRules } from '@tickboxhq/core'
import config from './consent.config'

export default function robots() {
  // Your normal robots.txt rules
  const base = `User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n`
  return new Response(`${base}\n${generateAiBotRobotsRules(config)}`, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
```
