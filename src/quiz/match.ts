import type { Country } from '../geo/countries'

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\bst\b/g, 'saint')
    .replace(/^the /, '')
    .replace(/[^a-z0-9]/g, '')
}

export type NameIndex = Map<string, string> // normalized key → cca3

export function buildNameIndex(cs: Country[], aliases: Record<string, string[]>): NameIndex {
  const index: NameIndex = new Map()
  const clashed = new Set<string>()
  for (const c of cs) {
    const names = [c.name, c.officialName, ...c.altNames, ...(aliases[c.id] ?? [])]
    for (const raw of names) {
      const key = normalize(raw)
      // Keys that normalize to "" (non-Latin script) would collide with each other.
      if (key === '' || clashed.has(key)) continue
      const prev = index.get(key)
      if (prev === undefined) index.set(key, c.id)
      else if (prev !== c.id) {
        index.delete(key)
        clashed.add(key)
      }
    }
  }
  return index
}

export function matchName(input: string, index: NameIndex): string | null {
  return index.get(normalize(input)) ?? null
}
