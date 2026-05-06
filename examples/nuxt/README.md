# Nuxt examples

Nuxt 4. Each scenario is a runnable starter project. The `@tickboxhq/nuxt` module handles the provider via plugin so you can call `useConsent` anywhere.

| Folder | What it shows |
| --- | --- |
| [`basic/`](./basic) | Auto-imports + auto-registered `<ConsentBanner>` + `useConsent` |
| [`uk-pecr-google-analytics/`](./uk-pecr-google-analytics) | PECR-correct GA setup: gated `<script>` tags via `nuxt.config.ts` head + Consent Mode v2 default-denied |
| [`ai-training-optout/`](./ai-training-optout) | The module's auto-registered `/ai.txt` Nitro route + pattern for augmenting `robots.txt` |
