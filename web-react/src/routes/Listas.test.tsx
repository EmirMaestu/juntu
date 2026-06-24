import { screen } from '@testing-library/react'
import { vi, expect, test, afterEach } from 'vitest'
import { renderWithProviders } from '../test/utils'
import Listas from './Listas'

afterEach(() => vi.restoreAllMocks())

const mockListas = {
  lists: [
    {
      id: 1,
      name: 'Súper',
      icon: '🛒',
      kind: null,
      target_date: null,
      recurrence: null,
      pend: 2,
      total: 3,
      items: [
        { id: 10, text: 'Arroz', done: 0, qty: 2, unit: 'kg', category: null },
        { id: 11, text: 'Leche', done: 0, qty: null, unit: null, category: null },
        { id: 12, text: 'Pan', done: 1, qty: null, unit: null, category: null },
      ],
    },
  ],
}

function makeFetch(listasData = mockListas) {
  return vi.fn((url: string) => {
    const u = String(url)
    if (u.includes('/api/listas/templates')) {
      return Promise.resolve(new Response(JSON.stringify({ templates: [] }), { status: 200 }))
    }
    if (u.includes('/api/listas')) {
      return Promise.resolve(new Response(JSON.stringify(listasData), { status: 200 }))
    }
    return Promise.resolve(new Response('[]', { status: 200 }))
  })
}

test('muestra lista con ítems', async () => {
  vi.stubGlobal('fetch', makeFetch())

  renderWithProviders(<Listas />)

  expect(await screen.findByText('Súper')).toBeInTheDocument()
  expect(screen.getByText('Arroz')).toBeInTheDocument()
  expect(screen.getByText('Leche')).toBeInTheDocument()
  expect(screen.getByText('Pan')).toBeInTheDocument()
})

test('muestra cantidad y unidad del ítem', async () => {
  vi.stubGlobal('fetch', makeFetch())

  renderWithProviders(<Listas />)

  await screen.findByText('Súper')
  // "2 kg" should be visible alongside "Arroz"
  expect(screen.getByText(/2\s*kg/)).toBeInTheDocument()
})

test('muestra EmptyState si no hay listas', async () => {
  vi.stubGlobal('fetch', makeFetch({ lists: [] }))

  renderWithProviders(<Listas />)
  expect(await screen.findByText(/Sin listas/)).toBeInTheDocument()
})
