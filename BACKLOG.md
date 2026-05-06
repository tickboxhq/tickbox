# Backlog

Things to polish before v0.1 / first paying customer. Not blockers for own-dogfooding.

## Test coverage gaps

- [ ] `apply.ts` — script rewriting, gtag Consent Mode v2 mapping, custom event dispatch. Zero tests today.
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
- [ ] `CHANGELOG.md` template + first entry. (Auto-generated GitHub release notes cover most of this.)

## Design issues

- [ ] **Tag-gating can't unload running scripts.** Once a `<script>` has executed, denying consent doesn't reverse what it did. Document this limitation in README + provide a recipe (page reload, vendor-specific opt-out flags like `localStorage.skipgc` for GoatCounter, `_paq.push(['optUserOut'])` for Matomo).
- [ ] **`apply.ts` hardcodes category names** (`marketing`, `analytics`, `functional`, `preferences`) for the Google Consent Mode v2 mapping. Make the mapping configurable per project.
- [ ] **Vendor classification lists** in `jurisdictions/uk-duaa.ts` are hardcoded literals. Need a strategy: pulled from a Tickbox CDN at runtime? Generated from an upstream registry? Decide before the list grows past ~50 vendors.
- [ ] **Config validation** — if a user passes garbage as `jurisdiction`, the runtime error appears far from the source. Add a Zod / Valibot schema or hand-rolled validator that runs in dev mode.
- [ ] **`StoreOptions.onApply` is a half-public API** — exported via the type but not really meant to be set by users. Either promote it to a first-class extension point or make it internal.
- [ ] **`EU_GDPR` preset has empty `vendorRules`.** Should mirror the DUAA list but classify everything as `consent` (no statistical exemption under EU rules).
- [ ] **Banner UX for `notice` mode** — currently the store's `shouldShowBanner` only triggers for `consent` mode. Notice-mode categories don't open the banner automatically. The manager-app integration handles this with a custom `storedAt === null` check, but the SDK should make this a first-class behaviour.

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

- [ ] `@tickboxhq/cli` — `tickbox init`, `tickbox scan`, `tickbox validate`, `tickbox diff`.
- [ ] Cloud beacon — POST consent events to audit-log endpoint.
- [ ] `/ai.txt` and `/llms.txt` generators (probably as Nitro plugin in `@tickboxhq/nuxt` first, then Edge Worker).
- [ ] Hosted dashboard (later).
- [ ] Bundle a default styled banner (`<ConsentBannerDefault>`) for users who don't want to bring their own design system.
