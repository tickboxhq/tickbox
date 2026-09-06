import { describe, expect, it } from 'vitest'
import { sanitiseColor } from '../shared/sanitise.js'

describe('sanitiseColor', () => {
  it('passes ordinary CSS colour syntax through untouched', () => {
    for (const v of ['#d5ff3f', 'rgb(1 2 3)', 'hsl(120 50% 50%)', 'oklch(0.7 0.1 200)']) {
      expect(sanitiseColor(v)).toBe(v)
    }
  })

  it('strips characters that could escape a style value', () => {
    expect(sanitiseColor('red;}</style><script>')).not.toContain('<')
    expect(sanitiseColor('red;}</style><script>')).not.toContain('>')
    expect(sanitiseColor('a"b')).not.toContain('"')
    expect(sanitiseColor("a'b")).not.toContain("'")
    expect(sanitiseColor('a\\b')).not.toContain('\\')
    expect(sanitiseColor('a\nb')).not.toContain('\n')
  })

  it('caps length at 64 characters', () => {
    expect(sanitiseColor('#'.repeat(200))).toHaveLength(64)
  })
})
