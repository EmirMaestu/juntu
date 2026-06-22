import { useCategories, useCategoryMutations } from '../hooks/useCategories'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'

export default function Categorias() {
  const { data } = useCategories()
  const { remove } = useCategoryMutations()
  return (
    <div style={{ padding: '14px 18px 24px', display: 'grid', gap: 10 }}>
      <div className="cap">Categorías</div>
      {!data || data.length === 0 ? <EmptyState>Sin categorías.</EmptyState> : (
        <Card>
          {data.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-mist)' }}>
              <span style={{ fontSize: 14 }}>{c.name}</span>
              <button aria-label={`Borrar ${c.name}`} onClick={() => remove.mutate(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-sage)' }}>
                <i className="ti ti-trash" aria-hidden />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
