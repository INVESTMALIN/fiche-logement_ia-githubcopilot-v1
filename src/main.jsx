import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
// import { FormProvider } from './components/FormContext.jsx' // <-- ON SUPPRIME CET IMPORT ICI
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* On avait FormProvider ici, mais il a besoin de AuthProvider. */}
      {/* AuthProvider est dans App.jsx, donc on doit mettre FormProvider là-bas aussi. */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
)