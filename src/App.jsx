// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import FicheWizard from './pages/FicheWizard'
import AdminConsole from './pages/AdminConsole'
import { FormProvider } from './components/FormContext'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import DuplicateAlertModal from './components/DuplicateAlertModal'

export default function App() {
  return (
    <AuthProvider>
      <FormProvider>
        <Routes>
          {/* Route publique */}
          <Route path="/login" element={<Login />} />
          
          {/* Routes protégées standard */}
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
          
          {/* ✅ NOUVELLE ROUTE - Console Admin (super_admin uniquement) */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminConsole />
              </AdminRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Modal global pour détection doublons */}
        <DuplicateAlertModal />
      </FormProvider>
    </AuthProvider>
  )
}