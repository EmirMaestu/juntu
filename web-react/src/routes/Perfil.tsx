import { useMe } from '../hooks/useMe'
import Card from '../components/ui/Card'

export default function Perfil() {
  const { data: me } = useMe()
  return (
    <div style={{ padding: '14px 18px 24px', display: 'grid', gap: 12 }}>
      <div className="cap">Perfil</div>
      <Card>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{me?.name ?? '…'}</div>
        <div style={{ fontSize: 13, color: 'var(--color-sage)' }}>{me?.username}</div>
      </Card>
      <a href="/api/export.csv" style={linkStyle}><i className="ti ti-download" style={{ marginRight: 8 }} aria-hidden />Exportar CSV</a>
      <a href="/logout" style={linkStyle}><i className="ti ti-logout" style={{ marginRight: 8 }} aria-hidden />Cerrar sesión</a>
    </div>
  )
}
const linkStyle: React.CSSProperties = { color: 'var(--color-obsidian-ink)', textDecoration: 'none', fontSize: 15, padding: '8px 0' }
