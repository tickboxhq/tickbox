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
