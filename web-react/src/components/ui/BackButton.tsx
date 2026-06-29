import { useNavigate } from 'react-router-dom'

// Botón "volver atrás" para las pantallas a las que se entra desde Inicio
// (Hábitos, Listas, Notas, etc.). Vuelve a la pantalla anterior.
export default function BackButton({ fallback = '/' }: { fallback?: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => { if (window.history.length > 1) navigate(-1); else navigate(fallback) }}
      aria-label="Volver"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px 2px 0',
        display: 'inline-flex', alignItems: 'center', color: 'var(--color-obsidian-ink)', flexShrink: 0,
      }}
    >
      <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden />
    </button>
  )
}
