import { useVencimientos } from '../hooks/useVencimientos'
import { useRecurring } from '../hooks/useRecurring'
import { useAccounts } from '../hooks/useAccounts'
import { formatMoney } from '../lib/format'
import { type CicloTotal } from '../lib/types'
import Card from '../components/ui/Card'
import AlertPill from '../components/ui/AlertPill'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

function cicloTotal(arr?: CicloTotal[]): number { return (arr ?? []).reduce((s, c) => s + c.total, 0) }

export default function Tarjetas() {
  const venc = useVencimientos()
  const recurring = useRecurring()
  const accounts = useAccounts()

  const cards = accounts.data?.filter((a) => a.type === 'credito') ?? []
  const cuotasByAccount = (id: number) =>
    (recurring.data ?? []).filter((r) => r.account_id === id && r.total_installments)

  if (accounts.isLoading) return <div style={{ padding: 18 }}><Skeleton h={120} /></div>
  if (cards.length === 0) return <EmptyState>No tenés tarjetas de crédito cargadas.</EmptyState>

  return (
    <div style={{ padding: '14px 18px 24px', display: 'grid', gap: 14 }}>
      <div className="cap">Tarjetas y cuotas</div>
      {cards.map((card) => {
        const v = venc.data?.find((x) => x.account_id === card.id)
        const cuotas = cuotasByAccount(card.id)
        const comprometido = cuotas.reduce((s, r) => s + r.amount * ((r.total_installments ?? 0) - (r.installments_fired ?? 0)), 0)
        const pagarMonto = cicloTotal(v?.ciclo_cerrado)
        return (
          <Card key={card.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{card.name}</span>
              {v?.next_due && <span style={{ fontSize: 12, color: 'var(--color-sage)' }}>vence {v.next_due.slice(8, 10)}/{v.next_due.slice(5, 7)}</span>}
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="cap">Comprometido en cuotas</div>
              <div className="num-serif" style={{ fontSize: 30, marginTop: 4 }}>{formatMoney(comprometido)}</div>
            </div>
            {v && v.next_due && <div style={{ marginTop: 10 }}><AlertPill>pagar {formatMoney(pagarMonto)} el {v.next_due.slice(8, 10)}</AlertPill></div>}
            <div style={{ height: 1, background: 'var(--color-mist)', margin: '14px 0' }} />
            {cuotas.length === 0 ? <EmptyState>Sin cuotas activas.</EmptyState> : cuotas.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span>{r.description} <span style={{ color: 'var(--color-sage)' }}>({(r.installments_fired ?? 0)}/{r.total_installments})</span></span>
                <span style={{ fontWeight: 500 }}>{formatMoney(r.amount, r.currency)}</span>
              </div>
            ))}
          </Card>
        )
      })}
    </div>
  )
}
