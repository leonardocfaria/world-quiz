import { useEffect, useRef, useState } from 'react'
import { CONTINENTS, countriesIn, type Scope } from '../geo/countries'
import { Flag } from './Flag'

export function FlagGallery({ scope }: { scope: Scope }) {
  const groups = (scope === 'World' ? CONTINENTS : [scope]).map((cont) => countriesIn(cont))
  const list = groups.flat()
  const n = list.length
  const [open, setOpen] = useState<number | null>(null)
  const last = useRef<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const isOpen = open !== null

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i + n - 1) % n))
      else if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % n))
      else if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, n])

  useEffect(() => {
    if (open !== null) last.current = list[open].id
    else if (last.current) root.current?.querySelector<HTMLElement>(`[data-tile=${last.current}]`)?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list only changes with scope, which remounts
  }, [open])

  if (open !== null) {
    const c = list[open]
    return (
      <div className="viewer" ref={root}>
        <Flag id={c.id} label={`Flag of ${c.name}`} className="big" />
        <h2>{c.name}</h2>
        {c.officialName !== c.name && <div>{c.officialName}</div>}
        <div>Capital: {c.capitals.join(', ')}</div>
        <div>{c.continent}</div>
        <div>{`${open + 1} / ${n}`}</div>
        <div className="actions">
          <button onClick={() => setOpen((open + n - 1) % n)}>← Previous</button>
          <button onClick={() => setOpen((open + 1) % n)}>Next →</button>
          <button onClick={() => setOpen(null)}>All flags</button>
        </div>
      </div>
    )
  }
  return (
    <div ref={root}>
      {groups.map((cs) => (
        <section key={cs[0].continent}>
          <h3>{cs[0].continent}</h3>
          <div className="gallery">
            {cs.map((c) => (
              <button key={c.id} data-tile={c.id} onClick={() => setOpen(list.indexOf(c))}>
                <Flag id={c.id} label="" />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
