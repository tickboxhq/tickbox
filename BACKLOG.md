# Backlog

Things to polish before v0.1 / first paying customer. Not blockers for own-dogfooding. For the prioritised "what to pick up next" slice, see `NEXT.md`.

## Test coverage gaps

- [x] `apply.ts` — script rewriting, gtag Consent Mode v2 mapping, custom event dispatch. (16 tests added in v0.0.5)
- [ ] `store.hydrate()` — cookie present / absent / corrupt / wrong schema version / policy version mismatch.
- [ ] `storage.ts` — round-trip with various cookie names, domains, and edge cases (empty cookie jar, cookies with `=` in payload, etc.).
- [ ] `resolveJurisdictionByCountry` — known + unknown country codes, lowercase input, fallback behaviour.
- [ ] React provider unmount before hydrate (race condition).
- [ ] Vue scope-disposal: ensure `onScopeDispose` actually cleans up subscriptions.
- [ ] React 18 vs React 19 compatibility (currently only tested against 19).
- [ ] Property/fuzz tests on the cookie parser.
- [ ] Real-browser tests (Playwright) covering Safari ITP and Firefox ETP behaviour for the consent cookie.

## CI / release

- [x] GitHub Actions workflow: typecheck + test + lint on PR. (`.github/workflows/ci.yml`)
- [x] Bundle-size budgets enforced in CI. (`scripts/check-bundle-sizes.sh`, ran from CI)
- [x] Provenance + signed releases via `npm publish --provenance` on tag. (`.github/workflows/release.yml`)
- [ ] Changesets or similar for semver + CHANGELOG generation. (Currently using `scripts/bump-version.sh` for lockstep versions.)
- [x] `CHANGELOG.md` covering v0.0.1 through v0.0.10. (Added end of session 2026-05-06.)

## Design issues

- [ ] **Tag-gating can't unload running scripts.** Once a `<script>` has executed, denying consent doesn't reverse what it did. Document this limitation in README + provide a recipe (page reload, vendor-specific opt-out flags like `localStorage.skipgc` for GoatCounter, `_paq.push(['optUserOut'])` for Matomo).
- [x] **`apply.ts` hardcodes category names** for Google Consent Mode v2 mapping. (Configurable via `ConsentConfig.consentMode` in v0.0.7)
- [ ] **Vendor classification lists** are hardcoded literals (now in `jurisdictions/vendors.ts`, shared between presets). Need a strategy: pulled from a Tickbox CDN at runtime? Generated from an upstream registry? Decide before the list grows past ~150 vendors.
- [ ] **Config validation** — if a user passes garbage as `jurisdiction`, the runtime error appears far from the source. Add a Zod / Valibot schema or hand-rolled validator that runs in dev mode.
- [ ] **`StoreOptions.onApply` is a half-public API** — exported via the type but not really meant to be set by users. Either promote it to a first-class extension point or make it internal.
- [x] **`EU_GDPR` preset** populated. Mirrors the shared vendor list with everything classified as `consent` (no statistical exemption under EU rules).
- [x] **Banner UX for `notice` mode** — the store now exposes `noticeOpen` alongside `isOpen`, with `<ConsentNotice>` components in React + Vue and Nuxt auto-registration. Consent banner takes priority when both modes are present.

## Documentation

- [ ] Per-package `README.md` (currently only the root has one).
- [ ] JSDoc on every public symbol — currently inconsistent.
- [ ] Documentation site (Fumadocs or Mintlify) at `docs.tickbox.dev`.
- [ ] API reference generated from JSDoc / TSDoc.
- [ ] Working examples: `playground/` Next.js + Nuxt + plain HTML demonstrating each adapter.
- [ ] Migration guides: from OneTrust, Cookiebot, Klaro, react-cookie-consent.
- [ ] Recipes: GoatCounter opt-out, Matomo opt-out, Plausible (no opt-out needed), Google Analytics with Consent Mode v2.

## Repo hygiene

- [ ] `CONTRIBUTING.md`.
- [ ] `SECURITY.md` with disclosure policy.
- [ ] Issue + PR templates.
- [ ] `.editorconfig`.
- [ ] Pre-commit hook (lefthook / husky) running biome + tests.

## Productisation (later, not pre-v0.1)

- [x] `@tickboxhq/cli` first cut — `scan` + `validate`. (Shipped in v0.0.8.)
- [ ] `tickbox init` — interactive scaffold for new projects.
- [ ] Rendered scans (JS-executed, network-captured) — **decided to host, not bundle in CLI**. Either expose `smesolutions.uk` scanner via API and have `tickbox scan --render` POST to it, or fold into the Tickbox dashboard. Avoids shipping ~300 MB of Chromium to every developer's machine and matches how OneTrust/Cookiebot/Termly all do it.
- [x] `/ai.txt` generator (in `@tickboxhq/core` since v0.0.6) and Nitro route (in `@tickboxhq/nuxt` since v0.0.6).
- [ ] `/llms.txt` generator. (Different from `/ai.txt` — `llms.txt` is a curated-index file for AI consumption, not an opt-out.)
- [ ] Cloud beacon — POST consent events to audit-log endpoint.
- [ ] Hosted dashboard.
- [x] Bundle a default styled banner — shipped as `@tickboxhq/banner-default` with `<ConsentBannerDefault>` + `<ConsentNoticeDefault>` for React and Vue. GitHub-ish look, themeable via CSS custom properties.
