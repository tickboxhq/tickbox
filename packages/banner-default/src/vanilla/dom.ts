/**
 * The only DOM sugar in this renderer. Deliberately tiny: a framework is
 * exactly what this entry point exists to avoid, and anything more elaborate
 * would drift from what the React and Vue renderers produce.
 *
 * Text is always set through `textContent`, never `innerHTML`. Copy strings
 * can come from a merchant-editable remote theme, so treating them as markup
 * would turn the theme endpoint into an XSS vector.
 */
export type Attrs = Record<string, string | undefined>

export function el(
  tag: string,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElement {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) continue
    node.setAttribute(k, v)
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return node
}
