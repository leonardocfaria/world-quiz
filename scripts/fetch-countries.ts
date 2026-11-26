// source: world-countries (mledoze dataset); REST Countries v3.1 shut down, v5 needs key
import { readFileSync, writeFileSync } from 'node:fs'
import { isIncluded, toCountry, validateSnapshot } from '../src/geo/fromApi'
import type { RawCountry } from '../src/geo/fromApi'

const raws = JSON.parse(readFileSync('node_modules/world-countries/countries.json', 'utf8')) as RawCountry[]
const countries = raws.filter(isIncluded).map(toCountry).sort((a, b) => a.name.localeCompare(b.name))
const problems = validateSnapshot(countries)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
writeFileSync('src/data/countries.json', JSON.stringify(countries, null, 2) + '\n')
console.log(`wrote ${countries.length} countries`)
