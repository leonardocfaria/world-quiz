import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { SidePanel } from './panel/SidePanel'
import { initialState } from './quiz/reducer'
import { vi } from 'vitest'
import { COUNTRIES, countriesIn } from './geo/countries'

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
    await u.click(screen.getByRole('button', { name: 'Yes, reset' }))
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

  it('feedback live region exists up front and announces', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    const live = container.querySelector('[aria-live="polite"]')!
    expect(live.textContent).toBe('')
    await u.click(tab('Europe'))
    await u.type(input(), 'brazil{Enter}')
    expect(container.querySelector('[aria-live="polite"]')).toBe(live)
    expect(live.textContent).toBe('Brazil is in South America')
  })
})

describe('App guards and fixes', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Reset asks in the page first: Cancel keeps progress, Yes clears it', async () => {
    // In-page, not window.confirm: embedded browsers can suppress native dialogs (confirm returns false at once).
    const confirm = vi.spyOn(window, 'confirm')
    const u = userEvent.setup()
    render(<App />)
    await u.type(input(), 'brazil{Enter}')
    await u.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('Reset World? Your progress here will be cleared.')).toBeTruthy()
    expect(foundCount('World')).toBe(1)
    await u.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(foundCount('World')).toBe(1)
    await u.click(screen.getByRole('button', { name: 'Reset' }))
    await u.click(screen.getByRole('button', { name: 'Yes, reset' }))
    expect(foundCount('World')).toBe(0)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('R10: a reloaded click-mode save gets a target', () => {
    localStorage.setItem(
      'world-quiz:v1',
      JSON.stringify({ mode: 'click', scope: 'World', progress: { type: { found: [], missed: [] }, click: { found: [], missed: [] } } }),
    )
    render(<App />)
    expect(screen.getByTestId('click-prompt').textContent).toBeTruthy()
  })

  it('R12: type mode hides names until found', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    const bra = () => container.querySelector('[data-id="BRA"]')!
    expect(bra().getAttribute('aria-label')).toBe('country')
    await u.type(input(), 'brazil{Enter}')
    expect(bra().getAttribute('aria-label')).toBe('Brazil')
  })

  it('explore: clicking a country shows its name and capital', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Explore' }))
    click(container, 'BRA')
    expect(screen.getByTestId('explore-focus').textContent).toBe('Brazil · Brasília')
  })

  it('explore focus does not leak into other modes', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Explore' }))
    click(container, 'BRA')
    expect(container.querySelector('[data-focused]')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Click' }))
    expect(container.querySelector('[data-focused]')).toBeNull()
    await u.click(screen.getByRole('button', { name: 'Explore' }))
    expect(screen.queryByTestId('explore-focus')?.textContent ?? '').toBe('')
  })
})

describe('SidePanel explore list', () => {
  it('items are buttons and Enter calls onFocus', async () => {
    const onFocus = vi.fn()
    render(<SidePanel state={initialState({ mode: 'explore' })} dispatch={() => {}} onFocus={onFocus} />)
    const b = screen.getByRole('button', { name: 'Brazil' })
    expect(b.tagName).toBe('BUTTON')
    b.focus()
    await userEvent.setup().keyboard('{Enter}')
    expect(onFocus).toHaveBeenCalledWith('BRA')
  })
})

describe('Flags section', () => {
  it('Flags opens Learn and Names returns to Type', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Flags' }))
    expect(container.querySelector('[data-tile]')).toBeTruthy()
    expect(container.querySelector('svg')).toBeNull()
    await u.click(screen.getByRole('button', { name: 'Names' }))
    expect(input()).toBeTruthy()
  })

  it('scope change in the viewer returns to the grid of the new scope', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Flags' }))
    await u.click(container.querySelector('[data-tile=FRA]')!)
    await u.click(tab('Oceania'))
    expect(container.querySelector('h2')).toBeNull()
    expect(container.querySelectorAll('[data-tile]').length).toBe(countriesIn('Oceania').length)
  })
})

describe('Flag viewer focus', () => {
  it('opening a tile focuses the country heading', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Flags' }))
    await u.click(container.querySelector('[data-tile=FRA]')!)
    expect(document.activeElement).toBe(container.querySelector('h2'))
  })
})

