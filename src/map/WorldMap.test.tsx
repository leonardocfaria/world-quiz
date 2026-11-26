import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WORLD } from '../geo/world'
import { WorldMap } from './WorldMap'

const props = {
  world: WORLD,
  scope: 'World' as const,
  statusOf: () => 'pending' as const,
  continentOf: () => 'Africa' as const,
  focusId: null,
  onCountryClick: () => {},
  tooltip: () => null,
}

describe('WorldMap', () => {
  it('renders a hit target per country', () => {
    const { container } = render(<WorldMap {...props} />)
    expect(container.querySelectorAll('[data-id]').length).toBeGreaterThanOrEqual(190)
    expect(container.querySelector('[data-id="BRA"]')?.getAttribute('data-status')).toBe('pending')
  })
  it('click without movement fires onCountryClick', () => {
    const onCountryClick = vi.fn()
    const { container } = render(<WorldMap {...props} onCountryClick={onCountryClick} />)
    const el = container.querySelector('[data-id="BRA"]')!
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(el, { clientX: 10, clientY: 10 })
    expect(onCountryClick).toHaveBeenCalledWith('BRA')
  })
  it('a drag is not a click', () => {
    const onCountryClick = vi.fn()
    const { container } = render(<WorldMap {...props} onCountryClick={onCountryClick} />)
    const el = container.querySelector('[data-id="BRA"]')!
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(el, { clientX: 30, clientY: 10 })
    expect(onCountryClick).not.toHaveBeenCalled()
  })
})
