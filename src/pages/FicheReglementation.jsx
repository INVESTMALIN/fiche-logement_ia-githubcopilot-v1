// src/pages/FicheReglementation.jsx
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'

// Listes de villes (à importer depuis FormContext ou constantes séparées)
const VILLES_CHANGEMENT_USAGE = [
  "NON !",
  "Ahetze", "Aix-en-Provence", "Anglet", "Annecy", "Antibes", "Arbonne", 
  "Arcangues", "Ascain", "Bandiat", "Bassussarry", "Bayonne", "Biarritz", 
  "Bidart", "Biriatou", "Bordeaux", "Boucau", "Boulogne-Billancourt", 
  "Cannes", "Chaville", "Ciboure", "Colombes", "Courbevoie", "Creil", 
  "Dunkerque", "Échirolles", "Évry-Courcouronnes", "Garches", "Grenoble", 
  "Guéthary", "Hendaye", "Issy-les-Moulineaux", "Jatxou", "La Baule", 
  "La Garenne-Colombes", "La Rochelle", "Lahonce", "Larressore", 
  "Levallois-Perret", "Lille", "Lyon", "Marseille", "Montpellier", 
  "Mouguerre", "Nantes", "Nanterre", "Neuilly-sur-Seine", "Nice", "Paris", 
  "Puteaux", "Roquebrune-Cap-Martin", "Rueil-Malmaison", "Saint-Cloud", 
  "Saint-Jean-de-Luz", "Saint-Malo", "Saint-Paul-de-Vence", 
  "Saint-Pierre d'Irube", "Sète", "Strasbourg", "Suresnes", "Toulouse", 
  "Urcuit", "Urrugne", "Ustaritz", "Vaucresson", "Versailles", 
  "Villefranche-sur-Mer", "Villefranque"
];

