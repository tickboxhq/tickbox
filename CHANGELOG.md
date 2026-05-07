# Changelog

Versions follow [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) format.

## [0.0.10] - 2026-05-06

### Fixed
- `@tickboxhq/nuxt`: probe `.ts` / `.mts` / `.mjs` / `.js` / `.cjs` when resolving the user's `consent.config` path, so the Nitro `/ai.txt` route handler can import a TypeScript config at runtime. Vite handles extension resolution at build time but Nitro's runtime ESM loader is strict — this only surfaced when `/ai.txt` was hit in dev with a real `.ts` config.

## [0.0.9] - 2026-05-06

### Fixed
- `@tickboxhq/nuxt`: register a Nitro-specific alias `#tickbox-config` for the `/ai.txt` server route. Nuxt's impound plugin blocks `#build/*` aliases in server runtime, so the previous build threw `RollupError: Vue app aliases are not allowed in server runtime`. The Vue plugin still uses `#build/tickbox-config` (works fine in client context); the server route uses the new alias. One file on disk, two aliases.

## [0.0.8] - 2026-05-06

### Added
- New package: `@tickboxhq/cli`. Two commands:
  - `tickbox scan <url>` — fetches a page and lists tracking vendors detected in the HTML response. ~50 vendor patterns covered (GA, GTM, Meta, TikTok, LinkedIn, Bing UET, Plausible, Fathom, GoatCounter, Hotjar, FullStory, Microsoft Clarity, Mixpanel, Amplitude, PostHog, Heap, HubSpot, Klaviyo, Iterable, Braze, Intercom, Drift, Crisp, etc.). Maps each to a Tickbox category and reports its mode under UK_DUAA.
  - `tickbox validate [path]` — loads a compiled `.js` / `.mjs` consent config and reports issues (missing `policy.version`, undeclared categories referenced from `consentMode`, required categories with `default: false`, unknown gtag keys).
- 10 new tests for vendor pattern matching.

## [0.0.7] - 2026-05-06

### Added
- `ConsentConfig.consentMode` — override which Tickbox categories drive which Google Consent Mode v2 keys. Useful when your project uses category names other than the defaults (`marketing`, `analytics`, `functional`, `preferences`). Setting a key to `null` removes it from the `gtag('consent','update', ...)` call entirely.
- New exports from `@tickboxhq/core`: `ConsentModeMapping`, `ConsentModeRule`, `GtagConsentKey`, `ApplyOptions`.
- 7 new tests for the configurable mapping.
- React, Vue and Nuxt providers thread `config.consentMode` through to `applyConsent` automatically.

### Changed
- Bumped core bundle budget from 15 KB to 18 KB to give headroom (current core size ~15.1 KB after the mapping logic).

## [0.0.6] - 2026-05-06

### Added
- AI training opt-out generators in `@tickboxhq/core`:
  - `generateAiTxt(config, options)` — Spawning.ai-format `/ai.txt` content. Disallow by default, Allow on explicit opt-in.
  - `generateAiBotRobotsRules(config)` — `robots.txt` fragment with User-agent + Disallow rules for each AI training crawler.
- `@tickboxhq/nuxt` auto-registers a Nitro route at `/ai.txt`. Disable with `tickbox: { aiTxt: false }`.
- Three new example scenarios:
  - `examples/vanilla/ai-training-optout/` — build-time generator script.
  - `examples/nextjs/ai-training-optout/` — App Router route handler at `app/ai.txt/route.ts`.
  - `examples/nuxt/ai-training-optout/` — auto-registered via the module.
- 14 new tests for the generators.

## [0.0.5] - 2026-05-06

### Added
- Full test coverage for `apply.ts` (16 cases): script activation, Google Consent Mode v2 mapping, `tickbox:consent-changed` event dispatch. Adds `happy-dom` as a core devDependency.

## [0.0.4] - 2026-05-06

### Added
- GitHub Actions CI: lint, build, typecheck, test, bundle-size check on every PR and push to main.
- GitHub Actions release workflow: triggered by `v*` tag pushes. Builds, verifies, publishes all packages to npm with `--provenance` attestations, creates a GitHub release with auto-generated notes.
- `scripts/bump-version.sh` — lockstep version bump + tag creation.
- `scripts/check-bundle-sizes.sh` — portable bash, runs locally and in CI.

### Changed
- CI orders `pnpm build` before `pnpm typecheck` so workspace symlinks have their `dist/` d.ts files in place when `tsc` resolves them.

## [0.0.3] - 2026-05-06 [withdrawn]

Tagged but never published — CI failed before the publish step due to a `dist/` resolution issue in workspace dependencies. Fixed in 0.0.4.

## [0.0.2] - 2026-05-06 [withdrawn]

Tagged but never published — `bump-version.sh` produced multi-line `files` arrays in `package.json`, which Biome flagged. Fixed by piping `pnpm lint:fix` into the bump script. Released as 0.0.4.

## [0.0.1] - 2026-05-06

### Added

First public release. Five packages:

- `@tickboxhq/core` — types, jurisdictions, store, side-effects.
- `@tickboxhq/react` — `<ConsentProvider>`, `useConsent`, headless `<ConsentBanner>`.
- `@tickboxhq/vue` — `<ConsentProvider>`, `useConsent`, headless `<ConsentBanner>`.
- `@tickboxhq/nuxt` — Nuxt module that auto-imports `useConsent`, auto-registers `<ConsentBanner>`, reads the consent cookie on the server via `useRequestHeaders`.

Key features:

- Three-mode consent model: `consent`, `notice`, `always`.
- Built-in `UK_DUAA` jurisdiction preset implementing the Data (Use and Access) Act 2025 statistical-purposes exemption — privacy-friendly analytics resolve to `notice` mode (no banner, just an opt-out).
- Built-in `EU_GDPR` jurisdiction preset (conservative — everything resolves to `consent`).
- Vendor classification catalogue: ~110 known vendors across advertising, session replay, CDP, marketing automation, chat widgets, AI training crawlers, and privacy-friendly analytics.
- Cookie storage with versioned schema (SameSite=Lax, Secure on HTTPS).
- Script tag gating via `<script type="text/plain" data-tb-category="X">`.
- Google Consent Mode v2 integration on every consent change.
- `tickbox:consent-changed` DOM event for custom integrations.
- SSR cookie reading in the Nuxt module.

[0.0.10]: https://github.com/tickboxhq/tickbox/releases/tag/v0.0.10
[0.0.9]: https://github.com/tickboxhq/tickbox/releases/tag/v0.0.9
[0.0.8]: https://github.com/tickboxhq/tickbox/releases/tag/v0.0.8
[0.0.7]: https://github.com/tickboxhq/tickbox/releases/tag/v0.0.7
[0.0.6]: https://github.com/tickboxhq/tickbox/releases/tag/v0.0.6
[0.0.5]: https://github.com/tickboxhq/tickbox/releases/tag/v0.0.5
[0.0.4]: https://github.com/tickboxhq/tickbox/releases/tag/v0.0.4
[0.0.1]: https://github.com/tickboxhq/tickbox/releases/tag/v0.0.1
