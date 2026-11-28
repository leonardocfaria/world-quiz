import { MAX_TRIES, type QuizAction, type QuizState } from '../quiz/reducer'
import { Flag } from './Flag'
import { triesLeft } from '../quiz/feedbackText'
import { FlagFeedback } from './FlagFeedback'

export function FlagMapCard({ state, dispatch }: { state: QuizState; dispatch: (a: QuizAction) => void }) {
  if (!state.target) return <section className="flag-card"><p className="stage-done">All flags in {state.scope} done.</p></section>
  return (
    <section className="flag-card">
      <Flag id={state.target} label="Flag to identify" />
      <p>Find this country on the map</p>
      <div>{triesLeft(MAX_TRIES - state.wrongTries)}</div>
      <button onClick={() => dispatch({ type: 'reveal' })}>I don't know</button>
      <FlagFeedback state={state} mode="flagMap" />
    </section>
  )
}
