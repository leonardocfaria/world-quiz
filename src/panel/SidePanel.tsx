import { CONTINENTS, COUNTRIES, countriesIn, type Scope } from '../geo/countries'
import { ALIASES } from '../data/aliases'
import { buildNameIndex } from '../quiz/match'
import { isQuizMode, pendingIn, sectionOf, type Mode, type QuizAction, type QuizState } from '../quiz/reducer'
import { feedbackText } from '../quiz/feedbackText'
import { Flag } from '../flags/Flag'
import { ClickPrompt } from './ClickPrompt'
import { TypeBox } from './TypeBox'

export interface SidePanelProps {
  state: QuizState
  dispatch: (a: QuizAction) => void
  onFocus: (id: string) => void
  focusId?: string | null
}

const NAME_INDEX = buildNameIndex(COUNTRIES, ALIASES)
const BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]))
const MODES: Record<'names' | 'flags', [Mode, string][]> = {
  names: [['type', 'Type'], ['click', 'Click'], ['explore', 'Explore']],
  flags: [['flagLearn', 'Learn'], ['flagType', 'Type'], ['flagMap', 'Map']],
}
const SCOPES: Scope[] = ['World', ...CONTINENTS]
const CONTINENT_VAR = (c: string) => `var(--c-${c.toLowerCase().replace(' ', '-')})`

export function SidePanel({ state, dispatch, onFocus, focusId }: SidePanelProps) {
  const { mode, scope } = state
  const quiz = isQuizMode(mode)
  const section = sectionOf(mode)
  const p = isQuizMode(mode) ? state.progress[mode] : null
  const inScope = countriesIn(scope)
  const done = (s: Scope) => (p ? countriesIn(s).filter((c) => p.found.includes(c.id)).length : 0)
  const foundHere = done(scope)
  const missedHere = p ? inScope.filter((c) => p.missed.includes(c.id)).length : 0
  const complete = quiz && pendingIn(state).length === 0
  const actions = (
    <div className="actions">
      {quiz && (
        <button
          onClick={() => {
            if (foundHere + missedHere > 0 && !window.confirm(`Reset ${scope}? Your progress here will be cleared.`)) return
            dispatch({ type: 'reset' })
          }}
        >
          Reset
        </button>
      )}
      {quiz && !complete && <button onClick={() => dispatch({ type: 'giveUp' })}>Give up</button>}
      {missedHere > 0 && <button onClick={() => dispatch({ type: 'retryMissed' })}>Retry missed</button>}
    </div>
  )
  const continents = scope === 'World' ? CONTINENTS : [scope]

  return (
    <div className="panel-body">
      <div className="sections">
        {([['names', 'Names', 'type'], ['flags', 'Flags', 'flagLearn']] as const).map(([sec, label, first]) => (
          <button
            key={sec}
            aria-pressed={section === sec}
            onClick={() => section !== sec && dispatch({ type: 'setMode', mode: first })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="modes">
        {MODES[section].map(([m, label]) => (
          <button key={m} aria-pressed={mode === m} onClick={() => dispatch({ type: 'setMode', mode: m })}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'explore' && focusId && (
        <div className="explore-focus" data-testid="explore-focus">
          {BY_ID[focusId].capitals[0] ? `${BY_ID[focusId].name} · ${BY_ID[focusId].capitals[0]}` : BY_ID[focusId].name}
        </div>
      )}
      <div className="scopes" role="tablist">
        {SCOPES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={scope === s}
            onClick={() => dispatch({ type: 'setScope', scope: s })}
          >
            {s} {quiz ? `${done(s)}/` : ''}
            {countriesIn(s).length}
          </button>
        ))}
      </div>
      {quiz && <progress value={foundHere} max={inScope.length} />}

      {section === 'names' && mode === 'type' && <TypeBox key={scope} index={NAME_INDEX} onMatch={(id) => dispatch({ type: 'typed', id })} />}
      {mode === 'click' && (
        <ClickPrompt
          targetName={state.target ? BY_ID[state.target].name : null}
          triesLeft={3 - state.wrongTries}
        />
      )}
      {section === 'names' && (
        <div className="feedback" aria-live="polite">{state.feedback && feedbackText(state.feedback, !!p?.missed.includes(state.feedback.id))}</div>
      )}

      {complete ? (
        <div className="summary">
          <div>
            {foundHere}/{inScope.length} found{missedHere > 0 ? `, ${missedHere} missed` : ''}
          </div>
          {actions}
        </div>
      ) : (
        actions
      )}

      {mode !== 'flagLearn' && <div className="list">
        {continents.map((cont) => {
          const cs = countriesIn(cont)
          const shown = quiz
            ? cs.filter((c) => p!.found.includes(c.id) || p!.missed.includes(c.id))
            : [...cs].sort((a, b) => a.name.localeCompare(b.name))
          const left = quiz ? cs.length - shown.length : 0
          return (
            <section key={cont}>
              <h3>
                {cont}
                {quiz ? ` · ${cs.filter((c) => p!.found.includes(c.id)).length}/${cs.length}` : ''}
              </h3>
              <ul>
                {shown.map((c) => (
                  <li
                    key={c.id}
                    style={quiz ? ({ '--dot': p!.found.includes(c.id) ? CONTINENT_VAR(cont) : 'var(--missed)' } as React.CSSProperties) : undefined}
                    data-missed={quiz && !p!.found.includes(c.id) ? '' : undefined}
                  >
                    {section === 'flags' && <Flag id={c.id} label="" className="mini" />}
                    {quiz ? c.name : <button onClick={() => onFocus(c.id)}>{c.name}</button>}
                  </li>
                ))}
              </ul>
              {left > 0 && <div className="left">{left} left</div>}
            </section>
          )
        })}
      </div>}
    </div>
  )
}
