#!/usr/bin/env node
// Generates docs/src/content/docs/concepts/vendors.md from
// packages/core/src/jurisdictions/vendors.ts. Runs as a prebuild step so the
// docs page never drifts from the source registry.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')
const vendorsTs = path.join(repoRoot, 'packages/core/src/jurisdictions/vendors.ts')
const outFile = path.join(here, '../src/content/docs/concepts/vendors.md')

const source = readFileSync(vendorsTs, 'utf8')

// The JSDoc body must not itself contain `*/`, otherwise the lazy match
// silently swallows everything between the file-level overview comment and
// the const-level comment, mashing both into one description.
const blockPattern =
  /\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/\s*export const (\w+) = \[([\s\S]*?)\] as const/g
const groups = []
let m = blockPattern.exec(source)
while (m !== null) {
  const [, jsdoc, name, listBody] = m
  if (name !== 'ALL_TRACKING_VENDORS') {
    const description = jsdoc
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim()
    const items = listBody
      .split(',')
      .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(Boolean)
    groups.push({ name, description, items })
  }
  m = blockPattern.exec(source)
}

if (groups.length === 0) {
  console.error('gen-vendors: no vendor groups found in vendors.ts')
  process.exit(1)
}

const groupTitles = {
  PRIVACY_FRIENDLY_ANALYTICS: 'Privacy-friendly analytics',
  ADVERTISING_VENDORS: 'Advertising and ad-tech',
  SESSION_REPLAY_VENDORS: 'Session replay and fingerprinting',
  CDP_AND_PRODUCT_ANALYTICS: 'CDP and product analytics',
  MARKETING_AUTOMATION: 'Marketing automation and CRM',
  CHAT_WIDGETS: 'Chat widgets',
  AI_TRAINING_CRAWLERS: 'AI training crawlers',
}
const titleFor = (name) =>
  groupTitles[name] ??
  name
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')

const lines = []
lines.push('---')
lines.push('title: Supported vendors')
lines.push(
  'description: Every vendor identifier Tickbox knows about, with the category each one belongs to. Auto-generated from packages/core/src/jurisdictions/vendors.ts on every docs build.',
)
lines.push('---')
lines.push('')
lines.push(
  "The strings below are what you put in `vendors: [...]` inside `consent.config.ts`. They are not opaque tokens — Tickbox uses them to classify each category against the active jurisdiction (`UK_DUAA`, `EU_GDPR`, ...). Pass anything not on this list and Tickbox will accept it but treat it as the jurisdiction's default mode (usually `consent` under EU GDPR, and `notice` or `always` for first-party-feeling things under UK DUAA).",
)
lines.push('')
lines.push(
  "If you need a vendor that isn't here, please open a PR adding it to `vendors.ts` so the registry grows. The runtime cost of an extra entry is one string-equality check.",
)
lines.push('')

for (const group of groups) {
  lines.push(`## ${titleFor(group.name)}`)
  lines.push('')
  lines.push(group.description)
  lines.push('')
  lines.push('| Identifier |')
  lines.push('| --- |')
  for (const id of group.items) lines.push(`| \`${id}\` |`)
  lines.push('')
}

lines.push('## Importing the lists directly')
lines.push('')
lines.push(
  'Each constant is exported from `@tickboxhq/core`, so you can spread one straight into your config:',
)
lines.push('')
lines.push('```ts')
lines.push(
  "import { defineConsent, jurisdictions, ADVERTISING_VENDORS, PRIVACY_FRIENDLY_ANALYTICS } from '@tickboxhq/core'",
)
lines.push('')
lines.push('export default defineConsent({')
lines.push('  jurisdiction: jurisdictions.UK_DUAA,')
lines.push("  policy: { version: '2026-05-09', url: '/privacy' },")
lines.push('  categories: {')
lines.push('    necessary: { required: true },')
lines.push('    analytics: { vendors: [...PRIVACY_FRIENDLY_ANALYTICS] },')
lines.push('    marketing: { vendors: [...ADVERTISING_VENDORS], default: false },')
lines.push('  },')
lines.push('})')
lines.push('```')
lines.push('')
lines.push(
  '`ALL_TRACKING_VENDORS` is also exported — it is the union of every list above and is what the `EU_GDPR` preset uses internally to classify everything as `consent`.',
)
lines.push('')

mkdirSync(path.dirname(outFile), { recursive: true })
writeFileSync(outFile, lines.join('\n'), 'utf8')

const total = groups.reduce((acc, g) => acc + g.items.length, 0)
console.log(`gen-vendors: wrote ${outFile} (${groups.length} groups, ${total} vendors)`)
