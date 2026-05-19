# Plan: `tickbox init` interactive scaffold

**Status as of writing:** Tickbox v0.0.17. CLI ships `tickbox scan` and `tickbox validate`. `tickbox init` is listed in NEXT.md but not yet built. Vendor registry is now exposed as a docs page (`/concepts/vendors/`) with 73 known vendors across 7 categories — meaning we can now offer them as a checklist in the init prompt.

**Why this matters:** the biggest first-ten-minutes friction is deciding what to put in `consent.config.ts`. New users don't know which jurisdiction preset to pick, what category names to use, or which vendor strings are valid. Today the answer is "read the docs". `tickbox init` turns it into a 90-second prompt-driven flow.

This is the single highest-impact small task left before cloud-tier work. Half a day, ships standalone, makes adoption visibly easier.

---

## User flow

```
$ npx @tickboxhq/cli init

  ┌  Tickbox config setup
  │
  ◇  Where will this site be served?
  │  ◉ UK (UK_DUAA — DUAA statistical-purposes exemption)
  │  ◯ EU (EU_GDPR — strict consent for all tracking)
  │  ◯ Both — auto-detect by visitor country
  │  ◯ Custom (write your own jurisdiction)
  │
  ◇  Which vendors are you using?
  │  ◻ Privacy-friendly analytics (Plausible, Fathom, GoatCounter, Umami...)
  │  ◻ Google Analytics / GA4 / GTM
  │  ◻ Meta Pixel / Facebook Pixel
  │  ◻ TikTok / LinkedIn / X / Pinterest pixels
  │  ◻ Hotjar / FullStory / Microsoft Clarity (session replay)
  │  ◻ Mixpanel / Amplitude / PostHog (product analytics)
  │  ◻ Intercom / Drift / Crisp (chat widgets)
  │  ◻ HubSpot / Klaviyo / Mailchimp (marketing automation)
  │  ◻ AI training crawler opt-out (recommended for content sites)
  │
  ◇  Privacy policy URL (optional)?
  │  /privacy
  │
  ◇  Where should the config file go?
  │  ./consent.config.ts
  │
  ◇  Which framework adapter would you like installed?
  │  ◯ None — I'll handle it myself
  │  ◉ React (@tickboxhq/react)
  │  ◯ Vue (@tickboxhq/vue)
  │  ◯ Nuxt (@tickboxhq/nuxt)
  │
  ◇  Want the drop-in styled banner (@tickboxhq/banner-default)?
  │  ● Yes  ○ No
  │
  └  ✓ consent.config.ts written
     ✓ @tickboxhq/core, @tickboxhq/react, @tickboxhq/banner-default added
     
     Next steps:
       1. Wrap your app in <ConsentProvider config={config}>.
          See: https://docs.tickbox.dev/getting-started/react/
       2. Drop in <ConsentBannerDefault /> or roll your own.
       3. Gate scripts: <script type="text/plain" data-tb-category="analytics" src="...">
```

The flow takes ~90 seconds the first time a user runs it. The output is a working `consent.config.ts` with the right jurisdiction, populated category lists, and a `policy.version` set to today's date. Plus the npm install for the chosen framework adapter, so the dev server can start the moment the user wraps the provider.

---

## Implementation

### Library choice

`@clack/prompts` is the right pick. It's the same library `create-svelte`, `create-astro`, and recent `create-next-app` versions use. Pretty by default, accessible, supports the form shapes above (text, single-select, multi-select), and is ~20 KB unpacked. Already battle-tested in the wild.

Alternatives considered:
- `inquirer` — older, uglier output, larger.
- `prompts` (lukeed) — smaller but rougher UX.
- Hand-rolling — possible, but `@clack/prompts` is one dep that saves a day of UI work.

### File layout

```
packages/cli/src/
  cli.ts                # add 'init' subcommand alongside 'scan' and 'validate'
  init.ts               # the new file — main flow
  init-templates.ts     # the consent.config.ts template strings
  __tests__/init.test.ts  # snapshot test of the generated config
```

`init.ts` exports a `run()` function called from `cli.ts` when args[0] === 'init'. Stays under ~250 lines.

### Vendor checklist generation

