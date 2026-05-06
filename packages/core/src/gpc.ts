/**
 * Detect a Global Privacy Control signal from the visitor's browser.
 *
 * GPC is exposed as `navigator.globalPrivacyControl` (boolean) and the
 * `Sec-GPC: 1` HTTP header. The header is server-side only; this helper
 * covers the client-side property.
 *
 * @see https://globalprivacycontrol.org/
 */
export function isGPCSignaled(): boolean {
  if (typeof navigator === 'undefined') return false
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}
