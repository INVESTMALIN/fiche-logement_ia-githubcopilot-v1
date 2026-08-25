import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

// État sûr affiché quand l'URL demande une fiche (?id=...) que l'on n'a pas pu
// charger. Volontairement sans aucun champ ni bouton de sauvegarde : le seul
// autre rendu possible serait le formulaire vierge de création, qu'un
// « Enregistrer » transformerait en fiche parasite (saveFiche insère dès que
// formData.id est null).
//
// Fiche absente et fiche filtrée par la RLS sont indistinguables côté client
// (PostgREST renvoie « 0 rows » dans les deux cas), d'où le libellé commun. Le
// message technique est affiché tel quel : c'est lui qui permet au support de
// séparer un « 0 rows » d'une coupure réseau.
export default function FicheIntrouvable({ ficheId, message }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-3">Fiche introuvable ou inaccessible</h1>
        <p className="mb-2 text-gray-600">
          Cette fiche n’existe pas, a été supprimée, ou n’est pas accessible avec votre compte.
        </p>
        <p className="mb-6 text-gray-600">
          Si le problème persiste, vérifiez le lien utilisé ou rapprochez-vous d’un administrateur.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" onClick={() => navigate('/')}>
            Retour au tableau de bord
          </Button>
          {/* Rechargement complet : l'effet de chargement de FormContext ne
              dépend que de l'URL, le relancer autrement demanderait d'élargir
              ses dépendances (boucle de rendu documentée sur place). */}
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>

        {ficheId && (
          <p className="mt-8 text-xs text-gray-400 break-all">
            Identifiant demandé : {ficheId}
            {message ? ` — ${message}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
