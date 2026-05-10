import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { type TemplateInput, renderConfig } from '../init-templates.js'

const FIXED_VERSION = '2026-05-10'

const FIXTURES: Array<[string, TemplateInput]> = [
  [
    'uk + privacy-friendly analytics only',
    {
      jurisdiction: 'UK_DUAA',
      vendorGroups: ['privacy_analytics'],
      policyUrl: '/privacy',
      policyVersion: FIXED_VERSION,
    },
  ],
  [
    'eu + ad pixels + privacy analytics',
    {
      jurisdiction: 'EU_GDPR',
      vendorGroups: ['privacy_analytics', 'ad_pixels'],
      policyUrl: '/privacy',
      policyVersion: FIXED_VERSION,
    },
  ],
  [
    'auto + ai opt-out only',
    {
      jurisdiction: 'auto',
      vendorGroups: ['ai_training'],
      policyVersion: FIXED_VERSION,
    },
  ],
  [
    'uk + kitchen sink',
    {
      jurisdiction: 'UK_DUAA',
      vendorGroups: [
        'privacy_analytics',
        'ad_pixels',
        'session_replay',
        'product_analytics',
        'marketing_automation',
        'chat',
        'ai_training',
      ],
      policyUrl: '/privacy',
      policyVersion: FIXED_VERSION,
    },
  ],
  [
    'custom jurisdiction with stub',
    {
      jurisdiction: 'custom',
      vendorGroups: ['privacy_analytics'],
      policyVersion: FIXED_VERSION,
    },
  ],
  [
    'no vendors picked',
    {
      jurisdiction: 'UK_DUAA',
      vendorGroups: [],
      policyVersion: FIXED_VERSION,
    },
  ],
]

describe('renderConfig', () => {
  for (const [name, input] of FIXTURES) {
    it(`matches snapshot — ${name}`, () => {
      expect(renderConfig(input)).toMatchSnapshot()
    })
  }

  it('UK_DUAA grants privacy analytics by default (DUAA notice-only)', () => {
    const out = renderConfig({
      jurisdiction: 'UK_DUAA',
      vendorGroups: ['privacy_analytics'],
      policyVersion: FIXED_VERSION,
    })
    expect(out).toMatch(/analytics:\s*\{[\s\S]*default:\s*true/)
  })

  it('EU_GDPR denies privacy analytics by default', () => {
    const out = renderConfig({
      jurisdiction: 'EU_GDPR',
      vendorGroups: ['privacy_analytics'],
      policyVersion: FIXED_VERSION,
    })
    expect(out).toMatch(/analytics:\s*\{[\s\S]*default:\s*false/)
  })

  it('omits policy.url when not provided', () => {
    const out = renderConfig({
      jurisdiction: 'UK_DUAA',
      vendorGroups: [],
      policyVersion: FIXED_VERSION,
    })
    expect(out).not.toMatch(/url:/)
    expect(out).toContain(`version: '${FIXED_VERSION}'`)
  })

  it('every generated config passes validate()', async () => {
    // Validate runs against the compiled `.mjs` so we transform each fixture's
    // `import` line to a no-op stub of the constants and the `defineConsent`
    // helper, then write it as `.mjs` to a temp file.
    const { validate } = await import('../validate.js')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      for (const [name, input] of FIXTURES) {
        const src = renderConfig(input)
        const stub = stubForValidation(src)
        const file = join(tmpdir(), `tb-init-${Date.now()}-${Math.random()}.mjs`)
        writeFileSync(file, stub, 'utf8')
        const exit = await validate([pathToFileURL(file).pathname])
        expect(exit, `${name} should exit 0 (no errors)`).toBe(0)
      }
    } finally {
      log.mockRestore()
      err.mockRestore()
    }
  })
})

/**
 * Strip the real `@tickboxhq/core` import line and replace it with inline
 * stubs so we can `import()` the generated config in a unit test without
 * pulling in the built package's full module graph.
 */
function stubForValidation(src: string): string {
  const withoutImport = src
    .split('\n')
    .filter((line) => !line.startsWith('import { ') || !line.includes("'@tickboxhq/core'"))
    .join('\n')

  const stubs = [
    'const defineConsent = (c) => c',
    "const jurisdictions = { UK_DUAA: { id: 'UK_DUAA', defaultMode: 'consent', vendorRules: {}, ui: {} }, EU_GDPR: { id: 'EU_GDPR', defaultMode: 'consent', vendorRules: {}, ui: {} } }",
    'const PRIVACY_FRIENDLY_ANALYTICS = []',
    'const ADVERTISING_VENDORS = []',
    'const SESSION_REPLAY_VENDORS = []',
    'const CDP_AND_PRODUCT_ANALYTICS = []',
    'const MARKETING_AUTOMATION = []',
    'const CHAT_WIDGETS = []',
    'const AI_TRAINING_CRAWLERS = []',
  ].join('\n')

  // Custom jurisdiction template references a `Jurisdiction` type — drop the
  // annotation so plain JS evaluation works.
  return `${stubs}\n${withoutImport.replace(': Jurisdiction', '')}`
}

import { vi } from 'vitest'
