import { geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Continent, Scope } from '../geo/countries'
import { MAP_H, MAP_W, projectionFor } from '../geo/projection'
import type { WorldData } from '../geo/world'
import type { CountryStatus } from '../quiz/reducer'

export interface WorldMapProps {
  world: WorldData
  scope: Scope
  statusOf: (id: string) => CountryStatus
  continentOf: (id: string) => Continent
  focusId: string | null
  onCountryClick: (id: string) => void
  tooltip: (id: string) => string | null
}

const CONTINENT_VAR: Record<Continent, string> = {
  Africa: '--c-africa',
  Asia: '--c-asia',
  Europe: '--c-europe',
  'North America': '--c-north-america',
  'South America': '--c-south-america',
  Oceania: '--c-oceania',
}

export function WorldMap(p: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const down = useRef<[number, number]>([0, 0])
  const [k, setK] = useState(1)
  const [transform, setTransform] = useState('')
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)

  const { paths, projection } = useMemo(() => {
    const projection = projectionFor(p.scope)
    const path = geoPath(projection)
    return { projection, paths: p.world.shapes.map((s) => path(s.feature) ?? '') }
  }, [p.world, p.scope])

  const centerOf = (id: string): [number, number] | null => {
    const i = p.world.shapes.findIndex((s) => s.countryId === id)
    if (i >= 0) return geoPath(projection).centroid(p.world.shapes[i].feature)
    const m = p.world.markers.find((m) => m.countryId === id)
    return m ? projection(m.lnglat) : null
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 30])
      .on('zoom', (e) => {
        setK(e.transform.k)
        setTransform(e.transform.toString())
      })
    zoomRef.current = z
    select(svg).call(z)
    return () => {
      select(svg).on('.zoom', null)
    }
  }, [])

  useEffect(() => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity)
  }, [p.scope])

  useEffect(() => {
    const c = p.focusId ? centerOf(p.focusId) : null
    if (!c || !svgRef.current || !zoomRef.current) return
    const t = zoomIdentity.translate(MAP_W / 2 - 4 * c[0], MAP_H / 2 - 4 * c[1]).scale(4)
    // d3-zoom loads d3-transition at runtime but no @types/d3-transition is installed, hence the cast.
    const sel = select(svgRef.current) as unknown as { transition(): { duration(ms: number): { call: (f: unknown, t: unknown) => void } } }
    sel.transition().duration(750).call(zoomRef.current.transform, t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.focusId])

  const fillOf = (id: string): string => {
    switch (p.statusOf(id)) {
      case 'found': return `var(${CONTINENT_VAR[p.continentOf(id)]})`
      case 'missed': return 'var(--missed)'
      default: return 'var(--land)'
    }
  }

  const handlers = (id: string | null) =>
    id === null
      ? {}
      : {
          'data-id': id,
          'data-status': p.statusOf(id),
          'aria-label': p.tooltip(id) ?? 'country',
          fill: fillOf(id),
          opacity: p.statusOf(id) === 'out' ? 0.35 : undefined,
          onPointerDown: (e: React.PointerEvent) => {
            down.current = [e.clientX || 0, e.clientY || 0]
          },
          onPointerUp: (e: React.PointerEvent) => {
            if (Math.hypot((e.clientX || 0) - down.current[0], (e.clientY || 0) - down.current[1]) < 4) p.onCountryClick(id)
          },
          onPointerMove: (e: React.PointerEvent) => {
            const text = p.tooltip(id)
            setTip(text ? { text, x: e.clientX + 12, y: e.clientY + 12 } : null)
          },
          onPointerLeave: () => setTip(null),
        }

  return (
    <>
      <svg ref={svgRef} viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', background: 'var(--ocean)', touchAction: 'none' }}>
        <g transform={transform}>
          {p.world.shapes.map((s, i) => (
            <path key={s.key} d={paths[i]} stroke="var(--border)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" fill="var(--land)" {...handlers(s.countryId)} />
          ))}
          {p.world.markers.map((m) => {
            const xy = projection(m.lnglat)
            return xy && <circle key={m.countryId} cx={xy[0]} cy={xy[1]} r={5 / k} stroke="var(--border)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" {...handlers(m.countryId)} />
          })}
        </g>
      </svg>
      {tip && <div style={{ position: 'fixed', left: tip.x, top: tip.y, pointerEvents: 'none', color: 'var(--ink)' }}>{tip.text}</div>}
    </>
  )
}
