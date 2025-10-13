import { Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import UpdatePassword from './pages/UpdatePassword'
import ConfirmSignup from './pages/ConfirmSignup'
import NotFound from './pages/NotFound'
import FicheWizard from './pages/FicheWizard'
import { FormProvider } from './components/FormContext'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AdminConsole from './pages/AdminConsole'
import { setAuthNavigateCallback } from './lib/supabaseClient'
import PrintPDF from './pages/PrintPDF'
import PrintPDFMenage from './pages/PrintPDFMenage'
import DuplicateAlertModal from './components/DuplicateAlertModal'
import HelpButton from './components/HelpButton'

import TestGuideAgent from './pages/TestGuideAgent'


export default function App() {
  const navigate = useNavigate()
  
  // Configurer la redirection automatique pour les erreurs 401
  useEffect(() => {
    setAuthNavigateCallback(navigate)
  }, [navigate])

  return (
    <AuthProvider>
      <FormProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/confirm-signup" element={<ConfirmSignup />} />

          <Route 
            path="/test-guide-agent" 
            element={
              <ProtectedRoute>
                <TestGuideAgent />
              </ProtectedRoute>
            } 
          />        
          
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

          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminConsole />
              </AdminRoute>
            } 
          />

          <Route path="/print-pdf" element={<PrintPDF />} />

          <Route path="/print-pdf-menage" element={<PrintPDFMenage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>

        <DuplicateAlertModal />

        <HelpButton />

      </FormProvider>
    </AuthProvider>
  )
}