import { useState } from 'react'
import SidebarMenu from '../components/SidebarMenu'
import ProgressBar from '../components/ProgressBar'
import { useForm } from '../components/FormContext'
import Button from '../components/Button'

export default function FicheClefs() {
  const { next, back, currentStep, totalSteps } = useForm()
  const [hasInterphone, setHasInterphone] = useState(null)
  const [hasTempoGache, setHasTempoGache] = useState(null)
  const [hasDigicode, setHasDigicode] = useState(null)
  const [clefRemise, setClefRemise] = useState(null)

  return (
    <div className="flex min-h-screen">
      <SidebarMenu />

      <div className="flex-1 flex flex-col">
        {/* Barre de progression en haut */}
        <ProgressBar />
        
        {/* Contenu principal */}
        <div className="flex-1 p-6 bg-gray-100 space-y-6">
          <h1 className="text-2xl font-bold">Gestion des clés et accès</h1>

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
                  onChange={() => setHasInterphone(true)} 
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="interphone" 
                  onChange={() => setHasInterphone(false)} 
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
                  onChange={() => setHasTempoGache(true)} 
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="tempo" 
                  onChange={() => setHasTempoGache(false)} 
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
                  onChange={() => setHasDigicode(true)} 
                />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="digicode" 
                  onChange={() => setHasDigicode(false)} 
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
            />

            <div className="mb-4">
              <label className="block font-semibold mb-1">Le prestataire a-t-il reçu des clefs ?</label>
              <div className="flex gap-6 mt-2">
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="clefRemise" 
                    onChange={() => setClefRemise(true)} 
                  />
                  Oui
                </label>
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="clefRemise" 
                    onChange={() => setClefRemise(false)} 
                  />
                  Non
                </label>
              </div>
            </div>

            <textarea 
              className="w-full p-3 border rounded"
              placeholder="Le prestataire a t-il reçu les clés en mains propres ? Où sont stockées les clés ? Quel type de clef ?"
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
  )
}