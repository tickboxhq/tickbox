/**
 * Pure template generation for `tickbox init`. Kept free of I/O so it can be
 * snapshot-tested without spawning prompts.
 */

export type JurisdictionChoice = 'UK_DUAA' | 'EU_GDPR' | 'auto' | 'custom'

export type VendorGroup =
  | 'privacy_analytics'
  | 'ad_pixels'
  | 'session_replay'
  | 'product_analytics'
  | 'marketing_automation'
  | 'chat'
  | 'ai_training'

export type TemplateInput = {
  jurisdiction: JurisdictionChoice
  vendorGroups: VendorGroup[]
  policyUrl?: string
  policyVersion: string
}

const VENDOR_GROUP_TO_CONST: Record<VendorGroup, string> = {
  privacy_analytics: 'PRIVACY_FRIENDLY_ANALYTICS',
  ad_pixels: 'ADVERTISING_VENDORS',
  session_replay: 'SESSION_REPLAY_VENDORS',
  product_analytics: 'CDP_AND_PRODUCT_ANALYTICS',
  marketing_automation: 'MARKETING_AUTOMATION',
  chat: 'CHAT_WIDGETS',
  ai_training: 'AI_TRAINING_CRAWLERS',
}

type CategoryShape = {
  id: string
  vendorConsts: string[]
  defaultGranted: boolean
  description: string
}

/**
 * Group the picked vendor groups into the three logical categories the
 * generated config exposes: `analytics`, `marketing`, and `ai_training`.
 *
 * - Privacy-friendly analytics → `analytics` (notice-only under UK_DUAA).
 * - Everything else trackable → `marketing`.
 * - AI crawlers get their own category so opt-out can be toggled separately.
 */
function bucketVendorGroups(picked: VendorGroup[]): CategoryShape[] {
  const buckets: CategoryShape[] = []

  if (picked.includes('privacy_analytics')) {
    buckets.push({
      id: 'analytics',
      vendorConsts: ['PRIVACY_FRIENDLY_ANALYTICS'],
      // Default is overwritten by jurisdiction logic in the caller.
      defaultGranted: false,
      description: 'Privacy-friendly site usage statistics.',
    })
  }

  const marketingConsts: string[] = []
  for (const group of picked) {
    if (
      group === 'ad_pixels' ||
      group === 'session_replay' ||
      group === 'product_analytics' ||
      group === 'marketing_automation' ||
      group === 'chat'
    ) {
      marketingConsts.push(VENDOR_GROUP_TO_CONST[group])
    }
  }
  if (marketingConsts.length > 0) {
    buckets.push({
      id: 'marketing',
      vendorConsts: marketingConsts,
      defaultGranted: false,
      description: 'Advertising, remarketing, session replay and product analytics.',
    })
  }

  if (picked.includes('ai_training')) {
    buckets.push({
      id: 'ai_training',
      vendorConsts: ['AI_TRAINING_CRAWLERS'],
      defaultGranted: false,
      description: 'AI training crawlers and LLM data collection.',
    })
  }

  return buckets
}

function jurisdictionExpression(j: JurisdictionChoice): string {
  switch (j) {
    case 'UK_DUAA':
      return 'jurisdictions.UK_DUAA'
    case 'EU_GDPR':
      return 'jurisdictions.EU_GDPR'
    case 'auto':
      return "'auto'"
    case 'custom':
      return 'CUSTOM_JURISDICTION'
  }
}

function buildImports(jurisdiction: JurisdictionChoice, vendorConsts: string[]): string {
  const named: string[] = ['defineConsent']
  if (jurisdiction === 'UK_DUAA' || jurisdiction === 'EU_GDPR' || jurisdiction === 'auto') {
    named.push('jurisdictions')
  }
  if (jurisdiction === 'custom') {
    named.push('type Jurisdiction')
  }
  for (const c of vendorConsts) named.push(c)
  return `import { ${named.join(', ')} } from '@tickboxhq/core'`
}

function buildCustomJurisdictionStub(): string {
  return `
// TODO: replace with your jurisdiction's classification rules.
// See https://docs.tickbox.dev/concepts/jurisdictions/ for the full shape.
const CUSTOM_JURISDICTION: Jurisdiction = {
  id: 'CUSTOM',
  name: 'Custom jurisdiction — fill me in',
  vendorRules: {
    // 'plausible': 'notice',
    // 'google-ads': 'consent',
  },
  defaultMode: 'consent',
  ui: {
    rejectButtonOnFirstLayer: true,
    equalProminence: true,
    honorGPC: false,
  },
}
`
}

/**
 * Render a `consent.config.ts` from prompt answers. Output is plain TS so the
 * user can read and edit it.
 */
export function renderConfig(input: TemplateInput): string {
  const buckets = bucketVendorGroups(input.vendorGroups)

  // Privacy-friendly analytics defaults to granted under UK_DUAA (notice-only),
  // denied everywhere else. The user can flip it later.
  for (const b of buckets) {
    if (b.id === 'analytics' && input.jurisdiction === 'UK_DUAA') {
      b.defaultGranted = true
    }
  }

  const allVendorConsts = Array.from(new Set(buckets.flatMap((b) => b.vendorConsts))).sort()
  const imports = buildImports(input.jurisdiction, allVendorConsts)

  const lines: string[] = []
  lines.push(imports)
  lines.push('')

  if (input.jurisdiction === 'custom') {
    lines.push(buildCustomJurisdictionStub().trim())
    lines.push('')
  }

  if (input.jurisdiction === 'auto') {
    lines.push(
      "// 'auto' resolves jurisdiction by visitor country at runtime. See the multi-jurisdiction recipe:",
    )
    lines.push('// https://docs.tickbox.dev/recipes/multi-jurisdiction/')
  }

  lines.push('export default defineConsent({')
  lines.push(`  jurisdiction: ${jurisdictionExpression(input.jurisdiction)},`)
  lines.push('  policy: {')
  lines.push(`    version: '${input.policyVersion}',`)
  if (input.policyUrl) {
    lines.push(`    url: '${input.policyUrl}',`)
  }
  lines.push('  },')
  lines.push('  categories: {')
  lines.push('    necessary: { required: true },')
  for (const bucket of buckets) {
    const vendorsExpr =
      bucket.vendorConsts.length === 1
        ? `[...${bucket.vendorConsts[0]}]`
        : `[${bucket.vendorConsts.map((c) => `...${c}`).join(', ')}]`
    lines.push(`    ${bucket.id}: {`)
    lines.push(`      vendors: ${vendorsExpr},`)
    lines.push(`      default: ${bucket.defaultGranted},`)
    lines.push(`      description: '${bucket.description}',`)
    lines.push('    },')
  }
  lines.push('  },')
  lines.push('})')
  lines.push('')

  return lines.join('\n')
}
