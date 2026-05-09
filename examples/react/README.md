# React examples

React + Vite. Each scenario is a runnable starter project.

| Folder | What it shows |
| --- | --- |
| [`basic/`](./basic) | `<ConsentProvider>` + `useConsent` hook + headless `<ConsentBanner>` |
| [`uk-pecr-google-analytics/`](./uk-pecr-google-analytics) | PECR-correct GA setup: `type="text/plain"` gating in `index.html` + Consent Mode v2 default-denied |

## Don't want to design a banner?

Install `@tickboxhq/banner-default` and replace your custom `<ConsentBanner>` markup with `<ConsentBannerDefault>`:

```tsx
import { ConsentBannerDefault } from '@tickboxhq/banner-default/react'
import config from './consent.config'

<ConsentBannerDefault locale="auto" policyUrl={config.policy?.url} />
```

Translations included: `en`, `de`, `fr`, `es`, `it`, `nl`, `pt`, `pl`, `uk`. Pass any BCP-47 tag (`fr-CH` falls back to `fr`, `uk-UA` to `uk`) or `'auto'` to read `navigator.language`. Full guide: [docs.tickbox.dev/recipes/i18n](https://docs.tickbox.dev/recipes/i18n/).
