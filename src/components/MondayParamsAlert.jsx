// src/components/MondayParamsAlert.jsx
//
// Bandeau d'alerte affiché au plus tôt (dès l'ouverture du lien Monday) quand une
// valeur reçue est invalide au regard des contraintes de la base. Objectif : que
// le coordinateur comprenne immédiatement ce qui bloque, AVANT de remplir des
// pages pour rien (cf. incident 2084 BARBELLION du 13/07).
//
// - Ne s'affiche que pour une fiche NON encore créée (formData.id === null) : une
//   fois la ligne créée proprement, le sujet est clos. On n'alarme pas sur une
//   fiche existante chargée depuis la base.
// - Ne bloque pas : le coordinateur corrige le champ directement dans le
//   formulaire et continue. Rien n'est nettoyé automatiquement.
// - Monté une seule fois dans FicheWizard, donc visible sur toutes les sections.
import { useForm } from './FormContext'
import { validateMondayConstrainedFields } from '../lib/mondayFieldConstraints'

export default function MondayParamsAlert() {
  const { formData } = useForm()

  // Fiche déjà créée → plus de garde-fou création à signaler.
  if (formData?.id) return null

  const issues = validateMondayConstrainedFields(formData)
  if (issues.length === 0) return null

  const plural = issues.length > 1

  return (
    <div
      role="alert"
      className="bg-red-50 border-b-2 border-red-300 px-4 py-3 text-sm text-red-800"
    >
      <p className="font-semibold mb-1">
        ⚠️ {plural ? 'Des données reçues sont invalides' : 'Une donnée reçue est invalide'} —
        la fiche ne sera pas créée tant que ce n'est pas corrigé.
      </p>

      <ul className="list-disc list-inside space-y-0.5 mb-2">
        {issues.map((issue) => (
          <li key={issue.id}>
            <strong>{issue.fieldLabel}</strong> (section {issue.sectionLabel}) : valeur reçue
            {' '}« {issue.value} », or {issue.expected} est attendu.
          </li>
        ))}
      </ul>

      <p className="text-red-700">
        Corrigez directement le{plural ? 's' : ''} champ{plural ? 's' : ''} concerné{plural ? 's' : ''} ci-dessous
        pour continuer. Si cette fiche a été ouverte depuis un lien Monday, corrigez également la
        colonne correspondante dans Monday puis rouvrez le lien — sinon l'erreur reviendra à la
        prochaine ouverture.
      </p>
    </div>
  )
}
