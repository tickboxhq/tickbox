import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  cancel,
  confirm,
  group,
  intro,
  multiselect,
  note,
  outro,
  select,
  text,
} from '@clack/prompts'
import pc from 'picocolors'
import { type JurisdictionChoice, type VendorGroup, renderConfig } from './init-templates.js'

type Framework = 'none' | 'react' | 'vue' | 'nuxt'
type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

export async function init(args: string[]): Promise<number> {
  const cwdArgIndex = args.indexOf('--cwd')
  const cwd = cwdArgIndex >= 0 ? resolve(args[cwdArgIndex + 1] ?? '.') : process.cwd()

  if (!existsSync(resolve(cwd, 'package.json'))) {
    console.error(pc.red('error: no package.json found in this directory.'))
    console.error('Run this from your project root, or pass --cwd path/to/project.')
    return 2
  }

  intro(pc.bold('Tickbox config setup'))

  const configPath = resolve(cwd, 'consent.config.ts')

  const answers = await group(
    {
      jurisdiction: () =>
        select<JurisdictionChoice>({
          message: 'Where will this site be served?',
          options: [
            {
              value: 'UK_DUAA',
              label: 'UK',
              hint: 'UK_DUAA — DUAA statistical-purposes exemption',
            },
            { value: 'EU_GDPR', label: 'EU', hint: 'EU_GDPR — strict consent for all tracking' },
            { value: 'auto', label: 'Both', hint: 'auto-detect by visitor country' },
            { value: 'custom', label: 'Custom', hint: 'write your own jurisdiction' },
          ],
          initialValue: 'UK_DUAA',
        }),
      vendorGroups: () =>
        multiselect<VendorGroup>({
          message: 'Which vendors are you using? (space to toggle, enter to confirm)',
          required: false,
          options: [
            {
              value: 'privacy_analytics',
              label: 'Privacy-friendly analytics',
              hint: 'Plausible, Fathom, GoatCounter, Umami…',
            },
            {
              value: 'ad_pixels',
              label: 'Ad pixels & GA / GTM',
              hint: 'GA4, Meta, TikTok, LinkedIn, X, Pinterest…',
            },
            {
              value: 'session_replay',
              label: 'Session replay',
              hint: 'Hotjar, FullStory, Microsoft Clarity…',
            },
            {
              value: 'product_analytics',
              label: 'Product analytics / CDP',
              hint: 'Mixpanel, Amplitude, PostHog, Segment…',
            },
            {
              value: 'marketing_automation',
              label: 'Marketing automation',
              hint: 'HubSpot, Klaviyo, Mailchimp, Braze…',
            },
            {
              value: 'chat',
              label: 'Chat widgets',
              hint: 'Intercom, Drift, Crisp…',
            },
            {
              value: 'ai_training',
              label: 'AI training crawler opt-out',
              hint: 'recommended for content sites',
            },
          ],
        }),
      policyUrl: () =>
        text({
          message: 'Privacy policy URL (optional)?',
          placeholder: '/privacy',
          defaultValue: '',
        }),
      overwrite: () => {
        if (!existsSync(configPath)) return Promise.resolve(false as const)
        return confirm({
          message: `${pc.yellow('consent.config.ts already exists.')} Overwrite?`,
          initialValue: false,
        })
      },
      framework: () =>
        select<Framework>({
          message: 'Which framework adapter would you like installed?',
          options: [
            { value: 'none', label: "None — I'll handle it myself" },
            { value: 'react', label: 'React (@tickboxhq/react)' },
            { value: 'vue', label: 'Vue (@tickboxhq/vue)' },
            { value: 'nuxt', label: 'Nuxt (@tickboxhq/nuxt)' },
          ],
          initialValue: 'react',
        }),
      banner: () =>
        confirm({
          message: 'Install the drop-in styled banner (@tickboxhq/banner-default)?',
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        cancel('Setup cancelled.')
        process.exit(1)
      },
    },
  )

  if (existsSync(configPath) && answers.overwrite === false) {
    outro(pc.yellow('Skipped — existing consent.config.ts kept.'))
    return 0
  }

  const policyVersion = new Date().toISOString().slice(0, 10)
  const configSource = renderConfig({
    jurisdiction: answers.jurisdiction,
    vendorGroups: answers.vendorGroups,
    policyUrl: answers.policyUrl ? String(answers.policyUrl).trim() || undefined : undefined,
    policyVersion,
  })

  writeFileSync(configPath, configSource, 'utf8')

  const packagesToInstall: string[] = ['@tickboxhq/core']
  if (answers.framework !== 'none') packagesToInstall.push(`@tickboxhq/${answers.framework}`)
  if (answers.banner) packagesToInstall.push('@tickboxhq/banner-default')

  const pm = detectPackageManager(cwd)
  const installCmd = formatInstallCommand(pm, packagesToInstall)

  const installLine = pm
    ? `Installing with ${pm}: ${packagesToInstall.join(', ')}`
    : `No lockfile detected — run this to add the SDK packages:\n  ${pc.dim(installCmd)}`
  note(`${pc.green(`✓ wrote ${relativeFromCwd(cwd, configPath)}`)}\n\n${installLine}`)

  if (pm) {
    const ok = runInstall(pm, packagesToInstall, cwd)
    if (!ok) {
      console.error(pc.red('Install failed. You can re-run it manually:'))
      console.error(`  ${installCmd}`)
      return 1
    }
  }

  const next: string[] = []
  next.push(pc.bold('Next steps:'))
  next.push(...nextStepsFor(answers.framework, answers.banner))
  note(next.join('\n'))

  outro(pc.green('Done.'))
  return 0
}

function runInstall(pm: PackageManager, pkgs: string[], cwd: string): boolean {
  const args =
    pm === 'npm' ? ['install', ...pkgs] : pm === 'yarn' ? ['add', ...pkgs] : ['add', ...pkgs]
  const result = spawnSync(pm, args, { cwd, stdio: 'inherit' })
  return result.status === 0
}

function nextStepsFor(framework: Framework, banner: boolean): string[] {
  const out: string[] = []
  switch (framework) {
    case 'react':
      out.push('  1. Wrap your app: <ConsentProvider config={config}>')
      out.push('     https://docs.tickbox.dev/getting-started/react/')
      break
    case 'vue':
      out.push('  1. Install the plugin: app.use(consentPlugin, { config })')
      out.push('     https://docs.tickbox.dev/getting-started/vue/')
      break
    case 'nuxt':
      out.push("  1. Add '@tickboxhq/nuxt' to nuxt.config.ts modules")
      out.push('     https://docs.tickbox.dev/getting-started/nuxt/')
      break
    case 'none':
      out.push('  1. See https://docs.tickbox.dev/getting-started/vanilla/')
      break
  }
  if (banner) {
    out.push('  2. Drop in <ConsentBannerDefault /> (or roll your own)')
  } else {
    out.push('  2. Render a banner — headless <ConsentBanner> or your own')
  }
  out.push('  3. Gate scripts: <script type="text/plain" data-tb-category="analytics" src="…">')
  return out
}

function relativeFromCwd(cwd: string, full: string): string {
  if (full.startsWith(`${cwd}/`)) return `./${full.slice(cwd.length + 1)}`
  return full
}

export function detectPackageManager(cwd: string): PackageManager | null {
  if (existsSync(resolve(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(resolve(cwd, 'bun.lockb'))) return 'bun'
  if (existsSync(resolve(cwd, 'yarn.lock'))) return 'yarn'
  if (existsSync(resolve(cwd, 'package-lock.json'))) return 'npm'
  // Fall back to whatever the package.json declares via `packageManager`.
  try {
    const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8')) as {
      packageManager?: string
    }
    if (pkg.packageManager?.startsWith('pnpm')) return 'pnpm'
    if (pkg.packageManager?.startsWith('yarn')) return 'yarn'
    if (pkg.packageManager?.startsWith('bun')) return 'bun'
    if (pkg.packageManager?.startsWith('npm')) return 'npm'
  } catch {
    // ignore
  }
  return null
}

export function formatInstallCommand(pm: PackageManager | null, pkgs: string[]): string {
  const list = pkgs.join(' ')
  switch (pm) {
    case 'pnpm':
      return `pnpm add ${list}`
    case 'yarn':
      return `yarn add ${list}`
    case 'bun':
      return `bun add ${list}`
    case 'npm':
      return `npm install ${list}`
    default:
      return `npm install ${list}`
  }
}
