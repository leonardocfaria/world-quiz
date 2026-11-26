import { CONTINENTS } from '../geo/countries'
import type { Mode, QuizMode, QuizState } from './reducer'

const KEY = 'world-quiz:v1'
const MODES: Mode[] = ['explore', 'type', 'click']

type Saved = Pick<QuizState, 'mode' | 'scope' | 'progress'>

const isIdList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

export function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return null
    const d = JSON.parse(raw)
    if (typeof d !== 'object' || d === null) return null
    if (!MODES.includes(d.mode)) return null
    if (d.scope !== 'World' && !CONTINENTS.includes(d.scope)) return null
    const p = d.progress
    const valid = (m: QuizMode) =>
      isIdList(p?.[m]?.found) && isIdList(p?.[m]?.missed)
    if (!valid('type') || !valid('click')) return null
    return {
      mode: d.mode,
      scope: d.scope,
      progress: {
        type: { found: p.type.found, missed: p.type.missed },
        click: { found: p.click.found, missed: p.click.missed },
      },
    }
  } catch {
    return null
  }
}

export function save(s: QuizState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ mode: s.mode, scope: s.scope, progress: s.progress }))
  } catch {
    // Storage unavailable: progress is kept in memory only.
  }
}
