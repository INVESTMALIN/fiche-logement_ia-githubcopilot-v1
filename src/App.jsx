import { Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <AuthProvider>
      <FormProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/confirm-signup" element={<ConfirmSignup />} />

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

          <Route path="*" element={<NotFound />} />
        </Routes>
      </FormProvider>
    </AuthProvider>
  )
}