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
  const claimed = new Set<string>() // Ashmore and Cartier shares Australia's id; first shape wins
  const shapes: MapShape[] = features.map((f) => {
    const name = (f.properties as { name?: string } | null)?.name
    const free = countries.filter((c) => !claimed.has(c.id))
    const match = free.find((c) => c.ccn3 !== null && c.ccn3 === f.id) ?? free.find((c) => c.name === name)
    if (match) claimed.add(match.id)
    return { key: String(f.id ?? name), countryId: match?.id ?? null, feature: f }
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
