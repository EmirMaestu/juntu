import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiDelete } from '../lib/api'
import { type Lista, type ListaTemplate } from '../lib/types'

export function useListas() {
  return useQuery({
    queryKey: ['listas'],
    queryFn: () => apiGet<{ lists: Lista[] }>('/api/listas').then((r) => r.lists),
  })
}

export function useListaTemplates() {
  return useQuery({
    queryKey: ['listas-templates'],
    queryFn: () => apiGet<{ templates: ListaTemplate[] }>('/api/listas/templates').then((r) => r.templates),
  })
}

export function useListasMutations() {
  const qc = useQueryClient()
  const inval = () => qc.invalidateQueries({ queryKey: ['listas'] })

  return {
    createLista: useMutation({
      mutationFn: (name: string) => apiPost<{ id: number; ok: boolean }>('/api/listas', { name }),
      onSuccess: inval,
    }),
    deleteLista: useMutation({
      mutationFn: (id: number) => apiDelete<{ ok: boolean }>(`/api/listas/${id}`),
      onSuccess: inval,
    }),
    addItem: useMutation({
      mutationFn: ({ listaId, text }: { listaId: number; text: string }) =>
        apiPost<{ id: number; ok: boolean }>(`/api/listas/${listaId}/items`, { text }),
      onSuccess: inval,
    }),
    toggleItem: useMutation({
      mutationFn: (iid: number) => apiPost<{ done: number; ok: boolean }>(`/api/listas/items/${iid}/toggle`),
      onSuccess: inval,
    }),
    deleteItem: useMutation({
      mutationFn: (iid: number) => apiDelete<{ ok: boolean }>(`/api/listas/items/${iid}`),
      onSuccess: inval,
    }),
    clearDone: useMutation({
      mutationFn: (listaId: number) => apiPost<{ removed: number; ok: boolean }>(`/api/listas/${listaId}/clear`),
      onSuccess: inval,
    }),
    buyAll: useMutation({
      mutationFn: (listaId: number) => apiPost<{ marked: number; ok: boolean }>(`/api/listas/${listaId}/buy-all`),
      onSuccess: inval,
    }),
    useTemplate: useMutation({
      mutationFn: ({ name, target_list_id }: { name: string; target_list_id?: number }) =>
        apiPost<{ target_list_id: number; count: number; ok: boolean }>('/api/listas/use-template', { name, target_list_id }),
      onSuccess: inval,
    }),
  }
}
