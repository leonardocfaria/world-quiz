import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSaved, save } from './storage'
import { initialState } from './reducer'

const KEY = 'world-quiz:v1'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('saved progress', () => {
  it('save then loadSaved keeps progress', () => {
    const s = { ...initialState(), mode: 'click' as const, scope: 'Europe' as const }
    s.progress.click.found = ['FRA']
    s.progress.type.missed = ['BRA']
    save(s)
    expect(loadSaved()).toEqual({ mode: 'click', scope: 'Europe', progress: s.progress })
  })

  it('returns null for invalid JSON', () => {
    localStorage.setItem(KEY, '{bad')
    expect(loadSaved()).toBeNull()
  })

  it('returns null for wrong types', () => {
    localStorage.setItem(KEY, '{"mode":"type","scope":"World","progress":{"type":{"found":[1,2],"missed":[]},"click":{"found":[],"missed":[]}}}')
    expect(loadSaved()).toBeNull()
  })

  it('returns null and does not throw when localStorage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadSaved()).toBeNull()
    expect(() => save(initialState())).not.toThrow()
  })
})

describe('flag progress storage', () => {
  it('loads a phase 1 save and starts flag progress empty', () => {
    localStorage.setItem(KEY, '{"mode":"type","scope":"World","progress":{"type":{"found":["FRA"],"missed":[]},"click":{"found":[],"missed":["BRA"]}}}')
    expect(loadSaved()?.progress).toEqual({
      type: { found: ['FRA'], missed: [] },
      click: { found: [], missed: ['BRA'] },
      flagType: { found: [], missed: [] },
      flagMap: { found: [], missed: [] },
    })
  })

  it('save then load keeps flag mode and flag progress', () => {
    const s = { ...initialState(), mode: 'flagMap' as const }
    s.progress.flagType.found = ['JPN']
    save(s)
    expect(loadSaved()).toEqual({ mode: 'flagMap', scope: 'World', progress: s.progress })
  })

  it('invalid flag progress returns null', () => {
    localStorage.setItem(KEY, '{"mode":"type","scope":"World","progress":{"type":{"found":[],"missed":[]},"click":{"found":[],"missed":[]},"flagType":{"found":[1],"missed":[]}}}')
    expect(loadSaved()).toBeNull()
  })
})
