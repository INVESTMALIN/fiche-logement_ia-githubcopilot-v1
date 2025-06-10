import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import FicheWizard from './pages/FicheWizard'
import { FormProvider } from './components/FormContext'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      
      <Route 
        path="/fiche" 
        element={
          <FormProvider>
            <FicheWizard />
          </FormProvider>
        } 
      />
      
      <Route 
        path="/fiche/:id" 
        element={
          <FormProvider>
            <FicheWizard />
          </FormProvider>
        } 
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}