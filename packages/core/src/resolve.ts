import type { ConsentConfig, ConsentMode, Jurisdiction, ResolvedCategory } from './types.js'

/**
 * Resolve each declared category against the active jurisdiction's vendor rules.
 *
 * For each category, the most-restrictive vendor mode wins:
 *   `consent` > `notice` > `always`
 *
 * Categories with no vendors fall back to the jurisdiction's default mode,
 * unless `required: true` (always allowed) or an explicit `mode` override is set.
 */
export function resolveCategories(
  config: ConsentConfig,
  jurisdiction: Jurisdiction,
): ResolvedCategory[] {
  return Object.entries(config.categories).map(([id, def]) => {
    const required = def.required === true
    const explicit = def.mode
    const vendors = def.vendors ?? []

    let mode: ConsentMode
    if (required) {
      mode = 'always'
    } else if (explicit) {
      mode = explicit
    } else if (vendors.length === 0) {
      mode = jurisdiction.defaultMode
    } else {
      mode = mostRestrictive(
        vendors.map((v) => jurisdiction.vendorRules[v] ?? jurisdiction.defaultMode),
      )
    }

    return {
      id,
      required,
      mode,
      default: required ? true : (def.default ?? false),
      vendors,
      description: def.description,
    }
  })
}

const ORDER: Record<ConsentMode, number> = { always: 0, notice: 1, consent: 2 }

function mostRestrictive(modes: ConsentMode[]): ConsentMode {
  let winner: ConsentMode = 'always'
  for (const m of modes) {
    if (ORDER[m] > ORDER[winner]) winner = m
  }
  return winner
}