The vendor groups page on docs.tickbox.dev is auto-generated from `packages/core/src/jurisdictions/vendors.ts`. The init prompt should read the same source so they never diverge.

Two options:
1. Import the constants directly: `import { PRIVACY_FRIENDLY_ANALYTICS, ADVERTISING_VENDORS, ... } from '@tickboxhq/core'`. Already exported. Maps cleanly to multi-select options. **Recommended.**
2. Re-parse `vendors.ts` with regex (like `docs/scripts/gen-vendors.mjs` does). Decouples CLI from core but adds a fragile dependency.

Go with option 1. The CLI already depends on `@tickboxhq/core` for `defineConsent()`.

### Generated config template

The output is a real TypeScript file the user can read and edit. Match the style of the docs examples — use `defineConsent`, named jurisdiction import, object literal categories.

```ts
import { defineConsent, jurisdictions, ADVERTISING_VENDORS, PRIVACY_FRIENDLY_ANALYTICS } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: {
    version: '2026-05-10',  // today's date when init ran
    url: '/privacy',
  },
  categories: {
    necessary: { required: true },
    analytics: {
      vendors: [...PRIVACY_FRIENDLY_ANALYTICS],
      default: true,         // true under UK_DUAA, false under EU_GDPR
      description: 'Privacy-friendly site usage statistics.',
    },
    marketing: {
      vendors: [...ADVERTISING_VENDORS],
      default: false,
      description: 'Advertising and remarketing.',
    },
  },
})
```

If the user picks "AI training crawler opt-out", add an `ai_training` category with the AI crawler list and a description.

If "Both" jurisdiction is picked, set `jurisdiction: 'auto'` and add a comment pointing at the multi-jurisdiction recipe.

If "Custom" is picked, write a stub jurisdiction with TODO comments.

### npm install

After writing the config, prompt to install:
```
@tickboxhq/core
@tickboxhq/<framework>     # if framework was picked
@tickboxhq/banner-default  # if banner-default was picked
```

Detect the package manager from the lockfile (`pnpm-lock.yaml` / `package-lock.json` / `yarn.lock` / `bun.lockb`). Print the install command instead of running it if no lockfile is found — preferable to running the wrong manager.

### Idempotency

If `consent.config.ts` already exists, prompt before overwriting. Default = no.

If `package.json` doesn't exist in the cwd, refuse to run and print "Run this from your project root, or pass --cwd path/to/project".

---

## Tests

Snapshot test of the generated config for ~6 representative input combinations:

1. UK + privacy-friendly only → minimal config
2. EU + ads + analytics → consent-required everything
3. Both jurisdictions + AI opt-out → `auto` mode + ai_training category
4. UK + everything → full kitchen sink
5. Custom jurisdiction → stub with TODOs
6. No vendors picked → minimal `necessary`-only config

Each snapshot lives in `packages/cli/src/__tests__/__snapshots__/`. CI catches drift if init's template changes unintentionally.

Validate every generated config passes `tickbox validate` — chain the two commands in one test.

---

## Effort

**Half a day, realistically a focused 4-hour block.**

Breakdown:
- 1h: scaffolding (cli.ts wire-up, @clack/prompts install, basic flow)
- 1.5h: prompt logic + template generation + edge cases (existing config, no package.json, custom jurisdiction)
- 1h: tests + snapshots
- 0.5h: README updates (CLI README, getting-started overview), CHANGELOG entry

---

## Definition of done

- `npx @tickboxhq/cli init` runs in an empty directory and produces a working config.
- The generated config passes `tickbox validate`.
- `pnpm test` covers the 6 input combinations as snapshots.
- README updated, CHANGELOG entry under the next version (probably v0.0.18 or v0.1.0 if shipped alongside cloud).
- Documented at `docs/src/content/docs/getting-started/overview.md` as the recommended starting path.

---

## Notes for whoever picks this up

- Don't gold-plate the prompt UI. `@clack/prompts` defaults are fine.
- Keep the policy version generation simple — just `new Date().toISOString().slice(0, 10)`. Users can edit it later.
- The supported-vendors page on docs.tickbox.dev should mention "or run `tickbox init` to skip the boilerplate" once this lands.
- Resist adding more prompts. Anything not in the flow above is over-engineering.
