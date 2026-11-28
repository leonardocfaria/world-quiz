import { COUNTRIES } from '../geo/countries'
import type { Feedback } from './reducer'

const BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]))

export const triesLeft = (n: number) => `${n} ${n === 1 ? 'try' : 'tries'} left`

export function feedbackText(f: Feedback, missed: boolean): string {
  const name = BY_ID[f.id].name
  switch (f.kind) {
    case 'correct':
      return `✓ ${name}`
    case 'already':
      return `Already ${missed ? 'missed' : 'found'}: ${name}`
    case 'other-scope':
      return `${name} is in ${f.continent}`
    case 'wrong-click':
      return `That's ${name}. ${f.triesLeft} ${f.triesLeft === 1 ? 'try' : 'tries'} left`
    case 'wrong-name':
      return `Not ${name}. ${f.triesLeft} ${f.triesLeft === 1 ? 'try' : 'tries'} left`
    case 'revealed':
      return `It was ${name}`
  }
}
