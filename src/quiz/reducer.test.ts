import { describe, expect, it } from 'vitest'
import { COUNTRIES, countriesIn, type Scope } from '../geo/countries'
import {
  createQuizReducer,
  initialState,
  pendingIn,
  statusOf,
  type QuizState,
} from './reducer'

const reduce = createQuizReducer(() => 0)
const country = (id: string) => COUNTRIES.find((c) => c.id === id)!
const idsIn = (scope: Scope) => countriesIn(scope).map((c) => c.id)

function start(scope: Scope = 'World'): QuizState {
  return reduce(initialState(), { type: 'setScope', scope })
}

describe('quiz reducer no-ops', () => {
  it('setScope to the current scope and setMode to the current mode change nothing', () => {
    const s = reduce(reduce(initialState(), { type: 'setMode', mode: 'click' }), { type: 'setScope', scope: 'Europe' })
    expect(reduce(s, { type: 'setScope', scope: 'Europe' })).toBe(s)
    expect(reduce(s, { type: 'setMode', mode: 'click' })).toBe(s)
  })
})

describe('quiz reducer', () => {
  it('keeps type and click progress separate, and explore shows the whole scope as found', () => {
    let s = reduce(start(), { type: 'typed', id: 'FRA' })
    expect(s.progress.type.found).toContain('FRA')
    expect(s.progress.click.found).toEqual([])

    s = reduce(start('Europe'), { type: 'setMode', mode: 'explore' })
    for (const id of idsIn('Europe')) expect(statusOf(s, country(id))).toBe('found')
  })

  it('typed: a pending id in scope is found and gives correct', () => {
    const s = reduce(start(), { type: 'typed', id: 'FRA' })
    expect(s.progress.type.found).toEqual(['FRA'])
    expect(s.feedback).toEqual({ kind: 'correct', id: 'FRA' })
  })

  it('typed: an id already found or missed gives already', () => {
    let s = reduce(start(), { type: 'typed', id: 'FRA' })
    s = reduce(s, { type: 'typed', id: 'FRA' })
    expect(s.feedback).toEqual({ kind: 'already', id: 'FRA' })

    s = reduce(start('Europe'), { type: 'giveUp' })
    s = reduce(s, { type: 'typed', id: 'FRA' })
    expect(s.feedback).toEqual({ kind: 'already', id: 'FRA' })
    expect(s.progress.type.found).toEqual([])
  })

  it('typed: an id outside the scope gives other-scope with its continent and progress does not change', () => {
    const s0 = start('Europe')
    const s = reduce(s0, { type: 'typed', id: 'BRA' })
    expect(s.feedback).toEqual({ kind: 'other-scope', id: 'BRA', continent: 'South America' })
    expect(s.progress).toEqual(s0.progress)
  })

  it('typed: BRA found in World, then typed in Europe gives other-scope (R8)', () => {
    let s = reduce(start(), { type: 'typed', id: 'BRA' })
    s = reduce(reduce(s, { type: 'setScope', scope: 'Europe' }), { type: 'typed', id: 'BRA' })
    expect(s.feedback).toEqual({ kind: 'other-scope', id: 'BRA', continent: 'South America' })
    expect(s.progress.type.found).toEqual(['BRA'])
  })

  it('typed outside type mode returns the same state (R9)', () => {
    const s = reduce(start(), { type: 'setMode', mode: 'click' })
    expect(reduce(s, { type: 'typed', id: 'FRA' })).toBe(s)
  })

  it('clicked on the target: it is found, wrongTries resets, and a new target is picked', () => {
    let s = reduce(start('Europe'), { type: 'setMode', mode: 'click' })
    const first = s.target!
    s = reduce(s, { type: 'clicked', id: first })
    expect(s.progress.click.found).toEqual([first])
    expect(s.wrongTries).toBe(0)
    expect(s.target).not.toBeNull()
    expect(s.target).not.toBe(first)
    expect(pendingIn(s)).toContain(s.target)
  })

  it('clicked: another in-scope id raises wrongTries and gives wrong-click with triesLeft', () => {
    let s = reduce(start('Europe'), { type: 'setMode', mode: 'click' })
    const other = idsIn('Europe').find((id) => id !== s.target)!
    s = reduce(s, { type: 'clicked', id: other })
    expect(s.wrongTries).toBe(1)
    expect(s.feedback).toEqual({ kind: 'wrong-click', id: other, triesLeft: 2 })
    s = reduce(s, { type: 'clicked', id: other })
    expect(s.wrongTries).toBe(2)
    expect(s.feedback).toEqual({ kind: 'wrong-click', id: other, triesLeft: 1 })
  })

  it('clicked: the 3rd wrong click misses the target, reveals it, and picks a new target', () => {
    let s = reduce(start('Europe'), { type: 'setMode', mode: 'click' })
    const target = s.target!
    const other = idsIn('Europe').find((id) => id !== target)!
    s = reduce(s, { type: 'clicked', id: other })
    s = reduce(s, { type: 'clicked', id: other })
    s = reduce(s, { type: 'clicked', id: other })
    expect(s.progress.click.missed).toEqual([target])
    expect(s.feedback).toEqual({ kind: 'revealed', id: target })
    expect(s.wrongTries).toBe(0)
    expect(s.target).not.toBe(target)
    expect(pendingIn(s)).toContain(s.target)
  })

  it('clicked outside click mode returns the same state (R9)', () => {
    const s = reduce(start('Europe'), { type: 'setMode', mode: 'type' })
    expect(reduce(s, { type: 'clicked', id: 'FRA' })).toBe(s)
  })

  it('clicked with target null returns the same state (R9)', () => {
    const s = reduce(reduce(start('Europe'), { type: 'setMode', mode: 'click' }), { type: 'giveUp' })
    expect(s.target).toBeNull()
    expect(reduce(s, { type: 'clicked', id: 'FRA' })).toBe(s)
  })

  it('clicked: an id outside the scope is ignored', () => {
    const s = reduce(start('Europe'), { type: 'setMode', mode: 'click' })
    expect(reduce(s, { type: 'clicked', id: 'BRA' })).toBe(s)
  })

  it('the target is pending[floor(random() * pending.length)], and setScope, setMode click, reset and retryMissed choose a new target', () => {
    const high = createQuizReducer(() => 0.999)
    const s = high(start('Europe'), { type: 'setMode', mode: 'click' })
    expect(s.target).toBe(pendingIn(s).at(-1))

    const europe = reduce(start('Europe'), { type: 'setMode', mode: 'click' })
    const moved = reduce(europe, { type: 'setScope', scope: 'Asia' })
    expect(idsIn('Asia')).toContain(moved.target)
    expect(reduce(europe, { type: 'reset' }).target).not.toBeNull()
    expect(reduce(europe, { type: 'retryMissed' }).target).not.toBeNull()
  })

  it('setMode type and explore set target to null', () => {
    const s = reduce(start('Europe'), { type: 'setMode', mode: 'click' })
    expect(s.target).not.toBeNull()
    expect(reduce(s, { type: 'setMode', mode: 'type' }).target).toBeNull()
    expect(reduce(s, { type: 'setMode', mode: 'explore' }).target).toBeNull()
  })

  it('giveUp: every pending id in scope is missed and the target becomes null', () => {
    const s = reduce(start('Europe'), { type: 'setMode', mode: 'click' })
    const after = reduce(s, { type: 'giveUp' })
    expect([...after.progress.click.missed].sort()).toEqual([...idsIn('Europe')].sort())
    expect(after.target).toBeNull()
    expect(pendingIn(after)).toEqual([])
  })

  it('reset removes only the scope ids from the current mode, and keeps other scopes', () => {
    let s = reduce(start(), { type: 'typed', id: 'BRA' })
    s = reduce(s, { type: 'typed', id: 'FRA' })
    s = reduce(s, { type: 'setScope', scope: 'Europe' })
    s = reduce(s, { type: 'reset' })
    expect(s.progress.type.found).toEqual(['BRA'])
  })

  it('retryMissed removes only the scope ids from missed', () => {
    let s = reduce(start('Europe'), { type: 'typed', id: 'FRA' })
    s = reduce(s, { type: 'giveUp' })
    expect(s.progress.type.missed).not.toEqual([])
    s = reduce(s, { type: 'retryMissed' })
    expect(s.progress.type.missed).toEqual([])
    expect(s.progress.type.found).toEqual(['FRA'])
  })

  it('statusOf is out for any country outside the scope, in every mode', () => {
    const bra = country('BRA')
    for (const mode of ['explore', 'type', 'click'] as const) {
      const s = reduce(start('Europe'), { type: 'setMode', mode })
      expect(statusOf(s, bra)).toBe('out')
    }
  })

  it('does not mutate the previous state', () => {
    const s = reduce(start('Europe'), { type: 'setMode', mode: 'click' })
    const snapshot = structuredClone(s)
    reduce(s, { type: 'clicked', id: idsIn('Europe').find((id) => id !== s.target)! })
    reduce(s, { type: 'giveUp' })
    expect(s).toEqual(snapshot)
  })

  it('initialState keeps target null, even when saved state is given (R10)', () => {
    const s = initialState({ mode: 'click', scope: 'Europe' })
    expect(s.target).toBeNull()
    expect(s.mode).toBe('click')
    expect(s.scope).toBe('Europe')
  })
})
