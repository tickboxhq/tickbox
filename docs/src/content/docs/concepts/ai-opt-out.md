---
title: AI training opt-out
description: Generate /ai.txt and robots.txt rules for AI training crawlers from your consent config.
---

The EU AI Act Article 53 (in force August 2026) requires general-purpose AI providers to respect machine-readable opt-out signals. The convention emerging around this is `/ai.txt` (Spawning.ai format), plus per-bot rules in `robots.txt`. Tickbox generates both from a single `ai_training` category in your config.

This is forward-looking: enforcement infrastructure isn't fully in place, and major model trainers don't all promise to honour it. Still, the cost of declaring your stance is near zero, and once Article 53 becomes enforceable, you'll already be compliant.

## Add an `ai_training` category

```ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-08', url: '/privacy' },
  categories: {
    necessary: { required: true },
    ai_training: {
      // empty `vendors` → all known AI crawlers blocked
      // list specific bots here to narrow the scope
      vendors: [],
      default: false,
      description:
        'AI training and inference by automated crawlers. We do not consent to our content being used to train AI models.',
    },
  },
})
```

`default: false` means opt-out by default. The crawlers don't read your cookie — this is a policy declaration baked into the config, not a per-visitor decision.

## `/ai.txt` route (Nuxt module)

`@tickboxhq/nuxt` registers a Nitro server handler at `/ai.txt` automatically. Output looks like:

```
User-Agent: *
Disallow: /

User-Agent: GPTBot
Disallow: /

User-Agent: ClaudeBot
Disallow: /

# ... more bots
```

If your category has `default: true` (allowing AI training), it emits `Allow: /` for each. To disable the route entirely:

```ts
// nuxt.config.ts
tickbox: { aiTxt: false }
```

## Manual emission (non-Nuxt projects)

For React, plain Vue, vanilla JS, or any non-Nuxt setup, generate the file content yourself and serve it from your framework's static or dynamic route:

```ts
import { generateAiTxt } from '@tickboxhq/core'
import config from './consent.config'

const aiTxtContent = generateAiTxt(config)
// serve as text/plain at /ai.txt
```

For Next.js: add `app/ai.txt/route.ts`:

```ts
import { generateAiTxt } from '@tickboxhq/core'
import config from '@/consent.config'

export function GET() {
  return new Response(generateAiTxt(config), {
    headers: { 'Content-Type': 'text/plain' },
  })
}
```

## `robots.txt` rules

`generateAiBotRobotsRules(config)` emits a `robots.txt` fragment with `User-agent` + `Disallow` per AI crawler. Concatenate it to your existing `robots.txt`:

```ts
import { generateAiBotRobotsRules } from '@tickboxhq/core'
import config from './consent.config'

const robotsTxt = `
User-agent: *
Disallow: /api/
Sitemap: https://example.com/sitemap.xml

${generateAiBotRobotsRules(config)}
`
```

## Vendor list

The set of AI crawlers Tickbox knows about: `gptbot`, `claudebot`, `anthropic-ai`, `google-extended`, `perplexitybot`, `ccbot`, `bytespider`, `applebot-extended`, `meta-externalagent`, `oai-searchbot`. The list is in `packages/core/src/jurisdictions/vendors.ts` and accepts PRs.

If you want to allow some crawlers and block others, list the ones to block explicitly in the `vendors` array. An empty array means "block all known".

## What this doesn't do

- It doesn't physically block crawlers — that's a Cloudflare WAF / Workers job. `/ai.txt` is a *signal*, like `robots.txt`. Compliance is voluntary on the crawler's side.
- It doesn't track per-visitor AI consent — there's no per-visitor decision to track. The category is a site-wide policy declaration.

For active blocking via Cloudflare, see [Cloudflare bot integration](/recipes/cloudflare-bots/) (planned).
