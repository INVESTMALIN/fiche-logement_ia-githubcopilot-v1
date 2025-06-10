import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import { useForm } from '../components/FormContext'
import Button from '../components/Button'

export default function FicheForm() {
  const { 
    next, 
    back, 
    currentStep, 
    totalSteps,
    getField,
    updateField,
    handleSave,
    saveStatus
  } = useForm()

  // Handlers pour les champs
  const handleInputChange = (fieldPath, value) => {
    updateField(fieldPath, value)
  }

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
                  value={getField('section_proprietaire.prenom')}
                  onChange={(e) => handleInputChange('section_proprietaire.prenom', e.target.value)}
                />
              </div>
              <div>
                <input 
                  type="text" 
                  placeholder="Nom de famille" 
                  className="w-full p-2 border rounded"
                  value={getField('section_proprietaire.nom')}
                  onChange={(e) => handleInputChange('section_proprietaire.nom', e.target.value)}
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
              value={getField('section_proprietaire.email')}
              onChange={(e) => handleInputChange('section_proprietaire.email', e.target.value)}
            />
          </div>

          {/* Adresse */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Adresse *</label>
            <input 
              type="text" 
              placeholder="Numéro et rue" 
              className="w-full p-2 border rounded mb-2"
              value={getField('section_proprietaire.adresse.rue')}
              onChange={(e) => handleInputChange('section_proprietaire.adresse.rue', e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Complément d'adresse" 
              className="w-full p-2 border rounded mb-2"
              value={getField('section_proprietaire.adresse.complement')}
              onChange={(e) => handleInputChange('section_proprietaire.adresse.complement', e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Ville" 
              className="w-full p-2 border rounded mb-2"
              value={getField('section_proprietaire.adresse.ville')}
              onChange={(e) => handleInputChange('section_proprietaire.adresse.ville', e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Code Postal" 
              className="w-full p-2 border rounded"
              value={getField('section_proprietaire.adresse.codePostal')}
              onChange={(e) => handleInputChange('section_proprietaire.adresse.codePostal', e.target.value)}
            />
          </div>

          {/* Indicateur de sauvegarde */}
          {saveStatus.saving && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              ⏳ Sauvegarde en cours...
            </div>
          )}
          {saveStatus.saved && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✅ Sauvegardé avec succès !
            </div>
          )}
          {saveStatus.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              ❌ {saveStatus.error}
            </div>
          )}

          {/* Debug info - masqué pour l'instant */}
          {false && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>Debug:</strong> {JSON.stringify(getField('section_proprietaire'), null, 2)}
            </div>
          )}

          {/* Boutons navigation */}
          <div className="mt-6 flex justify-between">
            <Button 
              variant="ghost" 
              onClick={back} 
              disabled={currentStep === 0}
            >
              Retour
            </Button>
            <div className="flex gap-3">
              <Button 
                variant="secondary"
                onClick={handleSave}
                disabled={saveStatus.saving}
              >
                {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
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
    </div>
  )
}