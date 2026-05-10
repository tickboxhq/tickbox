# @tickboxhq/cli

Command-line tool for Tickbox.

## Install

```bash
npm install -g @tickboxhq/cli
```

Or run without installing:

```bash
npx @tickboxhq/cli scan https://example.com
```

## Commands

### `tickbox init`

Interactive scaffold for `consent.config.ts`. Walks you through:

- Jurisdiction (UK_DUAA / EU_GDPR / `auto` / custom)
- Which vendor groups your site uses (multi-select)
- Privacy policy URL
- Framework adapter (React / Vue / Nuxt / none)
- Whether to install the drop-in styled banner

Writes the config to `./consent.config.ts` and (if a lockfile is detected) installs the SDK packages with your project's package manager.

```
$ npx @tickboxhq/cli init

  ┌  Tickbox config setup
  │
  ◇  Where will this site be served?
  │  ● UK (UK_DUAA — DUAA statistical-purposes exemption)
  │
  ◇  Which vendors are you using?
  │  ◼ Privacy-friendly analytics
  │  ◼ AI training crawler opt-out
  │
  ◇  Which framework adapter would you like installed?
  │  ● React (@tickboxhq/react)
  │
  └  ✓ wrote ./consent.config.ts
     Installing with pnpm: @tickboxhq/core, @tickboxhq/react, @tickboxhq/banner-default
```

If `consent.config.ts` already exists, the command prompts before overwriting. Pass `--cwd path/to/project` to run from outside your project root.

### `tickbox scan <url>`

Fetches the page HTML and lists tracking vendors it detects in `<script>` tags, inline content, and pixel URLs. Reports each vendor's category and how it would resolve under `UK_DUAA`.

```
$ npx @tickboxhq/cli scan https://example.com

Tickbox scan — https://example.com/

Detected 3 vendors:

  ✓ google-analytics       marketing
    → Tickbox category: marketing
    → Mode under UK_DUAA: consent

  ✓ plausible              analytics
    → Tickbox category: analytics
    → Mode under UK_DUAA: notice (DUAA exempt)

  ✓ intercom               chat
    → Tickbox category: chat
    → Mode under UK_DUAA: consent

Suggested categories:

  marketing             1 vendor
  analytics             1 vendor
  chat                  1 vendor
```

### `tickbox validate [path]`

Loads a compiled consent config (`.js` / `.mjs`) and reports issues — missing `policy.version`, undeclared categories referenced from `consentMode`, required categories with `default: false`, etc.

```
$ npx @tickboxhq/cli validate ./consent.config.mjs

Tickbox validate — ./consent.config.mjs

  warning policy.version is missing — without it, the SDK can't detect when to re-show the banner after a policy change

0 errors, 1 warning
```

Defaults to `./consent.config.mjs` if no path is given. TypeScript files aren't loaded directly — compile first or run via `tsx`.

## Limitations

- `scan` inspects the server HTML response only. Vendors injected dynamically by JavaScript (e.g. via Google Tag Manager) won't show up. A JS-rendered scan via Playwright is on the roadmap.
- `validate` requires a compiled `.js` or `.mjs` config file.
