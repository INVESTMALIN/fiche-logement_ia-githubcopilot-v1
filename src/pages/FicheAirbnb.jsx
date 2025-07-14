import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import { useForm } from '../components/FormContext'
import Button from '../components/Button'

export default function FicheAirbnb() {
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

  // Récupération des valeurs depuis FormContext
  const annonceActive = getField('section_airbnb.annonce_active')
  const urlAnnonce = getField('section_airbnb.url_annonce')
  // Fix pour les booléens : ne pas utiliser getField() qui retourne "" par défaut
  const formData = getField('section_airbnb')
  const identifiantsObtenus = formData.identifiants_obtenus
  const emailCompte = getField('section_airbnb.email_compte')
  const motPasse = getField('section_airbnb.mot_passe')
  const explicationRefus = getField('section_airbnb.explication_refus')

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Airbnb</h1>


          {/* Annonce active sur Airbnb */}
          <div className="mb-6">
            <label className="block font-semibold mb-3">
              Le propriétaire a-t-il déjà une annonce active sur Airbnb ? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="annonce_active"
                  checked={annonceActive === true}
                  onChange={() => updateField('section_airbnb.annonce_active', true)}
                  className="w-4 h-4"
                />
                <span>Oui</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="annonce_active"
                  checked={annonceActive === false}
                  onChange={() => updateField('section_airbnb.annonce_active', false)}
                  className="w-4 h-4"
                />
                <span>Non</span>
              </label>
            </div>
          </div>

          {/* URL de l'annonce Airbnb */}
          <div className="mb-6">
            <label className="block font-semibold mb-1">URL de l'annonce Airbnb</label>
            <input
              type="url"
              placeholder="https://www.airbnb.fr/rooms/11263237"
              value={urlAnnonce}
              onChange={(e) => updateField('section_airbnb.url_annonce', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Section Codes de connexion */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg mb-4">Codes de connexion au compte Airbnb du propriétaire</h3>
            
            <div className="mb-4">
              <label className="block font-semibold mb-3">
                Code Airbnb - Avez-vous obtenu les identifiants de connexion du propriétaire ?
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="identifiants_obtenus"
                    checked={identifiantsObtenus === true}
                    onChange={() => updateField('section_airbnb.identifiants_obtenus', true)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span>Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="identifiants_obtenus"
                    checked={identifiantsObtenus === false}
                    onChange={() => updateField('section_airbnb.identifiants_obtenus', false)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span>Non</span>
                </label>
              </div>
            </div>

            {/* Affichage conditionnel selon la réponse */}
            {identifiantsObtenus === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="email@exemple.com"
                    value={emailCompte}
                    onChange={(e) => updateField('section_airbnb.email_compte', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={motPasse}
                    onChange={(e) => updateField('section_airbnb.mot_passe', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            )}

            {identifiantsObtenus === false && (
              <div>
                <label className="block font-semibold mb-1">
                  Code Airbnb - Veuillez expliquez pourquoi vous n'avez pas obtenu les identifiants <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Expliquez les raisons..."
                  value={explicationRefus}
                  onChange={(e) => updateField('section_airbnb.explication_refus', e.target.value)}
                  rows={4}
                  className="w-full p-3 border rounded"
                />
              </div>
            )}
          </div>

          {/* Debug panel (masqué) */}
          {false && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>Debug:</strong> 
              <div>Section complète: {JSON.stringify(getField('section_airbnb'), null, 2)}</div>
              <div>identifiantsObtenus variable: {JSON.stringify(identifiantsObtenus)} (type: {typeof identifiantsObtenus})</div>
              <div>Test === true: {identifiantsObtenus === true ? 'OUI' : 'NON'}</div>
              <div>Test === false: {identifiantsObtenus === false ? 'OUI' : 'NON'}</div>
            </div>
          )}

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

          {/* Boutons de navigation */}
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