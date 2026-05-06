# Vanilla — AI training opt-out

Generates `/ai.txt` and a `robots.txt` fragment from the consent config. Plain Node script — works for any static-host setup (Vercel, Netlify, S3, GitHub Pages).

## Run it

```bash
node generate.mjs > ai.txt
```

That's the whole flow. The script prints the file content to stdout; redirect to wherever your static host serves files from.

For `robots.txt`, run:

```bash
node generate.mjs --robots > robots.txt
```

## Wire it into your build

Add to your CI / build script before deploy:

```yaml
- run: node generate.mjs > public/ai.txt
- run: node generate.mjs --robots > public/robots.txt
- run: aws s3 sync public/ s3://your-bucket/
```

The static-file approach has one downside: the file only updates on rebuild. If you flip `ai_training` between deploys, the file is stale until next deploy. For dynamic per-request rendering, see the Next.js or Nuxt examples.

## What's in here

- `generate.mjs` — the build-time generator
- `consent.config.mjs` — the policy declaration

Replace the `consent.config.mjs` with your real config, then run.
