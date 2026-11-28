// source: world-countries (mledoze dataset); REST Countries v3.1 shut down, v5 needs key
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

const flag = (id: string) => id.toLowerCase() + '.svg'
const missing = countries.map((c) => c.id).filter((id) => !existsSync(`node_modules/world-countries/data/${flag(id)}`))
if (missing.length) {
  console.error(`missing flags: ${missing.join(', ')}`)
  process.exit(1)
}
mkdirSync('public/flags', { recursive: true })
for (const c of countries) copyFileSync(`node_modules/world-countries/data/${flag(c.id)}`, `public/flags/${flag(c.id)}`)
console.log(`wrote ${countries.length} countries, ${countries.length} flags`)
