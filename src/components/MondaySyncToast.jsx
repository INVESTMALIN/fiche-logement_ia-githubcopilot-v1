// src/components/MondaySyncToast.jsx
//
// Bilan de la synchronisation Monday des 7 champs (statuts Premiers Ménages /
// Maintenance / BAC secours, identifiants et mots de passe Airbnb / Booking)
// après un enregistrement d'une fiche Complété. Monté UNE fois dans FicheWizard, au-dessus de l'étape
// courante : la synchronisation part de n'importe quelle page (autosave), le
// bilan doit donc être visible partout.
//
// Trois formes : succès (vert, discret), partiel (orange : une partie est
// passée, le reste est nommé), échec (rouge). On nomme des champs, jamais des
// valeurs — quatre des sept champs sont des identifiants ou des mots de passe.
//
// Le dédoublonnage (ne pas répéter le même avertissement à chaque autosave) est
// fait en amont dans FormContext : ce composant affiche ce qu'on lui donne.

import { useEffect } from 'react'
import { useForm } from './FormContext'

const DUREE_MS = { succes: 6000, partiel: 15000, echec: 15000 }

const STYLES = {
  succes: {
    cadre: 'border-green-300',
    titre: 'text-green-700',
    icone: '✅'
  },
  partiel: {
    cadre: 'border-orange-300',
    titre: 'text-orange-700',
    icone: '⚠️'
  },
  echec: {
    cadre: 'border-red-300',
    titre: 'text-red-700',
    icone: '❌'
  }
}

export default function MondaySyncToast() {
  const { mondaySyncFeedback, clearMondaySyncFeedback } = useForm()

  // Auto-dismiss, relancé à chaque nouveau bilan (timestamp change).
  useEffect(() => {
    if (!mondaySyncFeedback) return
    const duree = DUREE_MS[mondaySyncFeedback.type] ?? DUREE_MS.echec
    const t = setTimeout(() => clearMondaySyncFeedback(), duree)
    return () => clearTimeout(t)
  }, [mondaySyncFeedback, clearMondaySyncFeedback])

  if (!mondaySyncFeedback) return null

  const style = STYLES[mondaySyncFeedback.type] || STYLES.echec

  return (
    <div
      role={mondaySyncFeedback.type === 'succes' ? 'status' : 'alert'}
      data-testid="monday-sync-toast"
      data-type={mondaySyncFeedback.type}
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border ${style.cadre} bg-white shadow-lg p-4 flex items-start gap-3`}
    >
      <span className="text-xl leading-none" aria-hidden="true">{style.icone}</span>
      <div className="flex-1 text-sm text-gray-800">
        <p className={`font-semibold ${style.titre} mb-1`}>
          {mondaySyncFeedback.titre}
          {mondaySyncFeedback.numeroBien && (
            // Le sync est asynchrone : le bilan peut arriver après un changement
            // de fiche, on dit de quel bien il parle.
            <span className="font-normal text-gray-500"> · bien {mondaySyncFeedback.numeroBien}</span>
          )}
        </p>
        <p className="text-gray-700">
          {mondaySyncFeedback.message}
        </p>
      </div>
      <button
        type="button"
        onClick={clearMondaySyncFeedback}
        className="text-gray-400 hover:text-gray-700 text-lg leading-none"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  )
}
