import { useMe, useSetScope } from '../../hooks/useMe'

export default function ScopeToggle() {
  const { data: me } = useMe()
  const setScope = useSetScope()
  if (!me) return null
  const options = [
    { label: 'Mío', value: 'mine' },
    ...me.others.map((o) => ({ label: o.name, value: o.scope_value })),
    { label: 'Ambos', value: 'both' },
  ]
  return (
    <select
      aria-label="Ver datos de"
      value={me.scope}
      onChange={(e) => setScope.mutate(e.target.value)}
      style={{
        fontSize: 12, border: '1px solid var(--color-mist)', borderRadius: 9999,
        padding: '5px 11px', background: 'transparent', color: 'var(--color-obsidian-ink)',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
