import { CONTINENTS, COUNTRIES, countriesIn, type Scope } from '../geo/countries'
import { ALIASES } from '../data/aliases'
import { buildNameIndex } from '../quiz/match'
import { pendingIn, type Feedback, type Mode, type QuizAction, type QuizState } from '../quiz/reducer'
import { ClickPrompt } from './ClickPrompt'
import { TypeBox } from './TypeBox'

export interface SidePanelProps {
  state: QuizState
  dispatch: (a: QuizAction) => void
  onFocus: (id: string) => void
}

const NAME_INDEX = buildNameIndex(COUNTRIES, ALIASES)
const BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]))
const MODES: [Mode, string][] = [
  ['type', 'Type'],
  ['click', 'Click'],
  ['explore', 'Explore'],
]
const SCOPES: Scope[] = ['World', ...CONTINENTS]
const CONTINENT_VAR = (c: string) => `var(--c-${c.toLowerCase().replace(' ', '-')})`

function feedbackText(f: Feedback): string {
  const name = BY_ID[f.id].name
  switch (f.kind) {
    case 'correct':
      return `✓ ${name}`
    case 'already':
      return `Already found: ${name}`
    case 'other-scope':
      return `${name} is in ${f.continent}`
    case 'wrong-click':
      return `That's ${name}. ${f.triesLeft} ${f.triesLeft === 1 ? 'try' : 'tries'} left`
    case 'revealed':
      return `It was ${name}`
  }
}

export function SidePanel({ state, dispatch, onFocus }: SidePanelProps) {
  const { mode, scope } = state
  const quiz = mode !== 'explore'
  const p = quiz ? state.progress[mode] : null
  const inScope = countriesIn(scope)
  const done = (s: Scope) => (p ? countriesIn(s).filter((c) => p.found.includes(c.id)).length : 0)
  const foundHere = done(scope)
  const missedHere = p ? inScope.filter((c) => p.missed.includes(c.id)).length : 0
  const complete = quiz && pendingIn(state).length === 0
  const actions = (
    <div className="actions">
      {quiz && <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>}
      {quiz && !complete && <button onClick={() => dispatch({ type: 'giveUp' })}>Give up</button>}
      {missedHere > 0 && <button onClick={() => dispatch({ type: 'retryMissed' })}>Retry missed</button>}
    </div>
  )
  const continents = scope === 'World' ? CONTINENTS : [scope]

  return (
    <div className="panel-body">
      <div className="modes">
        {MODES.map(([m, label]) => (
          <button key={m} aria-pressed={mode === m} onClick={() => dispatch({ type: 'setMode', mode: m })}>
            {label}
          </button>
        ))}
      </div>
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

      {mode === 'type' && <TypeBox index={NAME_INDEX} onMatch={(id) => dispatch({ type: 'typed', id })} />}
      {mode === 'click' && (
        <ClickPrompt
          targetName={state.target ? BY_ID[state.target].name : null}
          triesLeft={3 - state.wrongTries}
        />
      )}
      {state.feedback && <div className="feedback">{feedbackText(state.feedback)}</div>}

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

      <div className="list">
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
                    {quiz ? c.name : <button onClick={() => onFocus(c.id)}>{c.name}</button>}
                  </li>
                ))}
              </ul>
              {left > 0 && <div className="left">{left} left</div>}
            </section>
          )
        })}
      </div>
    </div>
  )
}
