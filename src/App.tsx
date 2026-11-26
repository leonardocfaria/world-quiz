import { useEffect, useReducer, useState } from 'react'
import { COUNTRIES } from './geo/countries'
import { WORLD } from './geo/world'
import { WorldMap } from './map/WorldMap'
import { SidePanel } from './panel/SidePanel'
import { createQuizReducer, initialState, statusOf } from './quiz/reducer'
import { loadSaved, save } from './quiz/storage'

const reducer = createQuizReducer(Math.random)
const BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]))

export default function App() {
  const [state, dispatch] = useReducer(reducer, loadSaved(), initialState)
  // The nonce makes re-selecting the same country re-focus it after a pan.
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null)
  const focusOn = (id: string) => setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }))
  const [open, setOpen] = useState(true)
  const [flashId, setFlashId] = useState<string | null>(null)

  // A reloaded click-mode save has no target yet; re-dispatching the mode picks one.
  useEffect(() => dispatch({ type: 'setMode', mode: state.mode }), [])
  useEffect(() => save(state), [state.progress, state.mode, state.scope])

  useEffect(() => {
    if (state.feedback?.kind !== 'wrong-click') return
    setFlashId(state.feedback.id)
    const t = window.setTimeout(() => setFlashId(null), 400)
    return () => window.clearTimeout(t)
  }, [state.feedback])

  const status = (id: string) => statusOf(state, BY_ID[id])
  const tooltip = (id: string) => {
    const c = BY_ID[id]
    if (state.mode === 'explore') return c.capitals[0] ? `${c.name} · ${c.capitals[0]}` : c.name
    const s = status(id)
    return s === 'found' || s === 'missed' ? c.name : null
  }
  const onCountryClick = (id: string) => {
    if (state.mode === 'explore') return focusOn(id)
    const s = status(id)
    if (s === 'pending' || s === 'target') dispatch({ type: 'clicked', id })
  }

  return (
    <div className="app">
      <WorldMap
        world={WORLD}
        scope={state.scope}
        statusOf={status}
        continentOf={(id) => BY_ID[id].continent}
        focusId={focus?.id ?? null}
        focusNonce={focus?.n}
        onCountryClick={onCountryClick}
        tooltip={tooltip}
        interactive={state.mode !== 'type'}
        flashId={flashId}
      />
      <aside className={open ? 'panel' : 'panel collapsed'}>
        <button className="collapse" onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Show'}
        </button>
        {open && <SidePanel state={state} dispatch={dispatch} onFocus={focusOn} focusId={focus?.id} />}
      </aside>
    </div>
  )
}
