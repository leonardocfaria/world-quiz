import { describe, expect, it } from 'vitest'
import { COUNTRIES, type Country } from '../geo/countries'
import { ALIASES } from '../data/aliases'
import { buildNameIndex, matchName, normalize } from './match'

const index = buildNameIndex(COUNTRIES, ALIASES)

function country(id: string, name: string, altNames: string[] = []): Country {
  return {
    id,
    ccn3: null,
    name,
    officialName: name,
    altNames,
    capitals: [],
    continent: 'Africa',
    latlng: [0, 0],
  }
}

describe('normalize', () => {
  it('trims before dropping the article', () => {
    expect(normalize(' the gambia')).toBe('gambia')
  })
  it('strips accents and punctuation', () => {
    expect(normalize("Côte d'Ivoire")).toBe('cotedivoire')
  })
  it('expands St to Saint as a whole word', () => {
    expect(normalize('St. Lucia')).toBe('saintlucia')
  })
  it('drops a leading The', () => {
    expect(normalize('The Gambia')).toBe('gambia')
  })
  it('turns & into and', () => {
    expect(normalize('Bosnia & Herzegovina')).toBe('bosniaandherzegovina')
  })
})

describe('matchName', () => {
  it.each([
    ['cote divoire', 'CIV'],
    ['Ivory Coast', 'CIV'],
    ['sao tome and principe', 'STP'],
    ['St Lucia', 'LCA'],
    ['czech republic', 'CZE'],
    ['burma', 'MMR'],
    ['the gambia', 'GMB'],
    ['usa', 'USA'],
    ['UK', 'GBR'],
    ['kosovo', 'UNK'],
    ['taiwan', 'TWN'],
  ])('maps %s to %s', (input, id) => {
    expect(matchName(input, index)).toBe(id)
  })

  it('returns null for an ambiguous or absent name', () => {
    expect(matchName('Korea', index)).toBeNull()
    expect(matchName('xyz', index)).toBeNull()
  })

  it('drops a key that two countries share', () => {
    const idx = buildNameIndex(
      [country('AAA', 'Alpha'), country('BBB', 'Beta', ['Gamma'])],
      { AAA: ['Gamma'] },
    )
    expect(matchName('Gamma', idx)).toBeNull()
    expect(matchName('Alpha', idx)).toBe('AAA')
    expect(matchName('Beta', idx)).toBe('BBB')
  })

  it('keeps prefix pairs distinct', () => {
    expect(matchName('niger', index)).toBe('NER')
    expect(matchName('nigeria', index)).toBe('NGA')
    expect(matchName('guinea', index)).toBe('GIN')
    expect(matchName('guinea bissau', index)).toBe('GNB')
    expect(matchName('dominica', index)).toBe('DMA')
    expect(matchName('dominican republic', index)).toBe('DOM')
  })

  it('matches every country name to its own id', () => {
    for (const c of COUNTRIES) {
      expect(matchName(c.name, index), c.name).toBe(c.id)
    }
  })
})
