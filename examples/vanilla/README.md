# Tickbox vanilla example

Plain HTML, no build step. Tickbox loaded from `esm.sh` so it works straight from the file system or any static host.

## Run it

Just open `index.html` in your browser. Or serve it:

```bash
npx serve .
```

## What's in it

- Inline `<script type="module">` imports `@tickboxhq/core` from a CDN
- Custom banner styled in CSS, shown/hidden by subscribing to the store
- A `<script type="text/plain" data-tb-category="marketing">` tag that activates only when marketing consent is granted (`applyConsent` rewrites the type)
- A reset button so you can keep testing the first-visit flow

## Worth noting

This example uses `https://esm.sh/@tickboxhq/core@0.0.1` for zero-build convenience. For production, install `@tickboxhq/core` via npm and bundle it.