describe('Flag type', () => {
  const targetId = () =>
    (screen.getByAltText('Flag to identify') as HTMLImageElement).src.match(/([a-z]+)\.svg$/)![1].toUpperCase()
  const nameOf = (id: string) => COUNTRIES.find((c) => c.id === id)!.name
  const start = async () => {
    const u = userEvent.setup()
    const r = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Flags' }))
    await u.click(screen.getByRole('button', { name: 'Type' }))
    await u.click(tab('Europe'))
    return { u, ...r }
  }
  const feedback = (c: HTMLElement) => c.querySelector('.feedback')!.textContent!

  it('flag type: Enter on the right name counts and shows the next flag', async () => {
    const { u, container } = await start()
    const t = targetId()
    const noLeak = () => {
      const n = nameOf(targetId())
      expect(container.textContent).not.toContain(n)
      for (const el of container.querySelectorAll('[title], [aria-label]'))
        expect(`${el.getAttribute('title')} ${el.getAttribute('aria-label')}`).not.toContain(n)
      expect((screen.getByAltText('Flag to identify') as HTMLImageElement).alt).toBe('Flag to identify')
    }
    noLeak()
    await u.type(input(), `${nameOf(t)}{Enter}`)
    expect(foundCount('Europe')).toBe(1)
    expect(feedback(container)).toContain('✓')
    expect(feedback(container)).toContain(nameOf(t))
    expect(targetId()).not.toBe(t)
    noLeak()
    await u.click(screen.getByRole('button', { name: "I don't know" }))
    noLeak()
  })

  it('flag type: a wrong country costs a try, gibberish does not', async () => {
    const { u, container } = await start()
    const t = targetId()
    const other = countriesIn('Europe').find((c) => c.id !== t)!.name
    await u.type(input(), `${other}{Enter}`)
    expect(screen.getByText('2 tries left')).toBeTruthy()
    expect(feedback(container)).toContain(`Not ${other}`)
    await u.type(input(), 'xyzzy{Enter}')
    expect(screen.getByText('Not recognised')).toBeTruthy()
    expect(screen.getByText('2 tries left')).toBeTruthy()
  })

  it("flag type: I don't know reveals and marks missed", async () => {
    const { u, container } = await start()
    const t = targetId()
    await u.click(screen.getByRole('button', { name: "I don't know" }))
    expect(feedback(container)).toContain(`It was ${nameOf(t)}`)
    expect(screen.getByText(nameOf(t), { selector: 'li' }).hasAttribute('data-missed')).toBe(true)
  })

  it('flag type: done scope shows done message', async () => {
    const { u } = await start()
    await u.click(screen.getByRole('button', { name: 'Give up' }))
    expect(screen.getByText('All flags in Europe done.')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry missed' })).toBeTruthy()
  })

  it("flag type: focus returns to the textbox after I don't know", async () => {
    const { u } = await start()
    await u.click(screen.getByRole('button', { name: "I don't know" }))
    expect(document.activeElement).toBe(input())
  })

  it('flag type progress is separate from names type', async () => {
    const { u } = await start()
    await u.type(input(), `${nameOf(targetId())}{Enter}`)
    await u.click(screen.getByRole('button', { name: 'Names' }))
    expect(foundCount('Europe')).toBe(0)
  })
})

describe('Flag map', () => {
  const targetId = () =>
    (screen.getByAltText('Flag to identify') as HTMLImageElement).src.match(/([a-z]+)\.svg$/)![1].toUpperCase()
  const nameOf = (id: string) => COUNTRIES.find((c) => c.id === id)!.name
  const start = async () => {
    const u = userEvent.setup()
    const r = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Flags' }))
    await u.click(screen.getByRole('button', { name: 'Map' }))
    await u.click(tab('Europe'))
    return { u, ...r }
  }

  it("flag map: clicking the flag's country counts in Map progress only", async () => {
    const { u, container } = await start()
    click(container, targetId())
    expect(foundCount('Europe')).toBe(1)
    await u.click(screen.getByRole('button', { name: 'Names' }))
    await u.click(screen.getByRole('button', { name: 'Click' }))
    expect(foundCount('Europe')).toBe(0)
  })

  it('flag map: a wrong click costs a try and names the clicked country', async () => {
    const { container } = await start()
    const other = countriesIn('Europe').find((c) => c.id !== targetId())!
    click(container, other.id)
    expect(container.querySelector('.feedback')!.textContent).toContain(`That's ${other.name}. 2 tries left`)
  })

  it('flag map: card never names the target', async () => {
    const { container } = await start()
    const n = nameOf(targetId())
    const card = container.querySelector('.flag-card')!
    expect(card.textContent).not.toContain(n)
    expect(container.textContent).not.toContain(n)
    for (const el of container.querySelectorAll('[title], [aria-label]'))
      expect(`${el.getAttribute('title')} ${el.getAttribute('aria-label')}`).not.toContain(n)
    expect((card.querySelector('img') as HTMLImageElement).alt).toBe('Flag to identify')
  })

  it('flag map: card sits above the map in .map-area; Names click has none', async () => {
    const { u, container } = await start()
    const card = container.querySelector('.flag-card')!
    const svg = container.querySelector('.map-area > svg')!
    expect(card.parentElement).toBe(svg.parentElement)
    expect(card.parentElement!.classList.contains('map-area')).toBe(true)
    expect(card.nextElementSibling).toBe(svg)
    await u.click(screen.getByRole('button', { name: 'Names' }))
    await u.click(screen.getByRole('button', { name: 'Click' }))
    expect(container.querySelector('.map-area')).toBeNull()
  })

  it('flag map: give up shows the done message', async () => {
    const { u } = await start()
    await u.click(screen.getByRole('button', { name: 'Give up' }))
    expect(screen.getByText('All flags in Europe done.')).toBeTruthy()
    expect(screen.queryByAltText('Flag to identify')).toBeNull()
  })

  it("flag map: I don't know reveals the current target", async () => {
    const { u, container } = await start()
    const n = nameOf(targetId())
    await u.click(screen.getByRole('button', { name: "I don't know" }))
    expect(container.querySelector('.feedback')!.textContent).toContain(`It was ${n}`)
  })

  it('names click still uses the side prompt, no flag card', async () => {
    const u = userEvent.setup()
    const { container } = render(<App />)
    await u.click(screen.getByRole('button', { name: 'Click' }))
    expect(screen.getByTestId('click-prompt')).toBeTruthy()
    expect(container.querySelector('.flag-card')).toBeNull()
  })
})
