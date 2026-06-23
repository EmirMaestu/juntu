import { type CSSProperties } from 'react'

export default function CardActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {onEdit && (
        <button
          aria-label="Editar"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          style={btn}
        >
          <i className="ti ti-edit" aria-hidden />
        </button>
      )}
      {onDelete && (
        <button
          aria-label="Borrar"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={btn}
        >
          <i className="ti ti-trash" aria-hidden />
        </button>
      )}
    </span>
  )
}

const btn: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-sage)',
  fontSize: 16,
  padding: 2,
}
