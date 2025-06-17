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

  const handleBooleanChange = (fieldPath, value) => {
    updateField(fieldPath, value === 'true')
  }

  // Récupération des valeurs
  const boiteType = getField('section_clefs.boiteType')
  const emplacementBoite = getField('section_clefs.emplacementBoite')
  const interphone = getField('section_clefs.interphone')
  const interphoneDetails = getField('section_clefs.interphoneDetails')
  const tempoGache = getField('section_clefs.tempoGache')
  const tempoGacheDetails = getField('section_clefs.tempoGacheDetails')
  const digicode = getField('section_clefs.digicode')
  const digicodeDetails = getField('section_clefs.digicodeDetails')
  const clefsPrecision = getField('section_clefs.clefs.precision')
  const clefsPrestataire = getField('section_clefs.clefs.prestataire')
  const clefsDetails = getField('section_clefs.clefs.details')

  // Champs TTlock
  const ttlockMasterpin = getField('section_clefs.ttlock.masterpinConciergerie')
  const ttlockCodeProprio = getField('section_clefs.ttlock.codeProprietaire')
  const ttlockCodeMenage = getField('section_clefs.ttlock.codeMenage')

  // Champs Igloohome
  const igloohomeMasterpin = getField('section_clefs.igloohome.masterpinConciergerie')
  const igloohomeCodeVoyageur = getField('section_clefs.igloohome.codeVoyageur')
  const igloohomeCodeProprio = getField('section_clefs.igloohome.codeProprietaire')
  const igloohomeCodeMenage = getField('section_clefs.igloohome.codeMenage')

  // Champs Masterlock
  const masterlockCode = getField('section_clefs.masterlock.code')

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

          {/* Type de boîte à clés */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Type de boîte à clés *</label>
            <div className="flex gap-6 mt-2">
              {["TTlock", "Igloohome", "Masterlock"].map(type => (
                <label key={type} className="inline-flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="boiteType" 
                    value={type}
                    checked={boiteType === type}
                    onChange={(e) => handleInputChange('section_clefs.boiteType', e.target.value)}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* Emplacement de la boîte à clés */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Emplacement de la boîte à clés *</label>
            <textarea 
              placeholder="ex. : à côté de la porte sur votre droite."
              className="w-full p-3 border rounded"
              value={emplacementBoite}
              onChange={(e) => handleInputChange('section_clefs.emplacementBoite', e.target.value)}
            />
          </div>

          {/* Photo de l'emplacement */}
          <div>
            <label className="block font-semibold mb-1">📱 Photo de l'emplacement</label>
            <div className="border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white rounded">
              <button className="bg-gray-200 px-4 py-2 rounded mr-2">Choisir un fichier</button>
              <span>Aucun fichier choisi</span>
            </div>
          </div>

          {/* Champs conditionnels selon le type de boîte à clés */}
          {boiteType === "TTlock" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">TTlock - Code Masterpin conciergerie *</label>
                <input 
                  type="text" 
                  placeholder="Entrez le code (ex. : 2863)." 
                  className="w-full p-2 border rounded"
                  value={ttlockMasterpin}
                  onChange={(e) => handleInputChange('section_clefs.ttlock.masterpinConciergerie', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">TTlock - Code Propriétaire *</label>
                <input 
                  type="text" 
                  placeholder="Entrez le code (ex. : 2863)." 
                  className="w-full p-2 border rounded"
                  value={ttlockCodeProprio}
                  onChange={(e) => handleInputChange('section_clefs.ttlock.codeProprietaire', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">TTlock - Code Ménage *</label>
                <input 
                  type="text" 
                  placeholder="Entrez le code (ex. : 2863)." 
                  className="w-full p-2 border rounded"
                  value={ttlockCodeMenage}
                  onChange={(e) => handleInputChange('section_clefs.ttlock.codeMenage', e.target.value)}
                />
              </div>
            </div>
          )}

          {boiteType === "Igloohome" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Igloohome - Masterpin conciergerie *</label>
                <input 
                  type="text" 
                  placeholder="Entrez le code (ex. : 2863)." 
                  className="w-full p-2 border rounded"
                  value={igloohomeMasterpin}
                  onChange={(e) => handleInputChange('section_clefs.igloohome.masterpinConciergerie', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Igloohome - Code Voyageur *</label>
                <input 
                  type="text" 
                  placeholder="Entrez le code (ex. : 2863)." 
                  className="w-full p-2 border rounded"
                  value={igloohomeCodeVoyageur}
                  onChange={(e) => handleInputChange('section_clefs.igloohome.codeVoyageur', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Igloohome - Code Propriétaire *</label>
                <input 
                  type="text" 
                  placeholder="Entrez le code (ex. : 2863)." 
                  className="w-full p-2 border rounded"
                  value={igloohomeCodeProprio}
                  onChange={(e) => handleInputChange('section_clefs.igloohome.codeProprietaire', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Igloohome - Code Ménage *</label>
                <input 
                  type="text" 
                  placeholder="Entrez le code (ex. : 2863)." 
                  className="w-full p-2 border rounded"
                  value={igloohomeCodeMenage}
                  onChange={(e) => handleInputChange('section_clefs.igloohome.codeMenage', e.target.value)}
                />
              </div>
            </div>
          )}

          {boiteType === "Masterlock" && (
            <div>
              <label className="block font-semibold mb-1">MasterLock - Codes de la boîte à clés *</label>
              <input 
                type="text" 
                placeholder="Entrez le code (ex. : 2863)." 
                className="w-full p-2 border rounded"
                value={masterlockCode}
                onChange={(e) => handleInputChange('section_clefs.masterlock.code', e.target.value)}
              />
            </div>
          )}

          {/* Interphone */}
          <div>
            <label className="block font-semibold mb-1">Interphone - Logement équipé d'un interphone?*</label>
            <div className="flex gap-6 mt-2">
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="interphone" 
                  value="true"
                  checked={interphone === true}
                  onChange={(e) => handleBooleanChange('section_clefs.interphone', e.target.value)}
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="interphone" 
                  value="false"
                  checked={interphone === false}
                  onChange={(e) => handleBooleanChange('section_clefs.interphone', e.target.value)}
                />
                Non
              </label>
            </div>
          </div>

          {interphone === true && (
            <>
              <textarea 
                className="w-full p-3 border rounded"
                placeholder="S'il existe un code d'accès, notez-le ici et expliquez comment l'utiliser. S'il n'y a pas de code, précisez à quel nom il faut sonner."
                value={interphoneDetails}
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
                  name="tempoGache" 
                  value="true"
                  checked={tempoGache === true}
                  onChange={(e) => handleBooleanChange('section_clefs.tempoGache', e.target.value)}
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="tempoGache" 
                  value="false"
                  checked={tempoGache === false}
                  onChange={(e) => handleBooleanChange('section_clefs.tempoGache', e.target.value)}
                />
                Non
              </label>
            </div>
          </div>
          
          {tempoGache === true && (
            <>
              <textarea 
                className="w-full p-3 border rounded"
                placeholder="Description du tempo-gâche *"
                value={tempoGacheDetails}
                onChange={(e) => handleInputChange('section_clefs.tempoGacheDetails', e.target.value)}
              />
              <div className="border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white rounded">
                📎 Photo du tempo-gâche
              </div>
            </>
          )}

          {/* Digicode */}
          <div>
            <label className="block font-semibold mb-1">Digicode - Logement équipé d'un digicode?*</label>
            <div className="flex gap-6 mt-2">
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="digicode" 
                  value="true"
                  checked={digicode === true}
                  onChange={(e) => handleBooleanChange('section_clefs.digicode', e.target.value)}
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="digicode" 
                  value="false"
                  checked={digicode === false}
                  onChange={(e) => handleBooleanChange('section_clefs.digicode', e.target.value)}
                />
                Non
              </label>
            </div>
          </div>

          {digicode === true && (
            <>
              <textarea 
                className="w-full p-3 border rounded"
                placeholder="Instructions pour le digicode *"
                value={digicodeDetails}
                onChange={(e) => handleInputChange('section_clefs.digicodeDetails', e.target.value)}
              />
              <div className="border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 bg-white rounded">
                📎 Photo du digicode
              </div>
            </>
          )}

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
              value={clefsPrecision}
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
                    checked={clefsPrestataire === true}
                    onChange={(e) => handleBooleanChange('section_clefs.clefs.prestataire', e.target.value)}
                  />
                  Oui
                </label>
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="clefRemise" 
                    value="false"
                    checked={clefsPrestataire === false}
                    onChange={(e) => handleBooleanChange('section_clefs.clefs.prestataire', e.target.value)}
                  />
                  Non
                </label>
              </div>
            </div>

            <textarea 
              className="w-full p-3 border rounded"
              placeholder="Le prestataire a t-il reçu les clés en mains propres ? Où sont stockées les clés ? Quel type de clef ?"
              value={clefsDetails}
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