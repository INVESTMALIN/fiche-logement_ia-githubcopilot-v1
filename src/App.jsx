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
    <AuthProvider>
      <FormProvider> {/* 🎯 FormProvider englobe TOUTE l'app */}
        <Routes>
          {/* Route publique - maintenant avec FormContext ! */}
          <Route path="/login" element={<Login />} />
          
          {/* Routes protégées - plus besoin de FormProvider ici */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/fiche" 
            element={
              <ProtectedRoute>
                <FicheWizard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/fiche/:id" 
            element={
              <ProtectedRoute>
                <FicheWizard />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </FormProvider>
    </AuthProvider>
  )
}