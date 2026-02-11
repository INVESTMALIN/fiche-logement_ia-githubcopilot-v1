import React, { useState } from 'react'
import { useForm } from '../components/FormContext'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import Button from '../components/Button'
import { Eye, EyeOff } from 'lucide-react'

export default function FicheEmailOutlook() {
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

    const emailCompte = getField('section_email_outlook.email_compte')
    const motPasse = getField('section_email_outlook.mot_passe')
    const [showPassword, setShowPassword] = useState(false)

    return (
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