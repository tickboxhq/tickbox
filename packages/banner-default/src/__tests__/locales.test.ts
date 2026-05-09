import { describe, expect, it } from 'vitest'
import { locales, resolveLocalePack } from '../shared/locales/index.js'

describe('resolveLocalePack', () => {
  it('returns English when locale is undefined', () => {
    expect(resolveLocalePack(undefined).banner.acceptLabel).toBe('Accept all')
  })

  it('matches an exact built-in locale', () => {
    expect(resolveLocalePack('de').banner.acceptLabel).toBe('Alle akzeptieren')
  })

  it('resolves Ukrainian (uk)', () => {
    expect(resolveLocalePack('uk').banner.acceptLabel).toBe('Прийняти всі')
    expect(resolveLocalePack('uk-UA').banner.acceptLabel).toBe('Прийняти всі')
    expect(resolveLocalePack('uk').notice.acknowledgeLabel).toBe('Зрозуміло')
  })

  it('falls back from BCP-47 tag to language prefix', () => {
    expect(resolveLocalePack('pt-BR').banner.acceptLabel).toBe('Aceitar tudo')
    expect(resolveLocalePack('de-AT').banner.acceptLabel).toBe('Alle akzeptieren')
  })

  it('falls back to English for unknown locales', () => {
    expect(resolveLocalePack('zh-Hant').banner.acceptLabel).toBe('Accept all')
    expect(resolveLocalePack('xx').banner.acceptLabel).toBe('Accept all')
  })

  it('treats locale codes case-insensitively', () => {
    expect(resolveLocalePack('FR').banner.acceptLabel).toBe('Tout accepter')
    expect(resolveLocalePack('Fr-CH').banner.acceptLabel).toBe('Tout accepter')
  })

  it('reads navigator.language when locale is "auto"', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'it-IT' },
      configurable: true,
    })
    try {
      expect(resolveLocalePack('auto').banner.acceptLabel).toBe('Accetta tutto')
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
      })
    }
  })

  it('falls back to English when "auto" runs without navigator', () => {
    expect(resolveLocalePack('auto').banner.acceptLabel).toBe('Accept all')
  })

  it('exposes all built-in locales with banner+notice keys', () => {
    for (const code of Object.keys(locales)) {
      const pack = locales[code]
      expect(pack?.banner.acceptLabel.length).toBeGreaterThan(0)
      expect(pack?.banner.rejectLabel.length).toBeGreaterThan(0)
      expect(pack?.notice.acknowledgeLabel.length).toBeGreaterThan(0)
    }
  })
})
