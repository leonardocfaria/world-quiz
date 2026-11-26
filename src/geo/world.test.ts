import { describe, expect, it } from 'vitest'
import { COUNTRIES } from './countries'
import { WORLD } from './world'

const shapeIds = WORLD.shapes.map((s) => s.countryId).filter((id): id is string => id !== null)
const markerIds = WORLD.markers.map((m) => m.countryId)

describe('WORLD', () => {
  it('gives every country a shape or a marker', () => {
    for (const c of COUNTRIES) {
      expect(shapeIds.includes(c.id) || markerIds.includes(c.id), c.id).toBe(true)
    }
  })

  it('matches each country to at most one shape', () => {
    expect(new Set(shapeIds).size).toBe(shapeIds.length)
  })

  it('puts tiny countries on markers', () => {
    for (const id of ['VAT', 'MCO', 'NRU', 'TUV', 'MDV']) expect(markerIds, id).toContain(id)
  })

  it('keeps big countries on shapes only', () => {
    for (const id of ['BRA', 'RUS']) {
      expect(shapeIds, id).toContain(id)
      expect(markerIds, id).not.toContain(id)
    }
  })

  it('has shapes for Kosovo and Taiwan', () => {
    expect(shapeIds).toContain('UNK')
    expect(shapeIds).toContain('TWN')
  })
})
