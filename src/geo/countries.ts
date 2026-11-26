import data from '../data/countries.json'

export type Continent = 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania'
export const CONTINENTS: readonly Continent[] = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
]
export type Scope = Continent | 'World'

export interface Country {
  id: string
  ccn3: string | null
  name: string
  officialName: string
  altNames: string[]
  capitals: string[]
  continent: Continent
  latlng: [number, number]
}

export const COUNTRIES = data as Country[]

export function countriesIn(scope: Scope): Country[] {
  return scope === 'World' ? COUNTRIES : COUNTRIES.filter((c) => c.continent === scope)
}
