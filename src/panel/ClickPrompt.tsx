export interface ClickPromptProps {
  targetName: string | null
  triesLeft: number
}

export function ClickPrompt({ targetName, triesLeft }: ClickPromptProps) {
  if (targetName === null) return null
  return (
    <div className="click-prompt">
      Find: <strong data-testid="click-prompt">{targetName}</strong>
      <small> ({triesLeft} {triesLeft === 1 ? 'try' : 'tries'})</small>
    </div>
  )
}
