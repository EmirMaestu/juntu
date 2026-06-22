import { useState } from 'react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    if (res.ok) {
      location.assign('/app/')
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.detail || 'Credenciales inválidas')
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '0 auto', padding: '64px 24px' }}>
      <div className="cap">Tu plata, sin planillas</div>
      <h1 className="num-serif" style={{ fontSize: 44, margin: '12px 0 32px' }}>Entrar</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
        <input aria-label="Usuario" placeholder="Usuario" value={username}
          onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
        <input aria-label="Contraseña" type="password" placeholder="Contraseña" value={password}
          onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        {error && <div style={{ color: '#a32d2d', fontSize: 13 }}>{error}</div>}
        <button type="submit" style={ctaStyle}>Entrar →</button>
      </form>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--color-mist)', borderRadius: 10, padding: '12px 14px',
  fontSize: 16, background: 'transparent', color: 'var(--color-obsidian-ink)',
}
const ctaStyle: React.CSSProperties = {
  background: 'var(--color-voltage)', color: 'var(--voltage-on-dark)', border: 'none',
  borderRadius: 10, padding: '14px 18px', fontSize: 14, fontWeight: 500,
  boxShadow: 'var(--shadow-cta)', cursor: 'pointer',
}
