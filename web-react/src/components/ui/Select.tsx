export interface Opt { value: string; label: string }

// Select NATIVO: en móvil (iOS/Android) usa el picker del sistema — sin los problemas
// del Select de Radix dentro de un Dialog (cerraba el modal al tocar, o se reabría al
// volver a tocar el trigger). Misma API que antes, así no cambian los call-sites.
export default function Select({
  value, onValueChange, options, placeholder, ariaLabel, style,
}: {
  value?: string
  onValueChange: (v: string) => void
  options: Opt[]
  placeholder?: string
  ariaLabel?: string
  style?: React.CSSProperties
}) {
  const hasValue = value !== undefined && value !== ''
  return (
    <div style={{ position: 'relative', display: 'block', ...style }}>
      <select
        aria-label={ariaLabel}
        value={value ?? ''}
        onChange={(e) => onValueChange(e.target.value)}
        style={{
          appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
          width: '100%', boxSizing: 'border-box',
          border: '1px solid var(--color-mist)', borderRadius: 10,
          padding: '10px 34px 10px 12px', fontSize: 14,
          background: 'var(--color-linen)',
          color: hasValue ? 'var(--color-obsidian-ink)' : 'var(--color-sage)',
          cursor: 'pointer', font: 'inherit',
        }}
      >
        {placeholder && <option value="" disabled hidden>{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: 'var(--color-obsidian-ink)' }}>{o.label}</option>
        ))}
      </select>
      <i className="ti ti-chevron-down" aria-hidden
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--color-sage)', pointerEvents: 'none' }} />
    </div>
  )
}
