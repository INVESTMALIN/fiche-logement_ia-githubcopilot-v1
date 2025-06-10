import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import { useForm } from '../components/FormContext'
import Button from '../components/Button'

export default function FicheClefs() {
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

  const handleRadioChange = (fieldPath, value) => {
    updateField(fieldPath, value === 'true')
  }

  // Récupération des valeurs pour l'affichage conditionnel
  const hasInterphone = getField('section_clefs.interphone')
  const hasTempoGache = getField('section_clefs.tempoGache')
  const hasDigicode = getField('section_clefs.digicode')

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <div className="flex-1 flex flex-col">
        {/* Barre de progression en haut */}
        <ProgressBar />
        
        {/* Contenu principal */}
        <div className="flex-1 p-6 bg-gray-100 space-y-6">
          <h1 className="text-2xl font-bold">Gestion des clés et accès</h1>

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

          {/* Photo de l'emplacement */}
          <div>
            <label className="block font-semibold mb-1">📱 Photo de l'emplacement</label>
            <div className="border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white rounded">
              <button className="bg-gray-200 px-4 py-2 rounded mr-2">Choisir un fichier</button>
              <span>Aucun fichier choisi</span>
            </div>
          </div>

          {/* Interphone */}
          <div>
            <label className="block font-semibold mb-1">Interphone - Logement équipé d'un interphone?*</label>
            <div className="flex gap-6 mt-2">
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="interphone" 
                  value="true"
                  checked={hasInterphone === true}
                  onChange={(e) => handleRadioChange('section_clefs.interphone', e.target.value)}
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="interphone" 
                  value="false"
                  checked={hasInterphone === false}
                  onChange={(e) => handleRadioChange('section_clefs.interphone', e.target.value)}
                />
                Non
              </label>
            </div>
          </div>

          {hasInterphone && (
            <>
              <textarea 
                className="w-full p-3 border rounded"
                placeholder="S'il existe un code d'accès, notez-le ici et expliquez comment l'utiliser. S'il n'y a pas de code, précisez à quel nom il faut sonner."
                value={getField('section_clefs.interphoneDetails')}
                onChange={(e) => handleInputChange('section_clefs.interphoneDetails', e.target.value)}
              />
              <div className="border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white rounded">
                📎 Photo de l'interphone
              </div>
            </>
          )}

          {/* Tempo-gâche */}
          <div>
            <label className="block font-semibold mb-1">Tempo-gâche - Logement équipé d'un tempo-gâche?*</label>
            <div className="flex gap-6 mt-2">
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="tempo" 
                  value="true"
                  checked={hasTempoGache === true}
                  onChange={(e) => handleRadioChange('section_clefs.tempoGache', e.target.value)}
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="tempo" 
                  value="false"
                  checked={hasTempoGache === false}
                  onChange={(e) => handleRadioChange('section_clefs.tempoGache', e.target.value)}
                />
                Non
              </label>
            </div>
          </div>

          {/* Digicode */}
          <div>
            <label className="block font-semibold mb-1">Digicode - Logement équipé d'un digicode?*</label>
            <div className="flex gap-6 mt-2">
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="digicode" 
                  value="true"
                  checked={hasDigicode === true}
                  onChange={(e) => handleRadioChange('section_clefs.digicode', e.target.value)}
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="digicode" 
                  value="false"
                  checked={hasDigicode === false}
                  onChange={(e) => handleRadioChange('section_clefs.digicode', e.target.value)}
                />
                Non
              </label>
            </div>
          </div>

          {/* Section Clefs */}
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold mb-3">📱 Clefs – 3 JEUX DE CLEFS OBLIGATOIRE</h3>
            
            <div className="mb-4">
              <button className="bg-gray-200 px-4 py-2 rounded mr-2">Sélect. fichiers</button>
              <span className="text-sm text-gray-500">Aucun fichier choisi</span>
            </div>

            <textarea 
              className="w-full p-3 border rounded mb-4"
              placeholder="Précision sur chaque clef, son utilisation et s'il en manque *"
              value={getField('section_clefs.clefs.precision')}
              onChange={(e) => handleInputChange('section_clefs.clefs.precision', e.target.value)}
            />

            <div className="mb-4">
              <label className="block font-semibold mb-1">Le prestataire a-t-il reçu des clefs ?</label>
              <div className="flex gap-6 mt-2">
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="clefRemise" 
                    value="true"
                    checked={getField('section_clefs.clefs.prestataire') === true}
                    onChange={(e) => handleRadioChange('section_clefs.clefs.prestataire', e.target.value)}
                  />
                  Oui
                </label>
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="clefRemise" 
                    value="false"
                    checked={getField('section_clefs.clefs.prestataire') === false}
                    onChange={(e) => handleRadioChange('section_clefs.clefs.prestataire', e.target.value)}
                  />
                  Non
                </label>
              </div>
            </div>

            <textarea 
              className="w-full p-3 border rounded"
              placeholder="Le prestataire a t-il reçu les clés en mains propres ? Où sont stockées les clés ? Quel type de clef ?"
              value={getField('section_clefs.clefs.details')}
              onChange={(e) => handleInputChange('section_clefs.clefs.details', e.target.value)}
            />
          </div>

          {/* Boutons navigation */}
          <div className="flex justify-between">
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