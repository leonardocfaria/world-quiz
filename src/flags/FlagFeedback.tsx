import { feedbackText } from '../quiz/feedbackText'
import type { QuizState } from '../quiz/reducer'
import { Flag } from './Flag'

export function FlagFeedback({ state, mode }: { state: QuizState; mode: 'flagType' | 'flagMap' }) {
  const f = state.feedback
  const missed = !!f && state.progress[mode].missed.includes(f.id)
  return (
    <div className="feedback" aria-live="polite">
      {f && (f.kind === 'correct' || f.kind === 'revealed') && <Flag id={f.id} label="" className="mini" />}
      {f && feedbackText(f, missed)}
    </div>
  )
}
