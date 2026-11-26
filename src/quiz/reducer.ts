import { COUNTRIES, countriesIn, type Continent, type Country, type Scope } from '../geo/countries'

export type Mode = 'explore' | 'type' | 'click'
export type QuizMode = Exclude<Mode, 'explore'>
export interface Progress {
  found: string[]
  missed: string[]
}
export type Feedback =
  | { kind: 'correct'; id: string }
  | { kind: 'already'; id: string }
  | { kind: 'other-scope'; id: string; continent: Continent }
  | { kind: 'wrong-click'; id: string; triesLeft: number }
  | { kind: 'revealed'; id: string }
export interface QuizState {
  mode: Mode
  scope: Scope
  progress: Record<QuizMode, Progress>
  target: string | null
  wrongTries: number
  feedback: Feedback | null
}
export type QuizAction =
  | { type: 'setMode'; mode: Mode }
  | { type: 'setScope'; scope: Scope }
  | { type: 'typed'; id: string }
  | { type: 'clicked'; id: string }
  | { type: 'giveUp' }
  | { type: 'reset' }
  | { type: 'retryMissed' }

const MAX_TRIES = 3

const emptyProgress = (): Progress => ({ found: [], missed: [] })
const idsIn = (scope: Scope) => countriesIn(scope).map((c) => c.id)
const inScope = (scope: Scope, id: string) => idsIn(scope).includes(id)

export function initialState(saved?: Partial<QuizState> | null): QuizState {
  return {
    mode: saved?.mode ?? 'type',
    scope: saved?.scope ?? 'World',
    progress: { type: emptyProgress(), click: emptyProgress(), ...saved?.progress },
    target: null,
    wrongTries: 0,
    feedback: null,
  }
}

export function createQuizReducer(random: () => number): (s: QuizState, a: QuizAction) => QuizState {
  // Only click mode has a target. A new target is picked from the pending ids.
  const retarget = (s: QuizState): QuizState => {
    const pending = pendingIn(s)
    const target =
      s.mode === 'click' && pending.length > 0
        ? pending[Math.floor(random() * pending.length)]
        : null
    return { ...s, target, wrongTries: 0 }
  }

  return (s, a) => {
    switch (a.type) {
      case 'setMode':
        return retarget({ ...s, mode: a.mode, feedback: null })
      case 'setScope':
        return retarget({ ...s, scope: a.scope, feedback: null })
      case 'typed': {
        if (s.mode !== 'type') return s
        const country = COUNTRIES.find((c) => c.id === a.id)
        if (!country) return s
        if (!inScope(s.scope, a.id)) {
          return { ...s, feedback: { kind: 'other-scope', id: a.id, continent: country.continent } }
        }
        const p = s.progress.type
        if (p.found.includes(a.id) || p.missed.includes(a.id)) {
          return { ...s, feedback: { kind: 'already', id: a.id } }
        }
        return withProgress(s, 'type', { ...p, found: [...p.found, a.id] }, {
          kind: 'correct',
          id: a.id,
        })
      }
      case 'clicked': {
        if (s.mode !== 'click' || s.target === null) return s
        if (!inScope(s.scope, a.id)) return s
        const target = s.target
        const p = s.progress.click
        if (a.id === target) {
          return retarget(
            withProgress(s, 'click', { ...p, found: [...p.found, target] }, { kind: 'correct', id: target }),
          )
        }
        const wrongTries = s.wrongTries + 1
        const triesLeft = MAX_TRIES - wrongTries
        if (triesLeft > 0) {
          return { ...s, wrongTries, feedback: { kind: 'wrong-click', id: a.id, triesLeft } }
        }
        return retarget(
          withProgress(s, 'click', { ...p, missed: [...p.missed, target] }, { kind: 'revealed', id: target }),
        )
      }
      case 'giveUp': {
        if (s.mode === 'explore') return s
        const p = s.progress[s.mode]
        return retarget({
          ...s,
          progress: { ...s.progress, [s.mode]: { ...p, missed: [...p.missed, ...pendingIn(s)] } },
          feedback: null,
        })
      }
      case 'reset': {
        if (s.mode === 'explore') return s
        const p = s.progress[s.mode]
        const ids = idsIn(s.scope)
        const keep = (list: string[]) => list.filter((id) => !ids.includes(id))
        return retarget(
          withProgress(s, s.mode, { found: keep(p.found), missed: keep(p.missed) }, null),
        )
      }
      case 'retryMissed': {
        if (s.mode === 'explore') return s
        const p = s.progress[s.mode]
        const ids = idsIn(s.scope)
        return retarget(
          withProgress(s, s.mode, { ...p, missed: p.missed.filter((id) => !ids.includes(id)) }, null),
        )
      }
    }
  }
}

export type CountryStatus = 'found' | 'missed' | 'pending' | 'target' | 'out'

export function statusOf(s: QuizState, c: Country): CountryStatus {
  if (!inScope(s.scope, c.id)) return 'out'
  if (s.mode === 'explore') return 'found'
  const p = s.progress[s.mode]
  if (p.found.includes(c.id)) return 'found'
  if (p.missed.includes(c.id)) return 'missed'
  return s.target === c.id ? 'target' : 'pending'
}

export function pendingIn(s: QuizState): string[] {
  if (s.mode === 'explore') return []
  const p = s.progress[s.mode]
  return idsIn(s.scope).filter((id) => !p.found.includes(id) && !p.missed.includes(id))
}

function withProgress(
  s: QuizState,
  mode: QuizMode,
  p: Progress,
  feedback: Feedback | null,
): QuizState {
  return { ...s, progress: { ...s.progress, [mode]: p }, feedback }
}
