---
title: Cloudflare bot blocking for AI crawlers
description: Pair Tickbox's /ai.txt declaration with Cloudflare WAF rules that actually enforce it.
---

`/ai.txt` and `robots.txt` are *signals* — they declare your stance, but compliance is voluntary on the crawler's side. Major model trainers don't all promise to honour them. If you want active blocking, pair the signal with a Cloudflare WAF rule that drops requests from AI crawler user-agents.

This recipe assumes Cloudflare is in front of your origin. If you're on raw GCP/AWS, you'd do the same shape with their respective WAFs (Cloud Armor, AWS WAF) — the policy is the same, the dashboard is different.

## Tickbox config

Same as the [AI training opt-out concept](/concepts/ai-opt-out/):

```ts
// consent.config.ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-08', url: '/privacy' },
  categories: {
    necessary: { required: true },
    ai_training: {
      vendors: [], // empty → block all known AI crawlers
      default: false,
      description: 'AI training and inference by automated crawlers.',
    },
  },
})
```

The Nuxt module auto-serves `/ai.txt` from this. That's the signal.

## The Cloudflare side

In your Cloudflare dashboard:

1. Go to **Security → WAF → Custom rules**.
2. Click **Create rule**.
3. Name: `Block AI training crawlers`.
4. Field: `User Agent` (or `cf.client.bot` if you want broader bot detection).
5. Operator: `contains` (or `matches regex` if you want one rule for everything).
6. Value: any one of the user-agents Tickbox knows about — the canonical list lives in `packages/core/src/jurisdictions/vendors.ts`. The regex form:

```
(?i)(GPTBot|ClaudeBot|anthropic-ai|Google-Extended|PerplexityBot|CCBot|Bytespider|Applebot-Extended|meta-externalagent|OAI-SearchBot)
```

7. Action: `Block`.

Save. The rule takes effect within seconds.

## Cloudflare's built-in option

Cloudflare also ships a **"Block AI Bots"** managed rule under **Security → Bots**. It's a one-click toggle, maintained by Cloudflare, and updated as new crawlers appear. Lighter operational cost than maintaining your own custom rule. The trade-off is you're trusting Cloudflare's list.

If you use both:
- Custom rule for the bots you specifically care about (overrides Cloudflare's list).
- Managed rule for everything else.

## What the crawlers see

A request from `User-Agent: GPTBot/1.0`:

1. Hits your Cloudflare edge.
2. Custom WAF rule matches.
3. Cloudflare returns `403 Forbidden`. The origin never sees the request.
4. The `/ai.txt` and `robots.txt` declarations are still there for crawlers that *do* respect them — but the WAF stops the ones that don't.

## Caveats

**Don't accidentally block Googlebot.** Cloudflare's managed rule is careful about this; if you write your own custom rule, double-check the user-agent strings — `Google-Extended` is the AI crawler, `Googlebot` is the search indexer. Blocking the wrong one tanks your SEO.

**User-agent spoofing exists.** A crawler that wants to scrape your content can identify as Chrome. WAF rules catch the polite ones; the impolite ones need rate limiting, behavioural analysis, or paid bot management — out of scope for this recipe.

**`/ai.txt` is not a substitute.** Cloudflare blocking covers the crawlers that don't respect signals; `/ai.txt` covers the ones that do. You want both.

## Verify

```bash
curl -A "GPTBot/1.0" https://your-site.com/some-page
# Expect: HTTP/2 403
```

```bash
curl -A "Mozilla/5.0" https://your-site.com/some-page
# Expect: HTTP/2 200, your normal page
```

```bash
curl https://your-site.com/ai.txt
# Expect: text/plain with User-Agent: * Disallow: / (or per-bot rules)
```
