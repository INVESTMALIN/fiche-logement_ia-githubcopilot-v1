import React, { useState } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import { Eye, EyeOff, House, Loader2, CheckCircle2, XCircle, Construction, RefreshCw, Rocket, Trash2, ChevronDown, AlertTriangle } from 'lucide-react'
import { createPropertyOnLoomky, normalizeFormDataToFiche, deletePropertyOnLoomky } from '../services/loomkyService'
import { supabase } from '../lib/supabaseClient'

export default function FicheEmailOutlook() {
    const {
        next,
        back,
        currentStep,
        totalSteps,
        getField,
        formData,
        updateField,
        handleSave,
        saveStatus
    } = useForm()

    const emailCompte = getField('section_email_outlook.email_compte')
    const motPasse = getField('section_email_outlook.mot_passe')
    const [showPassword, setShowPassword] = useState(false)
    const [showPropertyId, setShowPropertyId] = useState(false)

    const [loomkyToken, setLoomkyToken] = useState('')
    const [loomkyLoading, setLoomkyLoading] = useState(false)
    const [loomkyError, setLoomkyError] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [successModal, setSuccessModal] = useState(null) // { type: 'created' | 'deleted', propertyId }

    const handleCreateProperty = async () => {
        setLoomkyLoading(true)
        setLoomkyError(null)

        try {
            const ficheNormalized = normalizeFormDataToFiche(formData)
            const result = await createPropertyOnLoomky(ficheNormalized, loomkyToken)

            if (!result.success) {
                setLoomkyError(result.error)
                return
            }

            // Sauvegarder le propertyId en Supabase + FormContext
            await supabase
                .from('fiches')
                .update({ loomky_property_id: result.propertyId })
                .eq('id', formData.id)

            updateField('loomky_property_id', result.propertyId)
            setSuccessModal({ type: 'created', propertyId: result.propertyId })

        } catch (err) {
            setLoomkyError(err.message || 'Erreur inattendue')
        } finally {
            setLoomkyLoading(false)
        }
    }

    const handleDeleteProperty = () => {
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        setShowDeleteModal(false)
        setLoomkyLoading(true)
        setLoomkyError(null)

        const deletedPropertyId = formData.loomky_property_id

        try {
            const result = await deletePropertyOnLoomky(deletedPropertyId, loomkyToken, formData.id)

            if (!result.success) {
                setLoomkyError(result.error)
                return
            }

            // Cleanup Supabase
            await supabase
                .from('fiches')
                .update({
                    loomky_property_id: null,
                    loomky_checklist_ids: null,
                    loomky_sync_status: null,
                    loomky_synced_at: null,
                    loomky_snapshot: null
                })
                .eq('id', formData.id)

            // Cleanup FormContext
            updateField('loomky_property_id', null)
            updateField('loomky_checklist_ids', null)
            updateField('loomky_sync_status', null)
            updateField('loomky_synced_at', null)
            updateField('loomky_snapshot', null)
            setSuccessModal({ type: 'deleted', propertyId: deletedPropertyId })

        } catch (err) {
            setLoomkyError(err.message || 'Erreur inattendue')
        } finally {
            setLoomkyLoading(false)
        }
    }

    return (
        <>
            <div className="flex min-h-screen">
                <SidebarMenu />
                <div className="flex-1 flex flex-col">
                    <ProgressBar />
                    <div className="flex-1 p-6 bg-gray-100">
                        <h1 className="text-2xl font-bold mb-6">E-mail Outlook</h1>

                        <div className="bg-white p-6 rounded-lg shadow space-y-6">

                            <div>
                                <label className="block font-semibold mb-1">
                                    E-mail du compte Outlook <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="exemple@outlook.com"
                                    value={emailCompte}
                                    onChange={(e) => updateField('section_email_outlook.email_compte', e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">
                                    Mot de passe <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={motPasse}
                                        onChange={(e) => updateField('section_email_outlook.mot_passe', e.target.value)}
                                        className="w-full p-2 pr-10 border rounded"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* BLOC LOOMKY - Création property */}
                        <div className="bg-white p-6 rounded-lg shadow space-y-4 border-2 border-purple-300 mt-6">

                            {/* Warning DEV */}
                            <div className="p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg flex items-start gap-3">
                                <Construction className="w-5 h-5 text-yellow-900 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-yellow-900">FONCTIONNALITÉ EN DÉVELOPPEMENT</p>
                                    <p className="text-xs text-yellow-800 mt-1">
                                        Création de l'hébergement Loomky. Ne pas utiliser en production pour le moment.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <House className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Synchronisation Loomky</h3>
                                    <p className="text-sm text-gray-600">Créez la propriété sur le compte Loomky de la conciergerie.</p>
                                </div>
                            </div>

                            {/* Champ token */}
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

                            {/* Statut */}
                            {formData.loomky_property_id && (
                                <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                                    <div className="p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-green-800 flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" /> Hébergement déjà créé sur Loomky
                                            </p>
                                            <button
                                                onClick={() => setShowPropertyId(!showPropertyId)}
                                                className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 transition-colors"
                                            >
                                                <span className="font-medium">Détails</span>
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showPropertyId ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        className={`transition-all duration-200 ease-in-out ${showPropertyId ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div className="px-3 pb-3 pt-0">
                                            <div className="text-xs text-green-700 bg-green-100 rounded px-2 py-1.5 font-mono">
                                                <span className="text-green-600">ID:</span> {formData.loomky_property_id}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {loomkyError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-800 flex items-center gap-2"><XCircle className="w-4 h-4" /> {loomkyError}</p>
                                </div>
                            )}

                            {/* Boutons */}
                            <div className="flex gap-3">
                                {!formData.loomky_property_id ? (
                                    <button
                                        onClick={handleCreateProperty}
                                        disabled={loomkyLoading || !loomkyToken.trim()}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all ${loomkyLoading || !loomkyToken.trim()
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-purple-600 hover:bg-purple-700'
                                            }`}
                                    >
                                        {loomkyLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Création...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Rocket className="w-4 h-4" />
                                                <span>Créer le logement</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleDeleteProperty}
                                        disabled={loomkyLoading || !loomkyToken.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Supprimer</span>
                                    </button>
                                )}
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

                        {/* Boutons navigation */}
                        <div className="mt-6 flex justify-between">
                            <Button variant="ghost" onClick={back} disabled={currentStep === 0}>
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

            {/* MODAL DE SUCCÈS */}
            {successModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            {successModal.type === 'created' ? (
                                <>
                                    <h2 className="text-xl font-bold text-gray-900 mb-3">
                                        Hébergement créée avec succès !
                                    </h2>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        Le logement a été créé sur Loomky avec l'identifiant{' '}
                                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">
                                            {successModal.propertyId}
                                        </code>.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold text-gray-900 mb-3">
                                        Hébergement supprimé avec succès !
                                    </h2>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        L'hébergement {' '}
                                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">
                                            {successModal.propertyId}
                                        </code>{' '}
                                        a été supprimé de Loomky et les données ont été nettoyées en base.
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="flex justify-center">
                            <button
                                onClick={() => setSuccessModal(null)}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-3">
                                Supprimer l'hébergement de Loomky ?
                            </h2>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Cette action est irréversible. L'hébergement{' '}
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">
                                    {formData.loomky_property_id}
                                </code>{' '}
                                sera définitivement supprimé de Loomky et les données seront nettoyées en base.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Supprimer définitivement
                            </button>
                        </div>
                        <div className="h-20"></div>
                    </div>
                </div>
            )}
        </>
    )
}