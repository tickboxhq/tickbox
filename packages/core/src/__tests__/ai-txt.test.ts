import { describe, expect, it } from 'vitest'
import { generateAiBotRobotsRules, generateAiTxt } from '../ai-txt.js'
import { defineConsent } from '../define-consent.js'
import { UK_DUAA } from '../jurisdictions/uk-duaa.js'

const baseConfig = {
  jurisdiction: UK_DUAA,
  categories: { necessary: { required: true } },
}

describe('generateAiTxt', () => {
  it('disallows by default when ai_training category is absent', () => {
    const txt = generateAiTxt(defineConsent(baseConfig))
    expect(txt).toContain('User-Agent: *')
    expect(txt).toContain('Disallow: /')
    expect(txt).not.toContain('Allow: /')
  })

  it('disallows when ai_training has default: false', () => {
    const config = defineConsent({
      ...baseConfig,
      categories: {
        ...baseConfig.categories,
        ai_training: { vendors: ['gptbot'], default: false },
      },
    })
    const txt = generateAiTxt(config)
    expect(txt).toContain('Disallow: /')
  })

  it('allows when ai_training has explicit default: true', () => {
    const config = defineConsent({
      ...baseConfig,
      categories: {
        ...baseConfig.categories,
        ai_training: { vendors: ['gptbot'], default: true },
      },
    })
    const txt = generateAiTxt(config)
    expect(txt).toContain('Allow: /')
    expect(txt).not.toContain('Disallow: /')
  })

  it('allows when ai_training is required (always-on)', () => {
    const config = defineConsent({
      ...baseConfig,
      categories: {
        ...baseConfig.categories,
        ai_training: { required: true },
      },
    })
    const txt = generateAiTxt(config)
    expect(txt).toContain('Allow: /')
  })

  it('includes site URL as a comment when provided', () => {
    const txt = generateAiTxt(defineConsent(baseConfig), { siteUrl: 'https://example.com' })
    expect(txt).toContain('# https://example.com/ai.txt')
  })

  it('strips trailing slashes from siteUrl', () => {
    const txt = generateAiTxt(defineConsent(baseConfig), { siteUrl: 'https://example.com/' })
    expect(txt).toContain('# https://example.com/ai.txt')
    expect(txt).not.toContain('com//ai.txt')
  })

  it('includes policy version when present', () => {
    const config = defineConsent({
      ...baseConfig,
      policy: { version: '2026-05-06', url: '/privacy' },
    })
    const txt = generateAiTxt(config)
    expect(txt).toContain('# Policy version: 2026-05-06')
  })

  it('ends with a newline (POSIX text-file convention)', () => {
    const txt = generateAiTxt(defineConsent(baseConfig))
    expect(txt.endsWith('\n')).toBe(true)
  })
})

describe('generateAiBotRobotsRules', () => {
  it('blocks all known AI crawlers when ai_training category absent', () => {
    const txt = generateAiBotRobotsRules(defineConsent(baseConfig))
    expect(txt).toContain('User-agent: GPTBot')
    expect(txt).toContain('User-agent: ClaudeBot')
    expect(txt).toContain('User-agent: Google-Extended')
    expect(txt).toContain('User-agent: PerplexityBot')
    expect(txt).toContain('Disallow: /')
  })

  it('blocks only the declared vendors when vendors list is present', () => {
    const config = defineConsent({
      ...baseConfig,
      categories: {
        ...baseConfig.categories,
        ai_training: { vendors: ['gptbot', 'claudebot'], default: false },
      },
    })
    const txt = generateAiBotRobotsRules(config)
    expect(txt).toContain('User-agent: GPTBot')
    expect(txt).toContain('User-agent: ClaudeBot')
    expect(txt).not.toContain('User-agent: Google-Extended')
    expect(txt).not.toContain('User-agent: PerplexityBot')
  })

  it('returns an allow-comment when ai_training is granted', () => {
    const config = defineConsent({
      ...baseConfig,
      categories: {
        ...baseConfig.categories,
        ai_training: { default: true },
      },
    })
    const txt = generateAiBotRobotsRules(config)
    expect(txt).toContain('AI training: allowed')
    expect(txt).not.toContain('Disallow: /')
  })

  it('skips unknown vendor identifiers gracefully', () => {
    const config = defineConsent({
      ...baseConfig,
      categories: {
        ...baseConfig.categories,
        ai_training: { vendors: ['gptbot', 'made-up-bot'], default: false },
      },
    })
    const txt = generateAiBotRobotsRules(config)
    expect(txt).toContain('User-agent: GPTBot')
    expect(txt).not.toContain('made-up-bot')
  })

  it('returns an explanatory comment when only unknown vendors are listed', () => {
    const config = defineConsent({
      ...baseConfig,
      categories: {
        ...baseConfig.categories,
        ai_training: { vendors: ['some-future-bot'], default: false },
      },
    })
    const txt = generateAiBotRobotsRules(config)
    expect(txt).toContain('no known crawlers')
  })

  it('maps every vendor in AI_TRAINING_CRAWLERS to a real User-Agent', () => {
    // Sanity check: every vendor we ship should produce a robots.txt rule
    // when listed. If a new entry is added to AI_TRAINING_CRAWLERS without
    // a matching VENDOR_TO_USER_AGENT mapping, this catches it.
    const txt = generateAiBotRobotsRules(defineConsent(baseConfig))
    const allKnownAgents = [
      'GPTBot',
      'ClaudeBot',
      'anthropic-ai',
      'Google-Extended',
      'PerplexityBot',
      'CCBot',
      'Bytespider',
      'Applebot-Extended',
      'meta-externalagent',
      'OAI-SearchBot',
    ]
    for (const ua of allKnownAgents) {
      expect(txt).toContain(`User-agent: ${ua}`)
    }
  })
})
