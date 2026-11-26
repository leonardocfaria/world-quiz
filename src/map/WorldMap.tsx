import { geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { useEffect, useMemo, useRef } from 'react'
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
  interactive?: boolean
  flashId?: string | null
  focusNonce?: number
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
  const gRef = useRef<SVGGElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

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
        // Imperative on purpose: React state per zoom tick would re-render every path.
        const g = select(gRef.current)
        g.attr('transform', e.transform.toString())
        g.selectAll('circle.dot, circle.hit').attr('r', 5 / e.transform.k)
      })
    zoomRef.current = z
    select(svg).call(z).on('dblclick.zoom', null)
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
  }, [p.focusId, p.focusNonce])

  const fillOf = (id: string, st: CountryStatus): string => {
    switch (st) {
      case 'found': return `var(${CONTINENT_VAR[p.continentOf(id)]})`
      case 'missed': return 'var(--missed)'
      default: return 'var(--land)'
    }
  }

  const hideTip = () => {
    if (tipRef.current) tipRef.current.style.display = 'none'
  }

  const handlers = (id: string | null) => {
    if (id === null) return {}
    const st = p.statusOf(id)
    return {
          'data-id': id,
          'data-status': st,
          'aria-label': p.tooltip(id) ?? 'country',
          fill: fillOf(id, st),
          opacity: st === 'out' ? 0.35 : undefined,
          onPointerDown: (e: React.PointerEvent) => {
            down.current = [e.clientX || 0, e.clientY || 0]
          },
          onPointerUp: (e: React.PointerEvent) => {
            if (Math.hypot((e.clientX || 0) - down.current[0], (e.clientY || 0) - down.current[1]) < 4) p.onCountryClick(id)
          },
          ...(p.interactive && st !== 'out'
            ? {
                role: 'button',
                tabIndex: 0,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    p.onCountryClick(id)
                  }
                },
              }
            : {}),
          'data-focused': p.focusId === id ? '' : undefined,
          className: p.flashId === id ? 'flash' : undefined,
          onPointerMove: (e: React.PointerEvent) => {
            const t = tipRef.current
            const text = p.tooltip(id)
            if (!t) return
            if (!text) return hideTip()
            t.textContent = text
            t.style.left = `${e.clientX + 12}px`
            t.style.top = `${e.clientY + 12}px`
            t.style.display = 'block'
          },
          onPointerLeave: hideTip,
    }
  }

  return (
    <>
      <svg ref={svgRef} viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', background: 'var(--ocean)', touchAction: 'none' }}>
        <g ref={gRef}>
          {p.world.shapes.map((s, i) => (
            <path key={s.key} d={paths[i]} stroke="var(--border)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" fill="var(--land)" {...handlers(s.countryId)} />
          ))}
          {p.world.markers.map((m) => {
            const xy = projection(m.lnglat)
            if (!xy) return null
            // The hit circle carries data-id, data-status, role and handlers; the dot is only visual.
            const h = handlers(m.countryId) as Record<string, unknown>
            return (
              <g key={m.countryId}>
                <circle className={`dot${h.className ? " flash" : ""}`} data-focused={h['data-focused'] as string | undefined} cx={xy[0]} cy={xy[1]} r={5} stroke="var(--border)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" fill={h.fill as string} opacity={h.opacity as number | undefined} pointerEvents="none" />
                <circle {...h} className="hit" cx={xy[0]} cy={xy[1]} r={5} fill="transparent" stroke="transparent" strokeWidth={22} vectorEffect="non-scaling-stroke" opacity={undefined} />
              </g>
            )
          })}
        </g>
      </svg>
      <div ref={tipRef} className="map-tip" />
    </>
  )
}
