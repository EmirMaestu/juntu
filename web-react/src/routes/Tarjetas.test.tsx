import { screen } from '@testing-library/react'
import { vi, expect, test, afterEach } from 'vitest'
import { renderWithProviders } from '../test/utils'
import Tarjetas from './Tarjetas'

afterEach(() => vi.restoreAllMocks())

test('muestra una tarjeta con comprometido en cuotas', async () => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const u = String(url)
    if (u.includes('/api/accounts')) return Promise.resolve(new Response(JSON.stringify([{ id: 1, name: 'Visa Galicia', type: 'credito', active: 1 }]), { status: 200 }))
    if (u.includes('/api/recurring')) return Promise.resolve(new Response(JSON.stringify([{ id: 9, description: 'Heladera', amount: 50000, currency: 'ARS', account_id: 1, next_occurrence: '2026-07-10', active: 1, total_installments: 12, installments_fired: 2 }]), { status: 200 }))
    return Promise.resolve(new Response('[]', { status: 200 }))
  }))
  renderWithProviders(<Tarjetas />)
  expect(await screen.findByText('Visa Galicia')).toBeInTheDocument()
  expect(screen.getByText('$500.000')).toBeInTheDocument() // 50000 * (12-2)
})
