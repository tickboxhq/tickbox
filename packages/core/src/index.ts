export { applyConsent, TAG_ATTRIBUTE } from './apply.js'
export { defineConsent } from './define-consent.js'
export { isGPCSignaled } from './gpc.js'
export { jurisdictions, resolveJurisdictionByCountry } from './jurisdictions/index.js'
export { resolveCategories } from './resolve.js'
export { type ConsentState, ConsentStore, type StoreOptions } from './store.js'
export { clearConsent, parseConsentFromHeader, readConsent, writeConsent } from './storage.js'
export type {
  CategoryDefinition,
  CategoryId,
  ConsentConfig,
  ConsentMode,
  Jurisdiction,
  JurisdictionId,
  ResolvedCategory,
  StorageOptions,
  StoredConsent,
} from './types.js'
