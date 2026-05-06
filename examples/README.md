# Tickbox examples

Each subfolder is a framework. Inside each framework folder, there's one folder per scenario. Every scenario is a runnable starter project that installs Tickbox from npm.

## Frameworks

- [`vanilla/`](./vanilla) — plain HTML + JS via `@tickboxhq/core`
- [`react/`](./react) — React + Vite
- [`nextjs/`](./nextjs) — Next.js App Router
- [`vue/`](./vue) — Vue 3 + Vite
- [`nuxt/`](./nuxt) — Nuxt 4 module

## Scenarios available in each framework

| Scenario | What it shows |
| --- | --- |
| `basic/` | Mixed vendors (privacy-friendly + consent-required), custom banner, demonstrates the SDK API |
| `uk-pecr-google-analytics/` | PECR-correct Google Analytics: `type="text/plain"` script gating + Consent Mode v2 default-denied. No requests to Google before consent. |

## Run any scenario

```bash
cd examples/<framework>/<scenario>
npm install
npm run dev
```

(Vanilla doesn't need a build step — just open `index.html`.)
