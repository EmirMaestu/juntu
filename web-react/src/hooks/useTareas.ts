import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api'
import { type Tarea } from '../lib/types'

export function useTareas(status: 'pendiente' | 'all' = 'all') {
  return useQuery({
    queryKey: ['tareas', status],
    queryFn: () => apiGet<Tarea[]>(`/api/tareas?status=${status}`),
  })
}

interface TareaCreate {
  text: string
  priority?: 'alta' | 'media' | 'baja'
  due_at?: string | null
}

interface TareaUpdate {
  id: number
  text?: string
  priority?: 'alta' | 'media' | 'baja'
  due_at?: string | null
}

export function useTareasMutations() {
  const qc = useQueryClient()
  const inval = () => qc.invalidateQueries({ queryKey: ['tareas'] })

  return {
    create: useMutation({
      mutationFn: (b: TareaCreate) => apiPost<{ id: number; ok: boolean }>('/api/tareas', b),
      onSuccess: inval,
    }),
    update: useMutation({
      mutationFn: ({ id, ...b }: TareaUpdate) => apiPatch<{ ok: boolean }>(`/api/tareas/${id}`, b),
      onSuccess: inval,
    }),
    done: useMutation({
      mutationFn: (id: number) => apiPost<{ ok: boolean }>(`/api/tareas/${id}/done`),
      onSuccess: inval,
    }),
    undone: useMutation({
      mutationFn: (id: number) => apiPost<{ ok: boolean }>(`/api/tareas/${id}/undone`),
      onSuccess: inval,
    }),
    remove: useMutation({
      mutationFn: (id: number) => apiDelete<{ ok: boolean }>(`/api/tareas/${id}`),
      onSuccess: inval,
    }),
  }
}
