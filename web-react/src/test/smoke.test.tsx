import { screen } from '@testing-library/react'
import { renderWithProviders } from './utils'

test('harness renders', () => {
  renderWithProviders(<div>hola</div>)
  expect(screen.getByText('hola')).toBeInTheDocument()
})
