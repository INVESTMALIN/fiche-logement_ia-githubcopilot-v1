// src/components/FicheLegacyRedirect.jsx
// Route de compatibilite pour les anciennes URL /fiche/<uuid>.
//
// FormContext lit l'id de fiche dans la query string (params.get('id')) et n'a
// jamais lu le parametre de route. /fiche/<uuid> rendait donc un formulaire
// vierge, sans erreur ni avertissement : l'utilisateur croyait consulter une
// fiche, et un "Enregistrer" depuis cet etat creait une fiche parasite.
//
// Aucun lien interne ne construit cette forme d'URL (tous les navigate()
// utilisent deja /fiche?id=). On la conserve malgre tout pour les liens
// externes anciens (mails, Monday, Make) qui pourraient encore circuler.

import { Navigate, useParams, useLocation } from 'react-router-dom'
import NotFound from '../pages/NotFound'

// Les ids de fiches sont des uuid Postgres. Tout le reste part en 404 plutot
// que d'atteindre le wizard : une URL bancale ne doit jamais aboutir a un
// formulaire vierge que l'on pourrait enregistrer par megarde.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function FicheLegacyRedirect() {
  const { id } = useParams()
  const { search } = useLocation()

  if (!UUID.test(id ?? '')) return <NotFound />

  // Le reste de la query string est conserve : les parametres Monday peuvent
  // accompagner l'URL et sont lus par FormContext apres la redirection.
  const params = new URLSearchParams(search)
  params.set('id', id)

  return <Navigate to={`/fiche?${params.toString()}`} replace />
}
