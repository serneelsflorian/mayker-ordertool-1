interface EmptyStateProps {
  text: string
}

export default function EmptyState({ text }: EmptyStateProps) {
  return (
    <div
      className="rounded-md border border-dashed p-6 text-center text-sm"
      style={{ color: 'var(--taupe)', borderColor: 'rgba(0,0,0,0.12)' }}
    >
      {text}
    </div>
  )
}
