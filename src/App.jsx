import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import FicheWizard from './pages/FicheWizard'
import { FormProvider } from './components/FormContext' // <-- Assure-toi que cet import est là
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider> {/* AuthProvider englobe TOUTE l'application maintenant */}
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<Login />} />
        
        {/* Routes protégées */}
        {/* On va envelopper le Dashboard aussi avec FormProvider, au cas où on voudrait accéder au contexte de formulaire depuis le Dashboard plus tard, par exemple pour créer une nouvelle fiche. */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <FormProvider> {/* On englobe ici aussi */}
                <Dashboard />
              </FormProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/fiche" 
          element={
            <ProtectedRoute>
              <FormProvider>
                <FicheWizard />
              </FormProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/fiche/:id" 
          element={
            <ProtectedRoute>
              <FormProvider>
                <FicheWizard />
              </FormProvider>
            </ProtectedRoute>
          } 
        />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}