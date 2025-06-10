import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import { useForm } from '../components/FormContext'
import Button from '../components/Button'

export default function FicheLogement() {
  const { next, back, currentStep, totalSteps } = useForm()

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <div className="flex-1 flex flex-col">
        {/* Barre de progression en haut */}
        <ProgressBar />
        
        {/* Contenu principal */}
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Informations du logement</h1>

          {/* Type de logement */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Type de logement *</label>
            <select className="w-full p-2 border rounded">
              <option value="">Sélectionnez le type</option>
              <option value="appartement">Appartement</option>
              <option value="maison">Maison</option>
              <option value="studio">Studio</option>
              <option value="loft">Loft</option>
            </select>
          </div>

          {/* Adresse */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Adresse du logement *</label>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Code postal" 
                className="w-full p-2 border rounded"
              />
              <input 
                type="text" 
                placeholder="Ville" 
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Caractéristiques */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Caractéristiques</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nombre de pièces</label>
                <input 
                  type="number" 
                  placeholder="ex: 3" 
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nombre de chambres</label>
                <input 
                  type="number" 
                  placeholder="ex: 2" 
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Surface (m²)</label>
                <input 
                  type="number" 
                  placeholder="ex: 65" 
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Étage et accès */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Localisation dans l'immeuble</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input 
                type="text" 
                placeholder="Bâtiment (ex. : A)" 
                className="w-full p-2 border rounded"
              />
              <select className="w-full p-2 border rounded">
                <option value="">Accès à l'appartement</option>
                <option value="ascenseur">Ascenseur</option>
                <option value="escalier">Escalier</option>
              </select>
              <input 
                type="text" 
                placeholder="Étage (ex. : 3)" 
                className="w-full p-2 border rounded"
              />
              <input 
                type="text" 
                placeholder="Numéro de porte" 
                className="w-full p-2 border rounded"
              />
            </div>
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
              disabled={currentStep === totalSteps - 1}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}