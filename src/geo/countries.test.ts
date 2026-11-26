import { describe, expect, it } from 'vitest'
import { COUNTRIES, CONTINENTS, countriesIn } from './countries'

describe('countries', () => {
  it('has 197 countries', () => expect(COUNTRIES.length).toBe(197))
  it('continent counts add up', () =>
    expect(CONTINENTS.reduce((n, c) => n + countriesIn(c).length, 0)).toBe(197))
  it('World is everything', () => expect(countriesIn('World').length).toBe(197))
  it('South America has BRA not MEX', () => {
    const ids = countriesIn('South America').map((c) => c.id)
    expect(ids).toContain('BRA')
    expect(ids).not.toContain('MEX')
  })
})
