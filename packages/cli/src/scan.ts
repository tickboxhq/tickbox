import pc from 'picocolors'
import { type VendorPattern, detectVendors } from './vendor-patterns.js'

const CATEGORY_GUIDANCE: Record<
  VendorPattern['category'],
  { tickboxCategory: string; ukDuaaMode: string }
> = {
  analytics: { tickboxCategory: 'analytics', ukDuaaMode: 'notice (DUAA exempt)' },
  marketing: { tickboxCategory: 'marketing', ukDuaaMode: 'consent' },
  replay: { tickboxCategory: 'session_replay', ukDuaaMode: 'consent' },
  cdp: { tickboxCategory: 'analytics', ukDuaaMode: 'consent' },
  martech: { tickboxCategory: 'marketing', ukDuaaMode: 'consent' },
  chat: { tickboxCategory: 'chat', ukDuaaMode: 'consent' },
}

export async function scan(args: string[]): Promise<number> {
  const url = args[0]
  if (!url) {
    console.error(pc.red('error: missing URL'))
    console.error('usage: tickbox scan <url>')
    return 2
  }

  let target: URL
  try {
    target = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch {
    console.error(pc.red(`error: invalid URL: ${url}`))
    return 2
  }

  console.log(pc.bold(`Tickbox scan — ${target.href}`))
  console.log()

  let html: string
  try {
    const res = await fetch(target.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TickboxScanner/0.0.1)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    if (!res.ok) {
      console.error(pc.red(`error: ${res.status} ${res.statusText}`))
      return 1
    }
    html = await res.text()
  } catch (err) {
    console.error(pc.red(`error: ${err instanceof Error ? err.message : String(err)}`))
    return 1
  }

  const vendors = detectVendors(html)

  if (vendors.length === 0) {
    console.log(pc.green('No tracking vendors detected in the page HTML.'))
    console.log()
    console.log(
      pc.dim(
        '(This scan only inspects what the server responded with. Vendors\n' +
          ' loaded dynamically by JavaScript may be missed. Use `tickbox\n' +
          ' scan --render` for a JS-rendered scan once that is available.)',
      ),
    )
    return 0
  }

  console.log(pc.bold(`Detected ${vendors.length} vendor${vendors.length === 1 ? '' : 's'}:`))
  console.log()

  const counts: Record<string, number> = {}
  for (const v of vendors) {
    const guidance = CATEGORY_GUIDANCE[v.category]
    counts[guidance.tickboxCategory] = (counts[guidance.tickboxCategory] ?? 0) + 1
    console.log(`  ${pc.green('✓')} ${pc.bold(v.id.padEnd(24))} ${pc.dim(v.category)}`)
    console.log(`    ${pc.dim('→ Tickbox category:')} ${guidance.tickboxCategory}`)
    console.log(`    ${pc.dim('→ Mode under UK_DUAA:')} ${guidance.ukDuaaMode}`)
    console.log()
  }

  console.log(pc.bold('Suggested categories:'))
  console.log()
  for (const [cat, count] of Object.entries(counts)) {
    console.log(`  ${cat.padEnd(20)} ${count} vendor${count === 1 ? '' : 's'}`)
  }

  console.log()
  console.log(pc.dim('Add these to your `consent.config.ts` and group vendors as fits your site.'))
  console.log(pc.dim('See https://tickbox.dev for the full schema.'))
  return 0
}
