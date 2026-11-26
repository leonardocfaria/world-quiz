import { useRef, useState } from 'react'
import { matchName, type NameIndex } from '../quiz/match'

export interface TypeBoxProps {
  index: NameIndex
  onMatch: (id: string) => void
}

export function TypeBox({ index, onMatch }: TypeBoxProps) {
  const [value, setValue] = useState('')
  const [unknown, setUnknown] = useState(false)
  const [shake, setShake] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const submit = () => {
    if (value.trim() === '') return
    const id = matchName(value, index)
    if (id) {
      onMatch(id)
      setValue('')
      setUnknown(false)
      return
    }
    setUnknown(true)
    setShake(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShake(false), 300)
  }

  return (
    <div className="typebox">
      <input
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={shake ? 'shake' : undefined}
        value={value}
        placeholder="Type a country"
        onChange={(e) => {
          setValue(e.target.value)
          setUnknown(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          else if (e.key === 'Escape') {
            setValue('')
            setUnknown(false)
          }
        }}
      />
      {unknown && <div className="not-recognised" role="alert">Not recognised</div>}
    </div>
  )
}