const VILLES_DECLARATION_SIMPLE = [
  "NON !",
  "Achères", "Ahetze", "Aix-en-Provence", "Alba-la-Romaine", "Albi", 
  "Alby-sur-Chéran", "Allèves", "Anglet", "Angoulins-sur-Mer", "Annecy", 
  "Aragnouet", "Arbonne", "Arcangues", "Argonay", "Arles", "Arradon", 
  "Arromanches-les-Bains", "Artigues", "Ascain", "Asnières-sur-Seine", 
  "Auberive", "Auménancourt", "Auriol", "Aytré", "Bandol", "Barjols", 
  "Bassussarry", "Batz-sur-mer", "Bayeux", "Bayonne", "Beaumont-sur-Vesle", 
  "Beaune", "Bétheny", "Bezannes", "Biarritz", "Bidart", "Biriatou", 
  "Bluffy", "Bordeaux", "Bormes-les-Mimosas", "Boucau", "Boulogne-Billancourt", 
  "Bourgogne-Fresne", "Bras", "Brue-Auriac", "Buchelay", "Camps-la-Source", 
  "Carcès", "Cassis", "Cauroy-lès-Hermonville", "Cauterets", 
  "Chainaz-les-Frasses", "Champigny-sur-Vesle", "Chandolas", "Chapeiry", 
  "Chaumes-en-Retz", "Chauvé", "Charvonnex", "Châteauvert", "Châtel", 
  "Châtelaillon-Plage", "Chavanod", "Chaville", "Ciboure", "Colmar", 
  "Colombes", "Conflans-Sainte-Honorine", "Correns", "Cotignac", 
  "Courbevoie", "Courcelles-Sapicourt", "Créteil", "Cuers", "Cusy", 
  "Deauville", "Dompierre-sur-Mer", "Duingt", "Eaubonne", "Écueil", 
  "Entrecasteaux", "Epagny Metz-Tessy", "Époye", "Esparron-de-Pallières", 
  "Évian-les-Bains", "Fillière", "Fox-Amphoux", "Forcalqueiret", 
  "Frontignan", "Gaillard", "Garéoult", "Gassin", "Ginasservis", "Grimaud", 
  "Groisy", "Guéthary", "Hardricourt", "Hendaye", "Héry-sur-Alby", 
  "Heutrégiville", "Honfleur", "Isle-sur-Suippe", "Issou", 
  "Issy-les-Moulineaux", "Istres", "Jatxou", "La Baule", "La Bernerie-en-Retz", 
  "La Celle", "La Ciotat", "La Croix-Valmer", "La Garenne-Colombes", 
  "La Londe-les-Maures", "La Plaine-sur-Mer", "La Rochelle", 
  "La Roque d'Anthéron", "La Roquebrussanne", "La Verdière", "Labenne", 
  "Lagord", "Lahonce", "Larmor-baden", "Larressore", "Le Castellet", 
  "Le Lavandou", "Le Plan-de-la-Tour", "Le Pouliguen", "Le Val", 
  "Les Baux-de-Provence", "Les Sables d'Olonne", "Leschaux", 
  "Levallois-Perret", "Lille", "Loivre", "Lorient", "Lyon", 
  "Mandelieu-la-Napoule", "Marseille", "Martigues", "Menthon-Saint-Bernard", 
  "Menton", "Meudon", "Montfort-sur-Argens", "Montigny-lès-Cormeilles", 
  "Montmeyan", "Montpellier", "Morillon", "Mouguerre", "Mûres", 
  "Nans-les-Pins", "Nanterre", "Nantes", "Nâves-Parmelan", "Néoules", 
  "Neuilly-sur-Seine", "Nice", "Nieul-sur-Mer", "Nîmes", "Ollières", 
  "Orgeval", "Paris", "Pazanne", "Périgny", "Poissy", "Poisy", "Pontevès", 
  "Pornic", "Port-en-Bessin-Huppain", "Port-Louis", "Port-Saint-Louis-du-Rhône", 
  "Port-Saint-Père", "Pourcieux", "Pourrières", "Préfailles", "Prouilly", 
  "Provins", "Puilboreau", "Puteaux", "Quimper", "Quintal", "Ramatuelle", 
  "Reims", "Rians", "Rilly-la-Montagne", "Rocbaron", "Roquebrune-Cap-Martin", 
  "Roquebrune-sur-Argens", "Rouans", "Rueil-Malmaison", "Saint-Cannat", 
  "Saint-Cyr-sur-Mer", "Sainte-Anastasie-sur-Issole", "Saintes-Maries-de-la-Mer", 
  "Saint-Eustache", "Saint-Félix", "Saint-Gildas-de-Rhuys", 
  "Saint-Hilaire-de-Chaléons", "Saint-Hilaire-le-Petit", "Saint-Jean-de-Luz", 
  "Saint-Jorioz", "Saint-Julien", "Saint-Lary-Soulan", "Saint-Malo", 
  "Saint-Martin-de-Pallières", "Saint-Maurice", "Saint-Maximin-la-Sainte-Baume", 
  "Saint-Michel-Chef-Chef", "Saint-Paul-de-Vence", "Saint-Pierre d'Irube", 
  "Saint-Sylvestre", "Saint-Tropez", "Salles-sur-Mer", "Sanary-sur-Mer", 
  "Sarzeau", "Seignosse", "Séné", "Sept-Saulx", "Serzy-et-Prin", "Sète", 
  "Sèvres", "Sevrier", "Sillery", "Soorts-Hossegor", "Soustons", "Strasbourg", 
  "Talloires-Montmin", "Toulouse", "Tourves", "Trépail", "Trigny", "Troyes", 
  "Urcuit", "Urrugne", "Ustaritz", "Val-de-Vesle", "Vannes", "Vanves", 
  "Varages", "Versailles", "Verzenay", "Veyrier-du-Lac", "Villaz", 
  "Villefranque", "Villeneuve-en-Retz", "Villeneuve-Loubet", 
  "Villennes-sur-Seine", "Villers-Allerand", "Villers-Marmery", "Vincennes", 
  "Vins-sur-Caramy", "Viuz-la-Chiésaz", "Vue", "Witry-lès-Reims"
];

