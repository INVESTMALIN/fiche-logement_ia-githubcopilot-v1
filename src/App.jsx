import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import FicheForm from './pages/FicheForm'
import FicheLogement from './pages/FicheLogement'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import FicheClefs from './pages/FicheClefs'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/fiche/:id" element={<FicheForm />} />
      <Route path="/fiche/nouvelle" element={<FicheForm />} />
      <Route path="/fiche/logement" element={<FicheLogement />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/fiche/clefs" element={<FicheClefs />} />

    </Routes>
  )
}
