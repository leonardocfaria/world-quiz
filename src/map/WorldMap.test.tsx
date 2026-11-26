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
  it('interactive shapes are focusable and Enter/Space click', () => {
    const onCountryClick = vi.fn()
    const { container } = render(<WorldMap {...props} interactive onCountryClick={onCountryClick} />)
    const el = container.querySelector('[data-id="BRA"]')!
    expect(el.getAttribute('role')).toBe('button')
    expect(el.getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(el, { key: 'Enter' })
    fireEvent.keyDown(el, { key: ' ' })
    expect(onCountryClick).toHaveBeenCalledTimes(2)
  })
  it('tiny-country marker has a wide hit circle that fires click', () => {
    const onCountryClick = vi.fn()
    const { container } = render(<WorldMap {...props} onCountryClick={onCountryClick} />)
    const hit = container.querySelectorAll('circle[data-id="VAT"]')
    expect(hit.length).toBe(1)
    expect(hit[0].getAttribute('stroke-width')).toBe('22')
    fireEvent.pointerDown(hit[0], { clientX: 1, clientY: 1 })
    fireEvent.pointerUp(hit[0], { clientX: 1, clientY: 1 })
    expect(onCountryClick).toHaveBeenCalledWith('VAT')
  })
  it('non-interactive shapes have no role', () => {
    const { container } = render(<WorldMap {...props} />)
    expect(container.querySelector('[data-id="BRA"]')?.getAttribute('role')).toBeNull()
  })
})
