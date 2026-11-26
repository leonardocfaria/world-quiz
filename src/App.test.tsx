import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { COUNTRIES } from './geo/countries'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const status = (c: HTMLElement, id: string) =>
  c.querySelector(`[data-id="${id}"]`)!.getAttribute('data-status')
const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) })
const foundCount = (name: string) => Number(tab(name).textContent!.match(/(\d+)\/\d+/)![1])
const click = (c: HTMLElement, id: string) => {
  const el = c.querySelector(`[data-id="${id}"]`)!
  fireEvent.pointerDown(el, { clientX: 5, clientY: 5 })
  fireEvent.pointerUp(el, { clientX: 5, clientY: 5 })
}
const input = () => screen.getByRole('textbox') as HTMLInputElement

describe('App', () => {
  it('counts only on Enter, then lists, marks and clears', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.type(input(), 'brazil')
    expect(foundCount('World')).toBe(0)
    await u.type(input(), '{Enter}')
    expect(foundCount('World')).toBe(1)
    expect(screen.getByText('Brazil', { selector: 'li' })).toBeTruthy()
    expect(status(container, 'BRA')).toBe('found')
    expect(input().value).toBe('')
  })

  it('other scope gives hint and no find', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(tab('Europe'))
    await u.type(input(), 'brazil{Enter}')
    expect(screen.getByText('Brazil is in South America')).toBeTruthy()
    expect(status(container, 'BRA')).toBe('out')
    expect(foundCount('Europe')).toBe(0)
  })

  it('niger and nigeria are separate', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.type(input(), 'niger{Enter}')
    expect(status(container, 'NER')).toBe('found')
    expect(status(container, 'NGA')).toBe('pending')
    await u.type(input(), 'nigeria{Enter}')
    expect(status(container, 'NGA')).toBe('found')
  })

  it('unknown text stays and says Not recognised', async () => {
    const u = userEvent.setup()
    render(<App />)
    await u.type(input(), 'nigerr{Enter}')
    expect(screen.getByText('Not recognised')).toBeTruthy()
    expect(input().value).toBe('nigerr')
    expect(foundCount('World')).toBe(0)
  })

  it('Reset clears the scope', async () => {
    const u = userEvent.setup()
    render(<App />)
    await u.type(input(), 'brazil{Enter}')
    await u.click(screen.getByRole('button', { name: 'Reset' }))
    expect(foundCount('World')).toBe(0)
  })

  it('Give up marks the rest missed and offers Retry missed', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(tab('Oceania'))
    await u.click(screen.getByRole('button', { name: 'Give up' }))
    expect(status(container, 'AUS')).toBe('missed')
    expect(screen.getByRole('button', { name: 'Retry missed' })).toBeTruthy()
  })

  it('click mode: clicking the target finds it', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Click' }))
    const name = screen.getByTestId('click-prompt').textContent!
    const best = COUNTRIES.filter((c) => name.endsWith(c.name)).sort((a, b) => b.name.length - a.name.length)[0]
    click(container, best.id)
    expect(foundCount('World')).toBe(1)
  })

  it('click mode: clicking a found country is ignored, not wrong', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Click' }))
    const name = screen.getByTestId('click-prompt').textContent!
    const best = COUNTRIES.filter((c) => name.endsWith(c.name)).sort((a, b) => b.name.length - a.name.length)[0]
    click(container, best.id)
    click(container, best.id)
    expect(screen.queryByText(/tries left/)).toBeNull()
    expect(foundCount('World')).toBe(1)
  })

  it('explore mode: list items are buttons', async () => {
    const u = userEvent.setup()
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Explore' }))
    const b = screen.getByRole('button', { name: 'Brazil' })
    b.focus()
    await u.keyboard('{Enter}')
    expect(b.closest('li')).toBeTruthy()
  })
})
