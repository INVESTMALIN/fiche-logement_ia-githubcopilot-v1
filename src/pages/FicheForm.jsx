import { useState } from 'react'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import { useForm } from '../components/FormContext'
import Button from '../components/Button'
import { useNavigate } from 'react-router-dom';
import { isOptionalPhoneValid } from '../lib/phoneHelpers'
import { COUNTRY_OPTIONS } from '../lib/countries'

/**
 * Téléphone propriétaire : champ optionnel, accepté dans n'importe quel
 * indicatif international. On réutilise le prédicat partagé `isOptionalPhoneValid`
 * (phoneHelpers), le même socle de normalisation que les contacts maintenance et
 * les envois API — pas de regex parallèle qui pourrait diverger.
 *
 * ⚠️ Un numéro saisi en format national (`0...`) est interprété comme français,
 * sans détection de pays. D'où le rappel explicite du format international dans
 * le placeholder, l'aide sous le champ et le message d'erreur.
 */
const PHONE_ERROR_MESSAGE =
  "Format invalide. Pour un numéro français : 06 12 34 56 78. Pour un numéro étranger : format international avec l'indicatif, ex. +44 7769 645867."

export default function FicheForm() {
  const navigate = useNavigate();
  const [phoneError, setPhoneError] = useState('')
  const {
    next,
    back,
    currentStep,
    totalSteps,
    getField,
    updateField,
    handleSave,
    saveStatus,
    resetForm
  } = useForm()

  const handleInputChange = (fieldPath, value) => {
    updateField(fieldPath, value)
  }

  const handlePhoneChange = (value) => {
    handleInputChange('section_proprietaire.telephone', value)
    // Reset l'erreur dès la frappe pour ne pas être agressif ; la validation refire au blur.
    if (phoneError) setPhoneError('')
  }

  const handlePhoneBlur = (value) => {
    setPhoneError(isOptionalPhoneValid(value) ? '' : PHONE_ERROR_MESSAGE)
  }

  const handleCancel = () => {
    resetForm();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <div className="flex-1 flex flex-col">
        {/* Barre de progression en haut */}
        <ProgressBar />

        {/* Contenu principal */}
        <div className="flex-1 p-6 bg-gray-100">
          <h1 className="text-2xl font-bold mb-6">Fiche propriétaire</h1>

          {/* Champ: Nom de la Fiche (VISIBLE et MODIFIABLE) */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Nom de la Fiche *</label>
            <input
              type="text"
              placeholder="Le nom se génère automatiquement..."
              className="w-full p-2 border rounded"
              value={getField('nom')}
              onChange={(e) => handleInputChange('nom', e.target.value)}
              required
            />
          </div>

          {/* Nom du propriétaire */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Nom du propriétaire *</label>
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

          {/* Téléphone — champ optionnel, validation au blur (tout indicatif international accepté) */}
          <div className="mb-4">
            <label className="block font-semibold mb-1">Téléphone</label>
            <input
              type="tel"
              placeholder="06 12 34 56 78 ou +44 7769 645867"
              className="w-full p-2 border rounded"
              value={getField('section_proprietaire.telephone')}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={(e) => handlePhoneBlur(e.target.value)}
            />
            {/* Rappel permanent : un numéro étranger saisi en format national
                (commençant par 0) est interprété comme français sans jamais
                déclencher d'erreur — le message d'erreur seul ne couvre pas ce cas. */}
            <p className="text-sm text-gray-500 mt-1">
              Numéro étranger : utilisez le format international avec l'indicatif (ex. +44 7769 645867). Un numéro commençant par 0 est interprété comme français.
            </p>
            {phoneError && (
              <p className="text-sm text-red-600 mt-1">{phoneError}</p>
            )}
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
              className="w-full p-2 border rounded mb-2"
              value={getField('section_proprietaire.adresse.codePostal')}
              onChange={(e) => handleInputChange('section_proprietaire.adresse.codePostal', e.target.value)}
            />
            {/* Liste déroulante et non saisie libre : Loomky exige un code à deux
                lettres en MAJUSCULES pris dans SA liste (243 codes, qui n'est pas la
                liste ISO complète). Une saisie libre partirait en 400 une fois sur
                deux. Le libellé est lisible, la valeur stockée est le code. */}
            <select
              className="w-full p-2 border rounded bg-white"
              value={getField('section_proprietaire.adresse.pays')}
              onChange={(e) => handleInputChange('section_proprietaire.adresse.pays', e.target.value)}
              aria-label="Pays"
            >
              <option value="">Pays…</option>
              {COUNTRY_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
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
            {currentStep === 0 ? ( // Si c'est la première page (étape 0)
              <Button
                variant="ghost"
                onClick={handleCancel} // Bouton Annuler à gauche
              >
                Annuler
              </Button>
            ) : ( // Sinon, le bouton Retour habituel
              <Button
                variant="ghost"
                onClick={back}
                disabled={currentStep === 0}
              >
                Retour
              </Button>
            )}
            <div className="flex gap-3">
              {currentStep !== 0 && ( // Le bouton Annuler apparaît sur les pages > 0, à côté des autres boutons
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                >
                  Annuler
                </Button>
              )}
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