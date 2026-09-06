/**
 * Strip anything outside the CSS-colour character set from a value bound for
 * a CSS custom property.
 *
 * These values arrive over the network from the remote-theme endpoint, so a
 * compromise of that endpoint could otherwise place arbitrary text into a
 * style context. Removing the characters that terminate a declaration, an
 * attribute or a style element leaves the worst case as benign CSS.
 *
 * Lives here because three renderers need it. It previously existed as three
 * identical private copies, which is one fix landing in one place and missing
 * two.
 */
export function sanitiseColor(v: string): string {
  // Permit common CSS-colour characters: hex digits, and the function tokens
  // used by color() / rgb() / hsl() / oklch(). Block < > & " ' backslash and
  // newlines.
  return v.replace(/[<>&"'\n\r\\]/g, '').slice(0, 64)
}
