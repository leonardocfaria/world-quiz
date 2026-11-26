import { describe, expect, it } from 'vitest'
import { MAP_H, MAP_W, projectionFor } from './projection'

const inside = (p: [number, number] | null) =>
  !!p && p[0] >= 0 && p[0] <= MAP_W && p[1] >= 0 && p[1] <= MAP_H

describe('projectionFor', () => {
  it('Oceania frames Samoa and Australia', () => {
    const p = projectionFor('Oceania')
    expect(inside(p([-172.3, -13.6]))).toBe(true)
    expect(inside(p([134, -25]))).toBe(true)
  })
  it('Europe frames Paris but not Tokyo', () => {
    const p = projectionFor('Europe')
    expect(inside(p([2.35, 48.85]))).toBe(true)
    expect(inside(p([139.7, 35.7]))).toBe(false)
  })
})
