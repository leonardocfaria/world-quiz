import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { countriesIn } from '../geo/countries'
import { FlagGallery } from './FlagGallery'

afterEach(cleanup)
const tiles = (c: HTMLElement) => c.querySelectorAll('[data-tile]')

describe('FlagGallery', () => {
  it('grid shows every flag in scope with its name', () => {
    const { container } = render(<FlagGallery scope="Europe" />)
    expect(tiles(container).length).toBe(countriesIn('Europe').length)
    expect(screen.getByText('France')).toBeTruthy()
  })

  it('tile opens the viewer; arrows step and wrap; Escape returns with focus', async () => {
    const eu = countriesIn('Europe')
    const { container } = render(<FlagGallery scope="Europe" />)
    await userEvent.setup().click(container.querySelector('[data-tile=FRA]')!)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('France')
    expect(screen.getByText('Capital: Paris')).toBeTruthy()
    expect(screen.getByAltText('Flag of France')).toBeTruthy()
    const next = eu[eu.findIndex((c) => c.id === 'FRA') + 1]
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(next.name)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.activeElement).toBe(container.querySelector(`[data-tile=${next.id}]`))
    await userEvent.setup().click(tiles(container)[eu.length - 1])
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(eu[0].name)
  })
})
