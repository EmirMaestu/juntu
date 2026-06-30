// Encabezado consistente para las cards de ajustes (icono Tabler + título).
export default function SettingHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 18, color: 'var(--color-sage)' }} aria-hidden />
      <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
    </div>
  )
}
