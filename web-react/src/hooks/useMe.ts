import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../lib/api'
import type { Me } from '../lib/types'

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => apiGet<Me>('/api/me') })
}

export function useSetScope() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (value: string) => apiPost('/api/set_scope', { value }),
    onSuccess: () => qc.invalidateQueries(),
  })
}
