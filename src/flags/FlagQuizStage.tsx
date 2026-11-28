import { NAME_INDEX } from '../quiz/match'
import { feedbackText } from '../quiz/feedbackText'
import type { QuizAction, QuizState } from '../quiz/reducer'
import { TypeBox } from '../panel/TypeBox'
import { Flag } from './Flag'

export function FlagQuizStage({ state, dispatch }: { state: QuizState; dispatch: (a: QuizAction) => void }) {
  const { target, feedback: f } = state
  if (!target) return <p className="stage-done">All flags in {state.scope} done.</p>
  const missed = !!f && state.progress.flagType.missed.includes(f.id)
  return (
    <div className="flag-stage">
      <Flag id={target} label="Flag to identify" className="big" />
      <p>Which country is this?</p>
      <TypeBox key={state.scope} index={NAME_INDEX} onMatch={(id) => dispatch({ type: 'typed', id })} />
      <div>{3 - state.wrongTries} tries left</div>
      <button onClick={() => dispatch({ type: 'reveal' })}>I don't know</button>
      <div className="feedback" aria-live="polite">
        {f && (f.kind === 'correct' || f.kind === 'revealed') && <Flag id={f.id} label="" className="mini" />}
        {f && feedbackText(f, missed)}
      </div>
    </div>
  )
}
