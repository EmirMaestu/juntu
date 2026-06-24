import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api'
import { type Nota } from '../lib/types'

export function useNotas(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : ''
  return useQuery({
    queryKey: ['notas', q ?? ''],
    queryFn: () => apiGet<Nota[]>(`/api/notas${qs}`),
  })
}

interface NotaCreate {
  text: string
  tags?: string[]
}

interface NotaUpdate {
  id: number
  text?: string
  tags?: string[]
}

export function useNotasMutations() {
  const qc = useQueryClient()
  const inval = () => qc.invalidateQueries({ queryKey: ['notas'] })

  return {
    create: useMutation({
      mutationFn: (b: NotaCreate) => apiPost<{ id: number; ok: boolean }>('/api/notas', b),
      onSuccess: inval,
    }),
    update: useMutation({
      mutationFn: ({ id, ...b }: NotaUpdate) => apiPatch<{ ok: boolean }>(`/api/notas/${id}`, b),
      onSuccess: inval,
    }),
    remove: useMutation({
      mutationFn: (id: number) => apiDelete<{ ok: boolean }>(`/api/notas/${id}`),
      onSuccess: inval,
    }),
  }
}