export default function FicheReglementation() {
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

  // Récupération des données de la section
  const formData = getField('section_reglementation')
  const villeChangementUsage = formData.ville_changement_usage || ""
  const villeDeclarationSimple = formData.ville_declaration_simple || ""
  const dateExpiration = formData.date_expiration_changement || ""
  const numeroDeclaration = formData.numero_declaration || ""
  const detailsReglementation = formData.details_reglementation || ""

  // DPE
  const classeDpe = formData.classe_dpe || ""
  const dpeDepensesMin = formData.dpe_depenses_min ?? ""
  const dpeDepensesMax = formData.dpe_depenses_max ?? ""
  const showDpeDepenses = classeDpe === 'F' || classeDpe === 'G'

  // Changement de classe DPE : si on quitte F/G, on purge la fourchette de
  // dépenses pour ne pas laisser une estimation fantôme dans le state
  // (sinon persistée par mapFormDataToSupabase et affichable au PDF / par l'agent).
  const handleClasseDpeChange = (value) => {
    updateField('section_reglementation.classe_dpe', value)
    if (value !== 'F' && value !== 'G') {
      updateField('section_reglementation.dpe_depenses_min', '')
      updateField('section_reglementation.dpe_depenses_max', '')
    }
  }

  // Dépenses énergétiques : entier positif ou nul uniquement (€/an). On accepte
  // la valeur entière (ou le champ vidé) ou on ignore la saisie. Toute entrée
  // invalide — décimale, exposant, signe, texte — est rejetée telle quelle, sans
  // jamais être transformée (pas de concaténation de chiffres type 1500.50 → 150050).
  const handleDepensesChange = (field, rawValue) => {
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      updateField(`section_reglementation.${field}`, rawValue)
    }
  }

  // Fourchette incohérente (borne basse > borne haute) : signalé inline, non bloquant.
  const dpeFourchetteIncoherente =
    dpeDepensesMin !== "" &&
    dpeDepensesMax !== "" &&
    parseInt(dpeDepensesMin, 10) > parseInt(dpeDepensesMax, 10)

  // Documents checklist
  const documentsData = formData.documents || {}

  // Logiques conditionnelles
  const requiresChangementUsage = villeChangementUsage && villeChangementUsage !== "NON !"
  const showDeclarationSimple = villeChangementUsage === "NON !"
  const requiresDeclarationSimple = villeDeclarationSimple && villeDeclarationSimple !== "NON !"
  const showAucuneDeclaration = showDeclarationSimple && villeDeclarationSimple === "NON !"

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />
      
      <div className="flex-1 flex flex-col">
        <ProgressBar />
        
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Réglementation</h1>
          
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <p className="text-gray-600 text-sm">
              Changement d'usage et déclaration en meublé de tourisme (selon les villes spécifiques)
            </p>

            {/* 1. Dropdown Changement d'usage */}
            <div>
              <label className="block font-semibold mb-1">
                Le logement se situe-t-il dans une de ces villes ? Changement d'usage ! <span className="text-red-500">*</span>
              </label>
              <select
                value={villeChangementUsage}
                onChange={(e) => updateField('section_reglementation.ville_changement_usage', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Veuillez sélectionner</option>
                {VILLES_CHANGEMENT_USAGE.map(ville => (
                  <option key={ville} value={ville}>{ville}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Rappelons que cette liste peut évoluer et qu'il est toujours préférable de vérifier auprès de la mairie concernée avant tout projet de location touristique.
              </p>
            </div>

            {/* 2. Affichage conditionnel - Changement d'usage requis */}
            {requiresChangementUsage && (
              <div className="space-y-4 bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
                <div className="bg-orange-100 p-3 rounded">
                  <p className="text-orange-800 font-medium">
                    ⚠️ Attention ! Votre ville exige un changement d'usage pour les meublés de tourisme. 
                    Renseignez-vous auprès de votre mairie sur les conditions et exemptions avant toute mise en location.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    À quelle date le changement d'usage expire-t-il ?
                  </label>
                  <input
                    type="date"
                    value={dateExpiration}
                    onChange={(e) => updateField('section_reglementation.date_expiration_changement', e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Quelle est le numéro de déclaration en meublé de tourisme ?
                  </label>
                  <input
                    type="text"
                    value={numeroDeclaration}
                    onChange={(e) => updateField('section_reglementation.numero_declaration', e.target.value)}
                    placeholder="Numéro de déclaration"
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Il est obligatoire de l'afficher sur toutes les plateformes de locations courte durée !
                  </p>
                </div>
              </div>
            )}

            {/* 3. Affichage conditionnel - Déclaration simple */}
            {showDeclarationSimple && (
              <div>
                <label className="block font-semibold mb-1">
                  Le logement se situe-t-il dans une de ces villes ? Simple déclaration ! <span className="text-red-500">*</span>
                </label>
                <select
                  value={villeDeclarationSimple}
                  onChange={(e) => updateField('section_reglementation.ville_declaration_simple', e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Veuillez sélectionner</option>
                  {VILLES_DECLARATION_SIMPLE.map(ville => (
                    <option key={ville} value={ville}>{ville}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Rappelons que cette liste peut évoluer et qu'il est toujours préférable de vérifier auprès de la mairie concernée avant tout projet de location touristique.
                </p>
              </div>
            )}

            {/* 4. Affichage conditionnel - Déclaration simple requise */}
            {requiresDeclarationSimple && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                <div className="bg-blue-100 p-3 rounded">
                  <p className="text-blue-800 font-medium">
                    📋 Votre ville demande une déclaration simple pour les meublés de tourisme. 
                    Remplissez le formulaire Cerfa n°14004*04 et déposez-le en mairie avant de commencer la location.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Quelle est le numéro de déclaration en meublé de tourisme ?
                  </label>
                  <input
                    type="text"
                    value={numeroDeclaration}
                    onChange={(e) => updateField('section_reglementation.numero_declaration', e.target.value)}
                    placeholder="Numéro de déclaration"
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Il est obligatoire de l'afficher sur toutes les plateformes de locations courte durée !
                  </p>
                </div>
              </div>
            )}

            {/* 5. Affichage conditionnel - Aucune déclaration */}
            {showAucuneDeclaration && (
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                <div className="bg-green-100 p-3 rounded">
                  <p className="text-green-800 font-medium">
                    ✅ Bonne nouvelle ! Aucune déclaration n'est requise a priori. 
                    Vérifiez tout de même auprès de votre mairie, car les réglementations évoluent rapidement.
                  </p>
                </div>
              </div>
            )}

            {/* SECTIONS TOUJOURS AFFICHÉES */}
            {/* Textarea détails - TOUJOURS VISIBLE */}
            <div>
              <label className="block font-semibold mb-1">
                Veuillez indiquer tout détail pertinent concernant le changement d'usage ou la déclaration en meublé de tourisme : <span className="text-red-500">*</span>
              </label>
              <textarea
                value={detailsReglementation}
                onChange={(e) => updateField('section_reglementation.details_reglementation', e.target.value)}
                placeholder="Le changement d'usage est-il en cours ? Une demande de déclaration a-t-elle été faite ? Si oui, quand ? Le propriétaire a-t-il déjà entamé les démarches nécessaires ? Avez-vous des remarques concernant la réglementation applicable à ce logement"
                rows={4}
                className="w-full p-2 border rounded"
              />
            </div>

            <hr className="border-gray-300" />

            {/* Classe DPE - TOUJOURS VISIBLE (facultatif) */}
            <div>
              <label className="block font-semibold mb-1">Classe DPE</label>
              <select
                value={classeDpe}
                onChange={(e) => handleClasseDpeChange(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Veuillez sélectionner</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
                <option value="Non communiqué">Non communiqué</option>
              </select>

              {/* Bloc explicatif repliable */}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                  En savoir plus
                </summary>
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700 space-y-2">
                  <p>
                    La classe énergétique doit obligatoirement figurer sur l'annonce de location.
                    Pour un logement classé F ou G, l'annonce doit en plus afficher la mention
                    « Logement à consommation énergétique excessive » et une estimation des
                    dépenses énergétiques annuelles. Nous collectons donc ces informations ici
                    pour que l'annonce soit conforme, même si le champ reste facultatif dans la fiche.
                  </p>
                  <a
                    href="https://www.economie.gouv.fr/particuliers/gerer-mon-argent/investir-dans-limmobilier/ce-quil-faut-savoir-sur-le-diagnostic-de-performance-energetique-dpe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-blue-600 hover:text-blue-700 underline"
                  >
                    En savoir plus sur le DPE
                  </a>
                </div>
              </details>

              {/* Estimation des dépenses énergétiques annuelles - uniquement F ou G */}
              {showDpeDepenses && (
                <div className="mt-4 space-y-3 bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
                  <p className="text-sm text-orange-800 font-medium">
                    Logement classé {classeDpe} : estimation des dépenses énergétiques annuelles
                    (fourchette indiquée sur le DPE).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Dépenses min (€ / an)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={dpeDepensesMin}
                        onChange={(e) => handleDepensesChange('dpe_depenses_min', e.target.value)}
                        placeholder="ex. 1500"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Dépenses max (€ / an)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={dpeDepensesMax}
                        onChange={(e) => handleDepensesChange('dpe_depenses_max', e.target.value)}
                        placeholder="ex. 2030"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  {dpeFourchetteIncoherente && (
                    <p className="text-red-600 text-sm mt-1">
                      ⚠️ La dépense minimale ne peut pas être supérieure à la dépense maximale.
                    </p>
                  )}
                </div>
              )}
            </div>

            <hr className="border-gray-300" />

            {/* Section Documents - TOUJOURS VISIBLE */}
            <div>
              <h2 className="text-lg font-semibold text-blue-600 mb-4">Documents :</h2>
              
              <p className="text-sm text-gray-600 mb-4">
                Vérifiez sur Monday la possession des documents suivants :
              </p>
              
              <div>
                <p className="font-semibold mb-3">Documents :</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={documentsData.carte_identite || false}
                      onChange={(e) => updateField('section_reglementation.documents.carte_identite', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Carte d'identité</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={documentsData.rib || false}
                      onChange={(e) => updateField('section_reglementation.documents.rib', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>RIB</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={documentsData.cerfa || false}
                      onChange={(e) => updateField('section_reglementation.documents.cerfa', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>CERFA</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={documentsData.assurance_pno || false}
                      onChange={(e) => updateField('section_reglementation.documents.assurance_pno', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Assurance PNO</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={documentsData.rcp || false}
                      onChange={(e) => updateField('section_reglementation.documents.rcp', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>RCP</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={documentsData.acte_propriete || false}
                      onChange={(e) => updateField('section_reglementation.documents.acte_propriete', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Acte Propriété</span>
                  </label>
                </div>
              </div>
            </div>    
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
        <div className="h-20"></div>        
      </div>
    </div>
  )
}