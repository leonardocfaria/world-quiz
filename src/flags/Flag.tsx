export function flagUrl(id: string): string {
  return `${import.meta.env.BASE_URL}flags/${id.toLowerCase()}.svg`
}

export function Flag({ id, label, className }: { id: string; label: string; className?: string }) {
  return (
    <img
      src={flagUrl(id)}
      alt={label}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={className}
    />
  )
}
