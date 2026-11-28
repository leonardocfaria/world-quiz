import { CONTINENTS } from '../geo/countries'
import type { Mode, Progress, QuizMode, QuizState } from './reducer'

const KEY = 'world-quiz:v1'
const MODES: Mode[] = ['explore', 'type', 'click', 'flagLearn', 'flagType', 'flagMap']

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
    // Flag progress is optional in older saves; if present it must be valid.
    const read = (m: QuizMode): Progress | null => {
      if (p?.[m] === undefined && (m === 'flagType' || m === 'flagMap')) return { found: [], missed: [] }
      if (!isIdList(p?.[m]?.found) || !isIdList(p?.[m]?.missed)) return null
      return { found: p[m].found, missed: p[m].missed }
    }
    const type = read('type')
    const click = read('click')
    const flagType = read('flagType')
    const flagMap = read('flagMap')
    if (!type || !click || !flagType || !flagMap) return null
    return { mode: d.mode, scope: d.scope, progress: { type, click, flagType, flagMap } }
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
