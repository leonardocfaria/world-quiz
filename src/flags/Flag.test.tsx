/// <reference types="node" />
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { COUNTRIES } from '../geo/countries'
import { Flag } from './Flag'

afterEach(cleanup)

describe('flag files', () => {
  it('every country has a flag file', () => {
    for (const c of COUNTRIES) {
      expect(existsSync(join(process.cwd(), 'public/flags', c.id.toLowerCase() + '.svg'))).toBe(true)
    }
    expect(readdirSync('public/flags').filter((f) => f.endsWith('.svg')).length).toBe(197)
  })
})

describe('Flag', () => {
  it('renders the lowercase url and the given alt', () => {
    render(<Flag id="FRA" label="Flag to identify" />)
    const img = screen.getByRole('img', { name: 'Flag to identify' })
    expect(img.getAttribute('src')).toMatch(/\/flags\/fra\.svg$/)
    expect(img.hasAttribute('title')).toBe(false)
  })
})
