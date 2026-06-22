import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './routes/Login'
import Inicio from './routes/Inicio'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Inicio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
