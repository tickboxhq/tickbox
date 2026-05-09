# Next.js examples

Next.js App Router. Each scenario is a runnable starter project.

| Folder | What it shows |
| --- | --- |
| [`basic/`](./basic) | Client-Component provider, `useConsent` hook, headless `<ConsentBanner>` |
| [`uk-pecr-google-analytics/`](./uk-pecr-google-analytics) | PECR-correct GA setup: gated `<script>` tags rendered from the root layout, Consent Mode v2 default-denied |
| [`ai-training-optout/`](./ai-training-optout) | App Router route handler at `/ai.txt` plus pattern for augmenting `robots.txt` with AI-bot Disallow rules |

## Don't want to design a banner?

Install `@tickboxhq/banner-default` and use `<ConsentBannerDefault>` from a Client Component:

```tsx
'use client'
import { ConsentBannerDefault } from '@tickboxhq/banner-default/react'
import config from '@/consent.config'

export function CookieBanner() {
  return <ConsentBannerDefault locale="auto" policyUrl={config.policy?.url} />
}
```

If you already detect locale on the server with `next-intl`, pass it down: `<ConsentBannerDefault locale={locale} />`. Built-in translations: `en`, `de`, `fr`, `es`, `it`, `nl`, `pt`, `pl`. Full guide and the SSR caveat for `'auto'` are in [docs.tickbox.dev/recipes/i18n](https://docs.tickbox.dev/recipes/i18n/).
