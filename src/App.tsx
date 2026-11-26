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
  const [focusId, setFocusId] = useState<string | null>(null)
  const [open, setOpen] = useState(true)

  // A reloaded click-mode save has no target yet; re-dispatching the mode picks one.
  useEffect(() => dispatch({ type: 'setMode', mode: state.mode }), [])
  useEffect(() => save(state), [state.progress, state.mode, state.scope])

  const status = (id: string) => statusOf(state, BY_ID[id])
  const tooltip = (id: string) => {
    const c = BY_ID[id]
    if (state.mode === 'explore') return c.capitals[0] ? `${c.name} · ${c.capitals[0]}` : c.name
    const s = status(id)
    return s === 'found' || s === 'missed' ? c.name : null
  }
  const onCountryClick = (id: string) => {
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
        focusId={focusId}
        onCountryClick={onCountryClick}
        tooltip={tooltip}
      />
      <aside className={open ? 'panel' : 'panel collapsed'}>
        <button className="collapse" onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Show'}
        </button>
        {open && <SidePanel state={state} dispatch={dispatch} onFocus={setFocusId} />}
      </aside>
    </div>
  )
}
