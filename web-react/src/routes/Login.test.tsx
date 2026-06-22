import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, expect, test, afterEach, beforeEach } from 'vitest'
import { renderWithProviders } from '../test/utils'
import Login from './Login'

const assign = vi.fn()
beforeEach(() => { vi.stubGlobal('location', { assign, pathname: '/app/login' }) })
afterEach(() => vi.restoreAllMocks())

test('login OK redirige a /app/', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 })))
  renderWithProviders(<Login />)
  await userEvent.type(screen.getByLabelText('Usuario'), 'emir')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secret')
  await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
  expect(assign).toHaveBeenCalledWith('/app/')
})
