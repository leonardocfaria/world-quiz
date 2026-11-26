import { geoArea } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import countries50m from 'world-atlas/countries-50m.json'
import { COUNTRIES, type Country } from './countries'

export interface MapShape {
  key: string
  countryId: string | null
  feature: Feature<Geometry>
}
export interface Marker {
  countryId: string
  lnglat: [number, number]
}
export interface WorldData {
  shapes: MapShape[]
  markers: Marker[]
}

export const TINY_AREA_SR = 2.5e-5 // ≈1,000 km²

export function buildWorld(topology: Topology, countries: Country[]): WorldData {
  const { features } = feature(topology, topology.objects.countries as GeometryCollection)
  const nameOf = (f: Feature<Geometry>) => (f.properties as { name?: string } | null)?.name
  // Several features can share a ccn3 (Ashmore and Cartier shares Australia's): prefer the name match, not feature order.
  const owner = new Map<Feature<Geometry>, string>()
  for (const c of countries) {
    const byId = features.filter((f) => c.ccn3 !== null && f.id === c.ccn3)
    const pick = byId.find((f) => nameOf(f) === c.name) ?? byId[0] ?? features.find((f) => nameOf(f) === c.name)
    if (pick && !owner.has(pick)) owner.set(pick, c.id)
  }
  const usedKeys = new Set<string>()
  const shapes: MapShape[] = features.map((f) => {
    const base = String(f.id ?? nameOf(f))
    const key = usedKeys.has(base) ? `${base}-${nameOf(f)}` : base
    usedKeys.add(key)
    return { key, countryId: owner.get(f) ?? null, feature: f }
  })
  const markers: Marker[] = []
  for (const c of countries) {
    const shape = shapes.find((s) => s.countryId === c.id)
    if (!shape || geoArea(shape.feature) < TINY_AREA_SR) {
      markers.push({ countryId: c.id, lnglat: [c.latlng[1], c.latlng[0]] })
    }
  }
  return { shapes, markers }
}

export const WORLD: WorldData = buildWorld(countries50m as unknown as Topology, COUNTRIES)
