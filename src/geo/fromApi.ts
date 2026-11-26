import { CONTINENTS } from './countries'
import type { Continent, Country } from './countries'

export interface RawCountry {
  name: { common: string; official: string }
  cca3: string
  ccn3?: string
  capital?: string[]
  region: string
  subregion?: string
  latlng: number[]
  unMember: boolean
  altSpellings: string[]
}

const EXTRA = ['VAT', 'PSE', 'UNK', 'TWN']

export function isIncluded(raw: RawCountry): boolean {
  return raw.unMember === true || EXTRA.includes(raw.cca3)
}

export function continentOf(region: string, subregion?: string): Continent | null {
  if (region === 'Americas') return subregion === 'South America' ? 'South America' : 'North America'
  return (CONTINENTS as readonly string[]).includes(region) ? (region as Continent) : null
}

export function toCountry(raw: RawCountry): Country {
  const continent = continentOf(raw.region, raw.subregion)
  if (!continent) throw new Error(`No continent for ${raw.cca3} (${raw.region})`)
  return {
    id: raw.cca3,
    ccn3: raw.ccn3 ?? null,
    name: raw.name.common,
    officialName: raw.name.official,
    altNames: raw.altSpellings.filter((s) => s.length >= 3),
    capitals: raw.capital ?? [],
    continent,
    latlng: [raw.latlng[0], raw.latlng[1]],
  }
}

export function validateSnapshot(cs: Country[]): string[] {
  const problems: string[] = []
  if (cs.length !== 197) problems.push(`expected 197 countries, got ${cs.length}`)
  const seen = new Set<string>()
  for (const c of cs) {
    if (seen.has(c.id)) problems.push(`duplicate id ${c.id}`)
    seen.add(c.id)
  }
  for (const k of CONTINENTS) if (!cs.some((c) => c.continent === k)) problems.push(`empty continent ${k}`)
  return problems
}
