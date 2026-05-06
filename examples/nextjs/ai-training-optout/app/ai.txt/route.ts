import { generateAiTxt } from '@tickboxhq/core'
import config from '../consent.config'

// Cache the response — only changes when consent.config.ts changes (and the
// app redeploys). Bumping `policy.version` is the easiest invalidation cue.
export const dynamic = 'force-static'

export function GET() {
  const body = generateAiTxt(config, {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com',
  })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  })
}
