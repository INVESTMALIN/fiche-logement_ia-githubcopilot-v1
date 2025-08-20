import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import { useForm } from '../components/FormContext'
import Button from '../components/Button'

export default function FicheLogement() {
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

  // Options pour le dropdown "Autre"
  const autresTypes = [
    "Chambres d'hôtes",
    "Auberges de jeunesse", 
    "Lofts",
    "Studios",
    "Bungalows",
    "Chalets",
    "Cabanes",
    "Cabanes perchées",
    "Tiny houses",
    "Yourtes",
    "Dômes",
    "Tipis",
    "Tentes",
    "Camping-cars",
    "Bateaux",
    "Péniches",
    "Îles privées",
    "Châteaux",
    "Moulins",
    "Phares",
    "Granges rénovées",
    "Conteneurs aménagés",
    "Grottes",
    "Igloos",
    "Roulottes",
    "Treehouses (cabanes dans les arbres)",
    "Fermes",
    "Ranchs",
    "Cottages",
    "Maisons troglodytes",
    "Huttes",
    "Caravanes",
    "Bulles transparentes",
    "Maisons flottantes",
    "Wagons de train aménagés",
    "Avions reconvertis",
    "Capsules",
    "Maisons souterraines",
    "Maisons sur pilotis"
  ]

  // Handlers pour les champs
  const handleInputChange = (fieldPath, value) => {
    updateField(fieldPath, value)
  }

  // Récupération des valeurs pour affichage conditionnel
  const formData = getField('section_logement')
  const typePropriete = formData.type_propriete
  const isAutre = typePropriete === 'Autre'
  const isAppartement = typePropriete === 'Appartement'

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <div className="flex-1 flex flex-col">
        {/* Barre de progression en haut */}
        <ProgressBar />
        
        {/* Contenu principal */}
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-xl font-bold mb-6">Informations sur le logement</h1>

          {/* Section principale en grille 2x3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            
            {/* Type de propriété */}
            <div>
              <label className="block mb-1 font-semibold">Type de propriété *</label>
              <select 
                className="w-full p-2 border rounded"
                value={getField('section_logement.type_propriete')}
                onChange={(e) => handleInputChange('section_logement.type_propriete', e.target.value)}
              >
                <option value="">Veuillez sélectionner</option>
                <option value="Appartement">Appartement</option>
                <option value="Maison">Maison</option>
                <option value="Villa">Villa</option>
                <option value="Studio">Studio</option>
                <option value="Loft">Loft</option>
                <option value="Autre">Autre</option>
              </select>
              
              {/* Affichage conditionnel si "Autre" */}
              {isAutre && (
                <div className="mt-3">
                  <label className="block mb-1 font-semibold">Type - Autres (Veuillez préciser) *</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={getField('section_logement.type_autre_precision')}
                    onChange={(e) => handleInputChange('section_logement.type_autre_precision', e.target.value)}
                  >
                    <option value="">Veuillez sélectionner</option>
                    {autresTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Surface en m² */}
            <div>
              <label className="block mb-1 font-semibold">Surface en m² *</label>
              <input 
                type="number" 
                placeholder="par ex. 23"
                className="w-full p-2 border rounded"
                value={getField('section_logement.surface')}
                onChange={(e) => handleInputChange('section_logement.surface', e.target.value)}
              />
            </div>

            {/* Numéro du bien */}
            <div>
              <label className="block mb-1 font-semibold">Numéro du bien *</label>
              <input 
                type="text" 
                placeholder="par ex. 1234"
                className={`w-full p-2 border rounded ${
                  !getField('section_logement.numero_bien') || getField('section_logement.numero_bien').trim() === '' 
                    ? 'border-red-500' 
                    : ''
                }`}
                value={getField('section_logement.numero_bien') || ''}
                onChange={(e) => handleInputChange('section_logement.numero_bien', e.target.value)}
              />
              {(!getField('section_logement.numero_bien') || getField('section_logement.numero_bien').trim() === '') && (
                <p className="text-red-600 text-sm mt-1">
                  ⚠️ Le numéro de bien est obligatoire
                </p>
              )}
            </div>

            {/* Typologie */}
            <div>
              <label className="block mb-1 font-semibold">Typologie *</label>
              <select 
                className="w-full p-2 border rounded"
                value={getField('section_logement.typologie')}
                onChange={(e) => handleInputChange('section_logement.typologie', e.target.value)}
              >
                <option value="">Veuillez sélectionner</option>
                <option value="Studio">Studio</option>
                <option value="T2">T2</option>
                <option value="T3">T3</option>
                <option value="T4">T4</option>
                <option value="T5">T5</option>
                <option value="T6+">T6+</option>
              </select>
            </div>

            {/* Nombre de personnes max */}
            <div>
              <label className="block mb-1 font-semibold">Nombre de personnes max *</label>
              <input 
                type="number" 
                placeholder="par ex. 4"
                className="w-full p-2 border rounded"
                value={getField('section_logement.nombre_personnes_max')}
                onChange={(e) => handleInputChange('section_logement.nombre_personnes_max', e.target.value)}
              />
            </div>

            {/* Nombre de lits */}
            <div>
              <label className="block mb-1 font-semibold">Nombre de lits *</label>
              <input 
                type="number" 
                placeholder="par ex. 3"
                className="w-full p-2 border rounded"
                value={getField('section_logement.nombre_lits')}
                onChange={(e) => handleInputChange('section_logement.nombre_lits', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Indiquez également les canapés lits / Comptabilisez 2 lits pour lits superposés ou lits gigognes
              </p>
            </div>

          </div>

          {/* Section conditionnelle Appartement */}
          {isAppartement && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-4">Appartement - Accès au logement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Nom de la résidence */}
                <div>
                  <label className="block font-semibold mb-1">Appartement - Nom de la résidence</label>
                  <input 
                    type="text" 
                    placeholder="Indiquez le nom de la résidence (ex. : Les Jardins)"
                    className="w-full p-2 border rounded"
                    value={getField('section_logement.appartement.nom_residence')}
                    onChange={(e) => handleInputChange('section_logement.appartement.nom_residence', e.target.value)}
                  />
                </div>
                
                {/* Bâtiment */}
                <div>
                  <label className="block font-semibold mb-1">Appartement - Bâtiment</label>
                  <input 
                    type="text" 
                    placeholder="Indiquez le bâtiment (ex. : E1)"
                    className="w-full p-2 border rounded"
                    value={getField('section_logement.appartement.batiment')}
                    onChange={(e) => handleInputChange('section_logement.appartement.batiment', e.target.value)}
                  />
                </div>
                
                {/* Accès à l'appartement */}
                <div>
                  <label className="block font-semibold mb-1">Appartement - Accès à l'appartement</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={getField('section_logement.appartement.acces')}
                    onChange={(e) => handleInputChange('section_logement.appartement.acces', e.target.value)}
                  >
                    <option value="">Veuillez sélectionner</option>
                    <option value="RDC">RDC</option>
                    <option value="Escalier">Escalier</option>
                    <option value="Ascenseur">Ascenseur</option>
                  </select>
                </div>
                
                {/* Étage */}
                <div>
                  <label className="block font-semibold mb-1">Appartement - Étage</label>
                  <input 
                    type="text" 
                    placeholder="Indiquez l'étage (ex. : 1)"
                    className="w-full p-2 border rounded"
                    value={getField('section_logement.appartement.etage')}
                    onChange={(e) => handleInputChange('section_logement.appartement.etage', e.target.value)}
                  />
                </div>
                
                {/* Numéro de porte */}
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">Appartement - Numéro de porte</label>
                  <input 
                    type="text" 
                    placeholder="Indiquez le numéro de porte (ex. : 12A)"
                    className="w-full p-2 border rounded"
                    value={getField('section_logement.appartement.numero_porte')}
                    onChange={(e) => handleInputChange('section_logement.appartement.numero_porte', e.target.value)}
                  />
                </div>

              </div>
            </div>
          )}

          {/* Debug panel (optionnel) */}
          {false && (
            <div className="mt-8 p-4 bg-gray-200 rounded">
              <h4 className="font-bold mb-2">DEBUG - Section Logement</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(getField('section_logement'), null, 2)}
              </pre>
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
                disabled={currentStep >= totalSteps - 1}
              >
                Suivant
              </Button>
            </div>
          </div>
          <div className="h-20"></div>   
        </div>
      </div>
    </div>
  )
}