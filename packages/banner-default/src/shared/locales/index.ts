import type { BannerCopy, NoticeCopy } from '../copy.js'
import * as de from './de.js'
import * as en from './en.js'
import * as es from './es.js'
import * as fr from './fr.js'
import * as it from './it.js'
import * as nl from './nl.js'
import * as pl from './pl.js'
import * as pt from './pt.js'

export type LocalePack = {
  banner: BannerCopy
  notice: NoticeCopy
}

export const locales: Record<string, LocalePack> = {
  en: { banner: en.banner, notice: en.notice },
  de: { banner: de.banner, notice: de.notice },
  fr: { banner: fr.banner, notice: fr.notice },
  es: { banner: es.banner, notice: es.notice },
  it: { banner: it.banner, notice: it.notice },
  nl: { banner: nl.banner, notice: nl.notice },
  pt: { banner: pt.banner, notice: pt.notice },
  pl: { banner: pl.banner, notice: pl.notice },
}

export type LocaleCode = keyof typeof locales

/**
 * Resolve a BCP-47 locale tag to a built-in locale pack. Falls back from
 * the full tag (`en-GB`) to the language prefix (`en`), then to English.
 *
 * Pass `'auto'` to read `navigator.language` at call time. Anywhere that
 * `navigator` is missing (SSR, Node), `'auto'` falls back to English.
 */
export function resolveLocalePack(locale: string | undefined): LocalePack {
  if (!locale) return locales.en as LocalePack
  const tag = locale === 'auto' ? readNavigatorLanguage() : locale
  if (!tag) return locales.en as LocalePack
  const lower = tag.toLowerCase()
  if (locales[lower]) return locales[lower] as LocalePack
  const prefix = lower.split('-')[0]
  if (prefix && locales[prefix]) return locales[prefix] as LocalePack
  return locales.en as LocalePack
}

function readNavigatorLanguage(): string | undefined {
  if (typeof navigator === 'undefined') return undefined
  return navigator.language
}
