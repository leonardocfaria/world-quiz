import { NAME_INDEX } from '../quiz/match'
import { MAX_TRIES, type QuizAction, type QuizState } from '../quiz/reducer'
import { TypeBox } from '../panel/TypeBox'
import { Flag } from './Flag'
import { triesLeft } from '../quiz/feedbackText'
import { FlagFeedback } from './FlagFeedback'

export function FlagQuizStage({ state, dispatch }: { state: QuizState; dispatch: (a: QuizAction) => void }) {
  const { target } = state
  if (!target) return <p className="stage-done">All flags in {state.scope} done.</p>
  return (
    <div className="flag-stage">
      <Flag id={target} label="Flag to identify" className="big" />
      <p>Which country is this?</p>
      <TypeBox key={`${state.scope}:${target}`} index={NAME_INDEX} onMatch={(id) => dispatch({ type: 'typed', id })} />
      <div>{triesLeft(MAX_TRIES - state.wrongTries)}</div>
      <button onClick={() => dispatch({ type: 'reveal' })}>I don't know</button>
      <FlagFeedback state={state} mode="flagType" />
    </div>
  )
}
