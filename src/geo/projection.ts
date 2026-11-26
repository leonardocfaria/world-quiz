import { geoEqualEarth, type GeoProjection } from 'd3-geo'
import type { Scope } from './countries'

export const MAP_W = 1000, MAP_H = 600

// [[west, south], [east, north]]; east may exceed 180. World ignores box.
export const SCOPE_BOXES: Record<Scope, { center: number; box: [[number, number], [number, number]] }> = {
  World: { center: 10, box: [[-180, -90], [180, 90]] },
  Africa: { center: 20, box: [[-20, -36], [55, 38]] },
  Europe: { center: 15, box: [[-25, 34], [45, 72]] },
  Asia: { center: 90, box: [[25, -12], [150, 56]] },
  'North America': { center: -100, box: [[-170, 5], [-50, 75]] },
  'South America': { center: -60, box: [[-85, -57], [-33, 14]] },
  Oceania: { center: 165, box: [[110, -50], [190, 5]] },
}

export function projectionFor(scope: Scope, w = MAP_W, h = MAP_H): GeoProjection {
  const { center, box: [[x0, y0], [x1, y1]] } = SCOPE_BOXES[scope]
  const proj = geoEqualEarth().rotate([-center, 0])
  const extent: [[number, number], [number, number]] = [[20, 20], [w - 20, h - 20]]
  if (scope === 'World') return proj.fitExtent(extent, { type: 'Sphere' })
  const xm = (x0 + x1) / 2
  return proj.fitExtent(extent, {
    type: 'MultiPoint',
    coordinates: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [xm, y0], [xm, y1]],
  })
}
