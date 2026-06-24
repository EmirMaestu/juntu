import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api'
import { type Evento } from '../lib/types'

export function useEventos(past = false) {
  return useQuery({
    queryKey: ['eventos', past],
    queryFn: () => apiGet<Evento[]>(`/api/eventos?past=${past}`),
  })
}

interface EventoCreate {
  title: string
  starts_at: string
  location?: string | null
  notes?: string | null
}

interface EventoUpdate {
  id: number
  title?: string
  starts_at?: string
  location?: string | null
  notes?: string | null
}

export function useEventosMutations() {
  const qc = useQueryClient()
  const inval = () => qc.invalidateQueries({ queryKey: ['eventos'] })

  return {
    create: useMutation({
      mutationFn: (b: EventoCreate) => apiPost<{ id: number; ok: boolean }>('/api/eventos', b),
      onSuccess: inval,
    }),
    update: useMutation({
      mutationFn: ({ id, ...b }: EventoUpdate) =>
        apiPatch<{ ok: boolean }>(`/api/eventos/${id}`, b),
      onSuccess: inval,
    }),
    remove: useMutation({
      mutationFn: (id: number) => apiDelete<{ ok: boolean }>(`/api/eventos/${id}`),
      onSuccess: inval,
    }),
  }
}
