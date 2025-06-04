import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarMenu from '../components/SidebarMenu'

export default function FicheClefs() {
  const navigate = useNavigate()

  const [typeBoite, setTypeBoite] = useState('')
  const [hasInterphone, setHasInterphone] = useState(null)
  const [hasDigicode, setHasDigicode] = useState(null)
  const [hasTempoGache, setHasTempoGache] = useState(null)
  const [clefRemise, setClefRemise] = useState(null)

  return (
    <div className="flex min-h-screen">
      <SidebarMenu currentSection="Clefs" />

      <div className="flex-1 p-6 bg-gray-100 space-y-6">
        <h2 className="text-xl font-bold">Boîte à clés et gestion des clés</h2>

        {/* Type de boîte */}
        <div>
          <label className="block font-semibold mb-1">Type de boîte à clés *</label>
          <div className="flex gap-6 mt-2">
            {['TTlock', 'Igloohome', 'Masterlock'].map(opt => (
              <label key={opt} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="boite"
                  value={opt}
                  checked={typeBoite === opt}
                  onChange={(e) => setTypeBoite(e.target.value)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Emplacement */}
        <div>
          <label className="block font-semibold mb-1">Emplacement de la boîte à clés *</label>
          <textarea placeholder="ex. : à côté de la porte sur votre droite." />
        </div>

        {/* Upload photo emplacement */}
        <div>
          <label className="block font-semibold mb-1">Emplacement de la boîte à clés</label>
          <div className="border border-dashed p-6 text-center text-sm text-gray-500">
            📎 Parcourir les fichiers<br />
            <span className="text-xs">Drag and drop files here</span>
          </div>
        </div>

        {/* Champs conditionnels */}
        {/* TTlock */}
        {typeBoite === 'TTlock' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
            <label className="block font-semibold mb-1">TTlock - Code Masterpin conciergerie *</label>
            <input type="text" placeholder="Entrez le code (ex. : 2863)." />
            </div>
            <div>
            <label className="block font-semibold mb-1">TTlock - Code Propriétaire *</label>
            <input type="text" placeholder="Entrez le code (ex. : 2863)." />
            </div>
            <div>
            <label className="block font-semibold mb-1">TTlock - Code Ménage *</label>
            <input type="text" placeholder="Entrez le code (ex. : 2863)." />
            </div>
        </div>
        )}

        {/* Igloohome */}
        {typeBoite === 'Igloohome' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block font-semibold mb-1">Igloohome - Masterpin conciergerie *</label>
            <input type="text" placeholder="Entrez le code (ex. : 2863)." />
            </div>
            <div>
            <label className="block font-semibold mb-1">Igloohome - Code Voyageur *</label>
            <input type="text" placeholder="Entrez le code (ex. : 2863)." />
            </div>
            <div>
            <label className="block font-semibold mb-1">Igloohome - Code Propriétaire *</label>
            <input type="text" placeholder="Entrez le code (ex. : 2863)." />
            </div>
            <div>
            <label className="block font-semibold mb-1">Igloohome - Code Ménage *</label>
            <input type="text" placeholder="Entrez le code (ex. : 2863)." />
            </div>
        </div>
        )}

        {/* Masterlock */}
        {typeBoite === 'Masterlock' && (
        <div>
            <label className="block font-semibold mb-1">MasterLock - Codes de la boîte à clés *</label>
            <input type="text" placeholder="Entrez le code (ex. : 2863)." />
        </div>
        )}


        {/* Interphone */}
        <div>
          <label className="block font-semibold mb-1">Interphone - Logement équipé d’un interphone?*</label>
          <div className="flex gap-6 mt-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="interphone" onChange={() => setHasInterphone(true)} />
              Oui
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="interphone" onChange={() => setHasInterphone(false)} />
              Non
            </label>
          </div>
        </div>

        {hasInterphone && (
          <>
            <textarea className="h-32"  placeholder="Instructions pour l’interphone. S'il existe un code d'accès, notez-le ici et expliquez comment l'utiliser. S'il n'y a pas de code, précisez à quel nom il faut sonner. Ajoutez toute instruction spéciale pour l'utilisation de l'interphone." />
            <div className="border border-dashed p-6 text-center text-sm text-gray-500">
              📎 Photo de l’interphone
            </div>
          </>
        )}

        {/* Tempo-gâche */}
        <div>
          <label className="block font-semibold mb-1">Tempo-gâche - Logement équipé d’un tempo-gâche?*</label>
          <div className="flex gap-6 mt-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tempo" onChange={() => setHasTempoGache(true)} />
              Oui
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="tempo" onChange={() => setHasTempoGache(false)} />
              Non
            </label>
          </div>
        </div>

        {hasInterphone && hasTempoGache && (
          <>
            <textarea placeholder="Description du tempo-gâche *" />
            <div className="border border-dashed p-6 text-center text-sm text-gray-500">
              📎 Photo du tempo-gâche
            </div>
          </>
        )}

        {/* Digicode */}
        <div>
          <label className="block font-semibold mb-1">Digicode - Logement éqyuipé d'un digicode?*</label>
          <div className="flex gap-6 mt-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="digicode" onChange={() => setHasDigicode(true)} />
              Oui
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="digicode" onChange={() => setHasDigicode(false)} />
              Non
            </label>
          </div>
        </div>

        {hasDigicode && (
          <>
            <textarea placeholder="Instructions pour le digicode *" />
            <div className="border border-dashed p-6 text-center text-sm text-gray-500">
              📎 Photo du digicode
            </div>
          </>
        )}

        {/* Clefs */}
        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Clefs – 3 JEUX DE CLEFS OBLIGATOIRE - Photos :</label>
            <div className="border border-dashed p-6 text-center text-sm text-gray-500">
              📎 Parcourir les fichiers
            </div>
          </div>

          <textarea placeholder="Précision sur chaque clef, son utilisation et s’il en manque *" />

          <div>
            <label className="block font-semibold mb-1">Le prestataire a-t-il reçu des clefs ?</label>
            <div className="flex gap-6 mt-2">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="clefRemise" onChange={() => setClefRemise(true)} />
                Oui
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="clefRemise" onChange={() => setClefRemise(false)} />
                Non
              </label>
            </div>
          </div>

          <textarea placeholder="Le prestataire a t-il reçu les clés en mains propres ? Où sont stockées les clés ? Quel type de clef ?" />
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => navigate('/fiche/logement')}
          >
            Retour
          </button>
          <div className="space-x-2">
            <button className="bg-gray-200 px-4 py-2 rounded">Enregistrer</button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  )
}
