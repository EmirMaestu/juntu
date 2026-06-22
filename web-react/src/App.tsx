import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/nav/AppLayout'
import Login from './routes/Login'
import Inicio from './routes/Inicio'
import Movimientos from './routes/Movimientos'
import Tarjetas from './routes/Tarjetas'
import Cuentas from './routes/Cuentas'
import Categorias from './routes/Categorias'
import Perfil from './routes/Perfil'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/movimientos" element={<Movimientos />} />
        <Route path="/tarjetas" element={<Tarjetas />} />
        <Route path="/cuentas" element={<Cuentas />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/perfil" element={<Perfil />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
