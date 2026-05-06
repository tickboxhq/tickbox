import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ConsentConfig } from '@tickboxhq/core'
import pc from 'picocolors'

type Issue = { level: 'error' | 'warning'; message: string }

export async function validate(args: string[]): Promise<number> {
  const path = args[0] ?? './consent.config.ts'
  const absolute = resolve(process.cwd(), path)

  if (!existsSync(absolute)) {
    console.error(pc.red(`error: config file not found: ${path}`))
    console.error(`(looked for ${absolute})`)
    return 2
  }

  if (path.endsWith('.ts')) {
    console.error(pc.red('error: .ts files cannot be loaded directly by Node yet.'))
    console.error('Pass a compiled .js / .mjs path, or run via tsx:')
    console.error(`  npx tsx node_modules/@tickboxhq/cli/dist/cli.js validate ${path}`)
    return 2
  }

  let config: ConsentConfig
  try {
    const mod = await import(pathToFileURL(absolute).href)
    config = (mod.default ?? mod) as ConsentConfig
  } catch (err) {
    console.error(
      pc.red(`error: failed to load config: ${err instanceof Error ? err.message : String(err)}`),
    )
    return 1
  }

  const issues = check(config)

  console.log(pc.bold(`Tickbox validate — ${path}`))
  console.log()

  if (issues.length === 0) {
    console.log(pc.green('No issues found.'))
    return 0
  }

  for (const issue of issues) {
    const tag = issue.level === 'error' ? pc.red(pc.bold('error  ')) : pc.yellow(pc.bold('warning'))
    console.log(`  ${tag} ${issue.message}`)
  }
  console.log()
  const errorCount = issues.filter((i) => i.level === 'error').length
  const warningCount = issues.length - errorCount
  console.log(
    `${errorCount} error${errorCount === 1 ? '' : 's'}, ${warningCount} warning${warningCount === 1 ? '' : 's'}`,
  )
  return errorCount > 0 ? 1 : 0
}

function check(config: ConsentConfig): Issue[] {
  const issues: Issue[] = []

  if (!config.jurisdiction) {
    issues.push({
      level: 'error',
      message:
        'jurisdiction is missing — set jurisdictions.UK_DUAA, jurisdictions.EU_GDPR, or "auto"',
    })
  }

  if (!config.categories || Object.keys(config.categories).length === 0) {
    issues.push({ level: 'error', message: 'categories is missing or empty' })
    return issues
  }

  const hasNecessary = Object.values(config.categories).some((c) => c.required)
  if (!hasNecessary) {
    issues.push({
      level: 'warning',
      message:
        'no required category — typically you want a `necessary` category with `required: true` for sign-in / security cookies',
    })
  }

  if (!config.policy?.version) {
    issues.push({
      level: 'warning',
      message:
        "policy.version is missing — without it, the SDK can't detect when to re-show the banner after a policy change",
    })
  }

  for (const [id, cat] of Object.entries(config.categories)) {
    if (cat.required && cat.default === false) {
      issues.push({
        level: 'error',
        message: `category "${id}" is required: true but default: false — required categories must default to true`,
      })
    }
    if (!cat.required && (cat.vendors?.length ?? 0) === 0 && !cat.description) {
      issues.push({
        level: 'warning',
        message: `category "${id}" has no vendors and no description — consider documenting what it gates`,
      })
    }
  }

  if (config.consentMode) {
    const validKeys = new Set([
      'ad_storage',
      'ad_user_data',
      'ad_personalization',
      'analytics_storage',
      'functionality_storage',
      'personalization_storage',
      'security_storage',
    ])
    for (const key of Object.keys(config.consentMode)) {
      if (!validKeys.has(key)) {
        issues.push({
          level: 'error',
          message: `consentMode key "${key}" is not a Google Consent Mode v2 key`,
        })
      }
    }
    for (const [key, rule] of Object.entries(config.consentMode)) {
      if (rule && 'category' in rule && rule.category && !config.categories[rule.category]) {
        issues.push({
          level: 'error',
          message: `consentMode.${key}.category "${rule.category}" is not declared in categories`,
        })
      }
    }
  }

  return issues
}
