import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import FicheWizard from './pages/FicheWizard'
import { FormProvider } from './components/FormContext'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<Login />} />
        
        {/* Routes protégées */}
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