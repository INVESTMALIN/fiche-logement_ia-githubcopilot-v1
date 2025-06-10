import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import { useForm } from '../components/FormContext'
import Button from '../components/Button'

export default function FicheForm() {
  const { next, back, currentStep } = useForm()

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <div className="flex-1 flex flex-col">
        {/* Barre de progression en haut */}
        <ProgressBar />
        
        {/* Contenu principal */}
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Fiche propriétaire</h1>

          {/* Nom */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Nom *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input 
                  type="text" 
                  placeholder="Prénom" 
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <input 
                  type="text" 
                  placeholder="Nom de famille" 
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Email *</label>
            <input 
              type="email" 
              placeholder="exemple@exemple.com" 
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Adresse */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Adresse *</label>
            <input 
              type="text" 
              placeholder="Numéro et rue" 
              className="w-full p-2 border rounded mb-2" 
            />
            <input 
              type="text" 
              placeholder="Complément d'adresse" 
              className="w-full p-2 border rounded mb-2" 
            />
            <input 
              type="text" 
              placeholder="Ville" 
              className="w-full p-2 border rounded mb-2" 
            />
            <input 
              type="text" 
              placeholder="Code Postal" 
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Boutons navigation */}
          <div className="mt-6 flex justify-between">
            <Button 
              variant="ghost" 
              onClick={back} 
              disabled={currentStep === 0}
            >
              Retour
            </Button>
            <Button 
              variant="primary" 
              onClick={next}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}