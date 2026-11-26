import { describe, expect, it } from 'vitest'
import { continentOf, isIncluded, toCountry, validateSnapshot } from './fromApi'
import type { RawCountry } from './fromApi'
import type { Country } from './countries'

const raw = (o: Partial<RawCountry>): RawCountry => ({
  name: { common: 'X', official: 'Y' },
  cca3: 'XXX',
  region: 'Europe',
  latlng: [1, 2],
  unMember: true,
  altSpellings: [],
  ...o,
})

describe('continentOf', () => {
  it('maps regions', () => {
    expect(continentOf('Americas', 'South America')).toBe('South America')
    expect(continentOf('Americas', 'Caribbean')).toBe('North America')
    expect(continentOf('Antarctic')).toBeNull()
    expect(continentOf('Europe')).toBe('Europe')
  })
})

describe('isIncluded', () => {
  it('includes specials and excludes other non-members', () => {
    expect(isIncluded(raw({ cca3: 'UNK', unMember: false }))).toBe(true)
    expect(isIncluded(raw({ cca3: 'TWN', unMember: false }))).toBe(true)
    expect(isIncluded(raw({ cca3: 'GRL', unMember: false }))).toBe(false)
  })
})

describe('toCountry', () => {
  it('drops short altSpellings and nulls missing ccn3', () => {
    const c = toCountry(raw({ altSpellings: ['XK', 'Kosova'] }))
    expect(c.altNames).toEqual(['Kosova'])
    expect(c.ccn3).toBeNull()
  })
})

describe('validateSnapshot', () => {
  const mk = (id: string, continent: Country['continent']): Country => ({
    id, ccn3: null, name: id, officialName: id, altNames: [], capitals: [], continent, latlng: [0, 0],
  })
  const conts: Country['continent'][] = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania']
  const full = Array.from({ length: 197 }, (_, i) => mk('C' + i, conts[i % 6]))
  it('accepts a valid snapshot', () => expect(validateSnapshot(full)).toEqual([]))
  it('rejects 196', () => expect(validateSnapshot(full.slice(1)).length).toBeGreaterThan(0))
  it('rejects duplicate id', () =>
    expect(validateSnapshot([...full.slice(1), full[1]]).length).toBeGreaterThan(0))
  it('rejects empty continent', () =>
    expect(validateSnapshot(full.map((c) => ({ ...c, continent: 'Africa' as const }))).length).toBeGreaterThan(0))
})
