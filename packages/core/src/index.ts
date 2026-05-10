export { type AiTxtOptions, generateAiBotRobotsRules, generateAiTxt } from './ai-txt.js'
export { type ApplyOptions, applyConsent, TAG_ATTRIBUTE } from './apply.js'
export { defineConsent } from './define-consent.js'
export { isGPCSignaled } from './gpc.js'
export {
  ADVERTISING_VENDORS,
  AI_TRAINING_CRAWLERS,
  ALL_TRACKING_VENDORS,
  CDP_AND_PRODUCT_ANALYTICS,
  CHAT_WIDGETS,
  jurisdictions,
  MARKETING_AUTOMATION,
  PRIVACY_FRIENDLY_ANALYTICS,
  resolveJurisdictionByCountry,
  SESSION_REPLAY_VENDORS,
} from './jurisdictions/index.js'
export { resolveCategories } from './resolve.js'
export { type ConsentState, ConsentStore, type StoreOptions } from './store.js'
export { clearConsent, parseConsentFromHeader, readConsent, writeConsent } from './storage.js'
export type {
  CategoryDefinition,
  CategoryId,
  ConsentConfig,
  ConsentMode,
  ConsentModeMapping,
  ConsentModeRule,
  GtagConsentKey,
  Jurisdiction,
  JurisdictionId,
  ResolvedCategory,
  StorageOptions,
  StoredConsent,
} from './types.js'
