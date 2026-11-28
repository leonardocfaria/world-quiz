import { CONTINENTS, COUNTRIES, countriesIn, type Continent, type Country, type Scope } from '../geo/countries'

export type Mode = 'explore' | 'type' | 'click' | 'flagLearn' | 'flagType' | 'flagMap'
export type QuizMode = 'type' | 'click' | 'flagType' | 'flagMap'
type TargetMode = 'click' | 'flagType' | 'flagMap'
export type Section = 'names' | 'flags'
export interface Progress {
  found: string[]
  missed: string[]
}
export type Feedback =
  | { kind: 'correct'; id: string }
  | { kind: 'already'; id: string }
  | { kind: 'other-scope'; id: string; continent: Continent }
  | { kind: 'wrong-click'; id: string; triesLeft: number }
  | { kind: 'wrong-name'; id: string; triesLeft: number }
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
  | { type: 'reveal' }
  | { type: 'giveUp' }
  | { type: 'reset' }
  | { type: 'retryMissed' }

export const MAX_TRIES = 3

export const isQuizMode = (m: Mode): m is QuizMode =>
  m === 'type' || m === 'click' || m === 'flagType' || m === 'flagMap'
const isTargetMode = (m: Mode): m is TargetMode =>
  m === 'click' || m === 'flagType' || m === 'flagMap'
export const sectionOf = (m: Mode): Section =>
  m === 'flagLearn' || m === 'flagType' || m === 'flagMap' ? 'flags' : 'names'

const emptyProgress = (): Progress => ({ found: [], missed: [] })
const SCOPE_LIST = new Map<Scope, string[]>(
  (['World', ...CONTINENTS] as Scope[]).map((s) => [s, countriesIn(s).map((c) => c.id)]),
)
const SCOPE_SET = new Map<Scope, Set<string>>([...SCOPE_LIST].map(([s, ids]) => [s, new Set(ids)]))
const idsIn = (scope: Scope) => SCOPE_LIST.get(scope)!
const inScope = (scope: Scope, id: string) => SCOPE_SET.get(scope)!.has(id)

export function initialState(saved?: Partial<QuizState> | null): QuizState {
  return {
    mode: saved?.mode ?? 'type',
    scope: saved?.scope ?? 'World',
    progress: {
      type: emptyProgress(),
      click: emptyProgress(),
      flagType: emptyProgress(),
      flagMap: emptyProgress(),
      ...saved?.progress,
    },
    target: null,
    wrongTries: 0,
    feedback: null,
  }
}

export function createQuizReducer(random: () => number): (s: QuizState, a: QuizAction) => QuizState {
  // Target modes pick a new target from the pending ids.
  const retarget = (s: QuizState): QuizState => {
    const pending = pendingIn(s)
    const target =
      isTargetMode(s.mode) && pending.length > 0
        ? pending[Math.floor(random() * pending.length)]
        : null
    return { ...s, target, wrongTries: 0 }
  }

  // Shared by typed (flagType) and clicked: the 3rd wrong try misses the target.
  const wrongTry = (
    s: QuizState,
    mode: QuizMode,
    target: string,
    id: string,
    kind: 'wrong-click' | 'wrong-name',
  ): QuizState => {
    const wrongTries = s.wrongTries + 1
    const triesLeft = MAX_TRIES - wrongTries
    if (triesLeft > 0) return { ...s, wrongTries, feedback: { kind, id, triesLeft } }
    const p = s.progress[mode]
    return retarget(
      withProgress(s, mode, { ...p, missed: [...p.missed, target] }, { kind: 'revealed', id: target }),
    )
  }

  return (s, a) => {
    switch (a.type) {
      case 'setMode':
        // Same mode is a no-op (no free skip), except a target mode without a target still needs one (App mount).
        if (a.mode === s.mode && !(isTargetMode(a.mode) && s.target === null)) return s
        return retarget({ ...s, mode: a.mode, feedback: null })
      case 'setScope':
        if (a.scope === s.scope) return s
        return retarget({ ...s, scope: a.scope, feedback: null })
      case 'typed': {
        if (s.mode === 'flagType') {
          const target = s.target
          if (target === null) return s
          if (a.id !== target) return wrongTry(s, 'flagType', target, a.id, 'wrong-name')
          const p = s.progress.flagType
          return retarget(
            withProgress(s, 'flagType', { ...p, found: [...p.found, target] }, { kind: 'correct', id: target }),
          )
        }
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
        if (s.mode !== 'click' && s.mode !== 'flagMap') return s
        if (s.target === null) return s
        if (!inScope(s.scope, a.id)) return s
        const mode = s.mode
        const target = s.target
        const p = s.progress[mode]
        if (a.id === target) {
          return retarget(
            withProgress(s, mode, { ...p, found: [...p.found, target] }, { kind: 'correct', id: target }),
          )
        }
        return wrongTry(s, mode, target, a.id, 'wrong-click')
      }
      case 'reveal': {
        if (!isTargetMode(s.mode) || s.target === null) return s
        const mode = s.mode
        const target = s.target
        const p = s.progress[mode]
        return retarget(
          withProgress(s, mode, { ...p, missed: [...p.missed, target] }, { kind: 'revealed', id: target }),
        )
      }
      case 'giveUp': {
        if (!isQuizMode(s.mode)) return s
        const p = s.progress[s.mode]
        return retarget({
          ...s,
          progress: { ...s.progress, [s.mode]: { ...p, missed: [...p.missed, ...pendingIn(s)] } },
          feedback: null,
        })
      }
      case 'reset': {
        if (!isQuizMode(s.mode)) return s
        const p = s.progress[s.mode]
        const keep = (list: string[]) => list.filter((id) => !inScope(s.scope, id))
        return retarget(
          withProgress(s, s.mode, { found: keep(p.found), missed: keep(p.missed) }, null),
        )
      }
      case 'retryMissed': {
        if (!isQuizMode(s.mode)) return s
        const p = s.progress[s.mode]
        return retarget(
          withProgress(s, s.mode, { ...p, missed: p.missed.filter((id) => !inScope(s.scope, id)) }, null),
        )
      }
    }
  }
}

export type CountryStatus = 'found' | 'missed' | 'pending' | 'target' | 'out'

export function statusOf(s: QuizState, c: Country): CountryStatus {
  if (!inScope(s.scope, c.id)) return 'out'
  if (!isQuizMode(s.mode)) return 'found'
  const p = s.progress[s.mode]
  if (p.found.includes(c.id)) return 'found'
  if (p.missed.includes(c.id)) return 'missed'
  return s.target === c.id ? 'target' : 'pending'
}

export function pendingIn(s: QuizState): string[] {
  if (!isQuizMode(s.mode)) return []
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
