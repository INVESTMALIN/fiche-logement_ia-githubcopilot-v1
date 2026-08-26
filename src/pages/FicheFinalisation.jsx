// src/pages/FicheFinalisation.jsx
import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import PDFUpload from '../components/PDFUpload'
import MiniDashboard from '../components/MiniDashboard'
import AnnonceAgentPanel from '../components/annonce/AnnonceAgentPanel'
import { CheckCircle, RefreshCw, AlertCircle, Loader2, FileText, FileEdit, Ban, AlertTriangle, ExternalLink, CheckCircle2, Pause, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { validateRequiredFields } from '../lib/validationConfig'
import { normalizePhotoField } from '../lib/photoHelpers'
import { createChecklistsOnLoomky, normalizeFormDataToFiche, enrichPropertyOnLoomky, logLoomkyEvent, addChecklistPhotoModels } from '../services/loomkyService'


export default function FicheFinalisation() {
  const navigate = useNavigate()
  const [showFinalModal, setShowFinalModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [loomkyToken, setLoomkyToken] = useState('')
  const [loomkyStatus, setLoomkyStatus] = useState({ syncing: false, error: null })
  const errorBlockRef = useRef(null)

  const {
    back,
    currentStep,
    formData,
    updateField,
    handleSave,
    saveStatus,
    handleLoad,
    finaliserFiche
  } = useForm()

  const handleFinaliser = async () => {
    // 1. Valider les champs obligatoires
    const errors = validateRequiredFields(formData)

    // 2. Si erreurs détectées, bloquer et afficher
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setShowValidationErrors(true)

      // Scroll vers le bloc d'erreurs après le render
      setTimeout(() => {
        errorBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)

      return
    }

    // 3. Si tout OK, continuer la finalisation normale
    await handleSave()
    await finaliserFiche()
    setShowFinalModal(true)
  }

  const handleCreateChecklists = async () => {
    setLoomkyStatus({ syncing: true, error: null })

    try {
      const ficheNormalized = normalizeFormDataToFiche(formData)

      // 1️⃣ Enrichissement property (accessDetails + wifiDetails)
      const enrichResult = await enrichPropertyOnLoomky(formData.loomky_property_id, ficheNormalized, loomkyToken)
      if (!enrichResult.success) {
        setLoomkyStatus({ syncing: false, error: `Enrichissement property échoué: ${enrichResult.error}` })
        return
      }

      // 2️⃣ Création checklists (inchangé)
      const result = await createChecklistsOnLoomky(formData.loomky_property_id, ficheNormalized, loomkyToken)

      if (!result.success) {
        setLoomkyStatus({ syncing: false, error: result.error })
        return
      }

      // Sauvegarder les IDs en Supabase
      const updatePayload = {
        loomky_sync_status: 'synced',
        loomky_synced_at: new Date().toISOString()
      }
      if (result.checklistIds) {
        updatePayload.loomky_checklist_ids = result.checklistIds
      }

      await supabase
        .from('fiches')
        .update(updatePayload)
        .eq('id', formData.id)

      // Sync FormContext
      if (result.checklistIds) updateField('loomky_checklist_ids', result.checklistIds)
      updateField('loomky_sync_status', 'synced')
      updateField('loomky_synced_at', updatePayload.loomky_synced_at)

      // 3️⃣ Photo de la boîte à clés → checklist "Boîte à clé" (non bloquant)
      // Pousse la/les photo(s) de l'emplacement de la boîte à clés en photo de référence
      // sur la checklist dédiée "Boîte à clé" (la boîte est souvent dehors, ni dans
      // l'Entrée ni dans une pièce — cf. retour Victoria).
      // Ne doit JAMAIS casser la création des checklists (même philosophie que logLoomkyEvent) :
      // try/catch dédié, on log et on continue, le statut "synced" est conservé.
      try {
        // Normalise emplacementPhoto : peut être un vrai tableau, une chaîne JSON
        // sérialisée ('["..."]'), une URL unique en string, ou null/undefined.
        // normalizePhotoField (partagé avec PhotoUpload) renvoie toujours un tableau.
        const photoUrls = normalizePhotoField(formData.section_clefs?.emplacementPhoto)

        if (photoUrls.length === 0) {
          console.log('ℹ️ Pas de photo boîte à clés (section_clefs.emplacementPhoto vide), skip photo-models')
        } else if (!result.checklistIds) {
          console.warn('⚠️ checklistIds absent, impossible de cibler la checklist "Boîte à clé", skip photo-models')
        } else {
          const boiteClesChecklist = result.checklistIds.find(c => c.name === 'Boîte à clé')
          if (!boiteClesChecklist) {
            console.warn('⚠️ Checklist "Boîte à clé" introuvable dans checklistIds, skip photo-models')
          } else {
            const photoResult = await addChecklistPhotoModels(
              formData.loomky_property_id,
              boiteClesChecklist.id,
              photoUrls,
              loomkyToken
            )
            if (photoResult.success) {
              console.log(`✅ ${photoResult.uploadedCount} photo(s) boîte à clés ajoutée(s) à la checklist "Boîte à clé"`)
            } else {
              console.warn('⚠️ Échec ajout photo boîte à clés (non bloquant):', photoResult.error)
            }
          }
        }
      } catch (photoErr) {
        console.warn('⚠️ Erreur upload photo boîte à clés (non bloquant):', photoErr)
      }

      logLoomkyEvent(formData.id, ficheNormalized.logement_numero_bien, formData.nom, 'loomky_checklists_created', formData.user_id)
      setLoomkyStatus({ syncing: false, error: null })
      alert('✅ Checklists Loomky créées avec succès !')

    } catch (err) {
      setLoomkyStatus({ syncing: false, error: err.message || 'Erreur inattendue' })
    }
  }

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <div className="flex-1 flex flex-col">
        <ProgressBar />

        <div className="flex-1 p-6 bg-gray-100">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Finalisation de l'inspection</h1>

            {/* MINI DASHBOARD - Aperçu + Alertes */}
            <div className="mb-8">
              <MiniDashboard formData={formData} />
            </div>


            {/* GÉNÉRATION PDF */}
            <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Génération des fiches PDF</h3>
                  <p className="text-sm text-gray-600">Créez automatiquement vos documents logement et ménage</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <PDFUpload
                  formData={formData}
                  onPDFGenerated={(url) => console.log('PDF généré:', url)}
                  updateField={updateField}
                  handleSave={handleSave}
                />
              </div>

              {/* Note explicative */}
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-blue-500 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-700 leading-relaxed space-y-2">
                    <ul className="ml-4 space-y-1">
                      <li>• <strong>Fiche Logement</strong> : disponible au téléchargement ci-dessous</li>
                      <li>• <strong>Fiche Ménage</strong> : générée en parallèle</li>
                    </ul>
                    <p className="mt-2">
                      Les deux fiches remontent automatiquement sur le <strong>Drive</strong> et dans <strong>Monday</strong> à chaque génération.
                      <span className="inline-block ml-1">♻️ Vous pouvez régénérer autant de fois que nécessaire.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>


            {/* ============================================
                BLOC SYNCHRONISATION LOOMKY - 🚧 EN DÉVELOPPEMENT
            ============================================ */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-purple-300 p-6 mb-6">

              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Checklists Ménage Loomky</h3>
                  <p className="text-sm text-gray-600">Créez les checklists ménage sur le compte Loomky de la conciergerie.</p>
                </div>
              </div>

              {/* Cas 1 : pas de property_id → bloquer */}
              {!formData.loomky_property_id && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Vous devez d'abord créer le logement dans Loomky depuis la section <strong>Email Outlook</strong>
                  </p>
                </div>
              )}

              {/* Cas 2 : property_id existe → afficher le formulaire */}
              {formData.loomky_property_id && (
                <div className="space-y-4">

                  {/* Badge statut checklists */}
                  <div className="mt-3">
                    {formData.loomky_checklist_ids && formData.loomky_checklist_ids.length > 0 ? (
                      <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1.5 w-fit">
                        <CheckCircle2 className="w-4 h-4" /> Checklists créées
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-medium flex items-center gap-1.5 w-fit">
                        <Pause className="w-4 h-4" /> Checklists non créées
                      </span>
                    )}
                  </div>

                  {/* Sous-cas 2a : checklists déjà créées → l'API Loomky refuse les doublons (409 Conflict),
                      on masque le bouton de (re)création et le champ token, seul "Voir dans Loomky" reste accessible */}
                  {formData.loomky_checklist_ids?.length > 0 ? (
                    <>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            Les checklists ont déjà été créées sur Loomky. Pour les modifier, intervenir directement dans Loomky.
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <a
                          href={`https://app.loomky.com/index/rentals/edit/informations/general?propertyId=${formData.loomky_property_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-purple-700 border border-purple-300 hover:bg-purple-50 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" /> Voir dans Loomky
                        </a>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Sous-cas 2b : pas encore créées → token + bouton "Créer les checklists" */}
                      <div>
                        <label className="block font-semibold mb-1 text-sm">
                          Token Loomky <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Token JWT Loomky (disponible dans Monday)"
                          value={loomkyToken}
                          onChange={(e) => setLoomkyToken(e.target.value)}
                          className="w-full p-2 border rounded font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Copiez le token de la conciergerie depuis Monday.</p>
                      </div>

                      {/* Erreur */}
                      {loomkyStatus.error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800 flex items-center gap-2"><XCircle className="w-4 h-4" /> {loomkyStatus.error}</p>
                        </div>
                      )}

                      {/* Boutons */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCreateChecklists}
                          disabled={loomkyStatus.syncing || !loomkyToken.trim()}
                          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all ${loomkyStatus.syncing || !loomkyToken.trim()
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                        >
                          {loomkyStatus.syncing ? (
                            <><Loader2 className="w-5 h-5 animate-spin" />Création en cours...</>
                          ) : (
                            <><RefreshCw className="w-5 h-5" />Créer les checklists</>
                          )}
                        </button>
                        <a
                          href={`https://app.loomky.com/index/rentals/edit/informations/general?propertyId=${formData.loomky_property_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-purple-700 border border-purple-300 hover:bg-purple-50 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" /> Voir dans Loomky
                        </a>
                      </div>
                    </>
                  )}

                </div>
              )}

            </div>

            {/* ============================================
                AGENT ANNONCE — Génération + édition par consigne + validation
                (PDF + push Monday). `pdfMetadata` alimente le header du PDF :
                numéro de bien, type de propriété et adresse de la fiche.
            ============================================ */}
            <AnnonceAgentPanel
              ficheId={formData.id}
              pdfMetadata={{
                numero_bien: formData.section_logement?.numero_bien || 'N/A',
                type_propriete: formData.section_logement?.type_propriete || 'Non spécifié',
                adresse: {
                  rue: formData.section_proprietaire?.adresse?.rue || '',
                  complement: formData.section_proprietaire?.adresse?.complement || '',
                  code_postal: formData.section_proprietaire?.adresse?.codePostal || '',
                  ville: formData.section_proprietaire?.adresse?.ville || ''
                }
              }}
            />

            {/* SECTION PRÉ-FINALISATION (statuts et champs obligatoires) */}
            <div className="mb-8 space-y-4">

              {/* 1. Alerte si Brouillon */}
              {formData.statut === 'Brouillon' && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileEdit className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        Cette fiche est en brouillon
                      </h3>
                      <p className="text-sm text-blue-800 mb-2">
                        Pensez à la <strong>Finaliser</strong> une fois toutes les sections complétées pour déclencher
                        la synchronisation des photos/vidéos vers Google Drive.
                      </p>
                      <p className="text-sm text-blue-800">
                        <AlertCircle className="w-4 h-4 inline-block mr-1" />
                        <strong>Cette synchronisation se fait une seule fois et est définitive.</strong> Si vous devez ajouter des photos après la finalisation,
                        vous pourrez les ajouter dans la Fiche logement, mais il faudra les transférer manuellement dans le Drive.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Compteur de validation */}
              {(() => {
                const errors = validateRequiredFields(formData)
                const totalErrors = Object.values(errors).reduce((sum, sectionErrors) => sum + sectionErrors.length, 0)
                const sectionsWithErrors = Object.keys(errors).length

                if (totalErrors === 0) {
                  return (
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-green-900">
                            Tous les champs obligatoires sont remplis
                          </h3>
                          <p className="text-sm text-green-800">
                            Vous pouvez finaliser la fiche en toute sécurité.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  return (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-orange-900 mb-2">
                            Il manque encore {totalErrors} champ{totalErrors > 1 ? 's' : ''} obligatoire{totalErrors > 1 ? 's' : ''}
                          </h3>
                          <p className="text-sm text-orange-800 mb-3">
                            {sectionsWithErrors} section{sectionsWithErrors > 1 ? 's' : ''} concernée{sectionsWithErrors > 1 ? 's' : ''}.
                            Vous ne pourrez pas finaliser tant que ces champs ne sont pas complétés.
                          </p>
                          <button
                            onClick={() => {
                              setValidationErrors(errors)
                              setShowValidationErrors(true)
                              setTimeout(() => errorBlockRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
                            }}
                            className="text-sm font-medium text-orange-900 hover:text-orange-700 underline"
                          >
                            Voir le détail des champs manquants →
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }
              })()}

            </div>

            {/* Messages sauvegarde */}
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

            {/* Affichage des erreurs de validation */}
            {showValidationErrors && Object.keys(validationErrors).length > 0 && (
              <div className="mb-6 p-6 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <Ban className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 ref={errorBlockRef} className="text-lg font-bold text-red-900 mb-2">
                      Impossible de finaliser la fiche
                    </h3>
                    <p className="text-sm text-red-700 mb-4">
                      Certains champs obligatoires ne sont pas remplis. Veuillez compléter les sections suivantes :
                    </p>

                    <div className="space-y-3">
                      {Object.entries(validationErrors).map(([section, errors]) => (
                        <div key={section} className="bg-white p-4 rounded border border-red-200">
                          <h4 className="font-semibold text-red-900 mb-2 capitalize">
                            📍 Section : {section.replace(/_/g, ' ')}
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                            {errors.map((error, idx) => (
                              <li key={idx}>{error.message}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowValidationErrors(false)}
                      className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
                    >
                      J'ai compris
                    </button>
                  </div>
                </div>
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

                <button
                  onClick={handleFinaliser}
                  disabled={saveStatus.saving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#dbae61] hover:bg-[#c49a4f] text-white rounded-lg font-medium transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  <CheckCircle className="w-5 h-5" />
                  Finaliser la fiche
                </button>
              </div>
            </div>
            <div className="h-20"></div>
          </div>
        </div>
      </div>

      {/* MODAL DE FINALISATION */}
      {
        showFinalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 text-center">
              <div className="mb-6">
                <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Fiche finalisée avec succès !
                </h2>
                <p className="text-gray-600">
                  La fiche "<strong>{formData.nom}</strong>" a été marquée comme complétée.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  onClick={() => navigate('/')}
                >
                  Retour au Dashboard
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowFinalModal(false)}
                >
                  Continuer l'édition
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}