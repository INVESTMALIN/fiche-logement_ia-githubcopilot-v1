// src/components/ChangerNumeroBienModal.jsx
//
// Parcours administrateur en DEUX étapes pour changer le numéro d'une fiche
// existante (logement qui change de conciergerie).
//
//   Étape 1 : saisie, contrôle de collision avec les autres fiches, et
//             recherche LECTURE SEULE du dossier Drive du nouveau numéro.
//   Étape 2 : récapitulatif, checklist de ce qui reste à refaire à la main,
//             et confirmation explicite.
//
// Les contrôles affichés ici sont un CONFORT, pas une garantie : la fonction
// SQL `changer_numero_bien` refait le contrôle de rôle et celui de collision,
// sous verrou. L'état du dossier Drive n'est jamais bloquant.

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, HelpCircle, Loader2, XCircle } from 'lucide-react'
import { evaluerChangementNumero, normaliserNumeroBien } from '../lib/numeroBien'
import { changerNumeroBien, verifierCollisionNumero, verifierDossierDrive } from '../services/numeroBienService'

const TEXTE_DRIVE_ABSENT =
  "Aucun dossier Drive trouvé pour ce numéro. La modification reste possible, mais aucun média "
  + "ne pourra être transféré vers Drive tant que le dossier n'aura pas été créé."

// Ce que la renumérotation ne fait PAS et qui reste à la charge de
// l'administrateur. Ordre repris du cadrage métier.
const CHECKLIST = [
  { id: 'monday', texte: "L'item du nouveau numéro doit déjà exister dans Monday." },
  { id: 'loomky-token', texte: 'Le token Loomky de la nouvelle conciergerie devra être utilisé.' },
  { id: 'pdf', texte: 'Les PDF logement et ménage devront être régénérés.' },
  { id: 'annonces', texte: 'Les annonces devront être régénérées puis validées pour repartir vers le nouvel item Monday.' },
  { id: 'guide', texte: "Le guide d'accès devra être recréé." },
  {
    id: 'loomky-sync',
    texte: 'La synchronisation Loomky devra être relancée : elle repart de zéro sur cette fiche.',
    note: "Le logement et les checklists de l'ancien compte Loomky restent en place, rien n'est supprimé à "
      + "distance. Limitation connue : si ce propriétaire existe déjà chez Loomky (même email), le registre "
      + "partagé renverra son identifiant dans l'ANCIEN compte et l'association échouera. À traiter à la main.",
  },
]

function Ligne({ ton, icone, children }) {
  const tons = {
    ok: 'bg-green-50 border-green-200 text-green-800',
    ko: 'bg-red-50 border-red-200 text-red-800',
    alerte: 'bg-orange-50 border-orange-200 text-orange-800',
    neutre: 'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div className={`flex items-start gap-2 p-3 border rounded text-sm ${tons[ton]}`}>
      <span className="flex-shrink-0 mt-0.5">{icone}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export default function ChangerNumeroBienModal({
  ficheId,
  numeroActuel,
  sauvegardeEnCours = false,
  modificationsEnAttente,
  enregistrer,
  onClose,
  onSuccess,
}) {
  const [etape, setEtape] = useState(1)
  const [nouveauNumero, setNouveauNumero] = useState('')
  const [collision, setCollision] = useState({ etat: 'inconnue', fiche: null })
  const [collisionEnCours, setCollisionEnCours] = useState(false)
  const [drive, setDrive] = useState(null)
  const [driveEnCours, setDriveEnCours] = useState(false)
  const [checklistLue, setChecklistLue] = useState(false)
  // Instantané pris au passage à l'étape 2 : une saisie faite moins de 5 s avant
  // n'est pas encore partie en base, et la renumérotation coupe l'autosave en
  // attente. On le dit au lieu de la perdre en silence.
  const [saisieEnAttente, setSaisieEnAttente] = useState(false)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [resultat, setResultat] = useState(null)

  const numero = normaliserNumeroBien(nouveauNumero)
  const evaluation = evaluerChangementNumero({ numeroActuel, nouveauNumero, collision })
  // La forme et « différent de l'actuel » se jugent sans les vérifications
  // distantes : c'est ce qui décide si on lance ces vérifications.
  const formeUtilisable = !evaluation.erreur || evaluation.erreur.startsWith('COLLISION')

  // Vérifications à la frappe, débouncées. Les deux partent en parallèle :
  // aucune ne dépend de l'autre, et le dossier Drive ne bloque jamais.
  useEffect(() => {
    if (!formeUtilisable) {
      setCollision({ etat: 'inconnue', fiche: null })
      setDrive(null)
      return
    }

    let actif = true
    setCollisionEnCours(true)
    setDriveEnCours(true)
    const minuteur = setTimeout(() => {
      verifierCollisionNumero(numero, ficheId).then((res) => {
        if (!actif) return
        setCollision(res)
        setCollisionEnCours(false)
      })
      verifierDossierDrive(numero).then((res) => {
        if (!actif) return
        setDrive(res)
        setDriveEnCours(false)
      })
    }, 400)

    return () => {
      actif = false
      clearTimeout(minuteur)
    }
  }, [numero, formeUtilisable, ficheId])

  const confirmer = async () => {
    setEnCours(true)
    setErreur(null)
    const res = await changerNumeroBien({ ficheId, numeroActuel, nouveauNumero: numero })
    setEnCours(false)

    if (!res.ok) {
      setErreur(res)
      // Une collision apparue entre l'étape 1 et la confirmation se corrige à
      // l'étape 1, pas en réessayant le même numéro.
      if (res.erreur === 'NUMERO_DEJA_UTILISE') {
        setCollision({ etat: 'occupee', fiche: res.fiche_en_conflit || null })
        setEtape(1)
      }
      return
    }

    setResultat(res)
    setEtape('succes')
    onSuccess?.(res)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">

        {etape === 1 && (
          <>
            <h3 className="text-lg font-semibold mb-1 text-gray-900">Modifier le numéro de bien</h3>
            <p className="text-sm text-gray-600 mb-4">
              La fiche, ses médias et son historique sont conservés. Seul le numéro change.
            </p>

            <div className="mb-4">
              <label className="block mb-1 font-semibold text-sm">Numéro actuel</label>
              <input type="text" className="w-full p-2 border rounded bg-gray-100" value={numeroActuel || ''} disabled readOnly />
            </div>

            <div className="mb-4">
              <label className="block mb-1 font-semibold text-sm" htmlFor="nouveau-numero-bien">Nouveau numéro *</label>
              <input
                id="nouveau-numero-bien"
                type="text"
                autoFocus
                className="w-full p-2 border rounded"
                placeholder="par ex. 2290"
                value={nouveauNumero}
                onChange={(e) => setNouveauNumero(e.target.value)}
              />
              {evaluation.erreur && ['VIDE', 'FORMAT', 'IDENTIQUE'].includes(evaluation.erreur) && numero !== '' && (
                <p className="text-red-600 text-sm mt-1">{evaluation.message}</p>
              )}
            </div>

            {formeUtilisable && (
              <div className="space-y-3 mb-5">
                {/* Collision : bloquante. */}
                {collisionEnCours && (
                  <Ligne ton="neutre" icone={<Loader2 className="w-4 h-4 animate-spin" />}>
                    Recherche d'une autre fiche portant le numéro {numero}…
                  </Ligne>
                )}
                {!collisionEnCours && collision.etat === 'libre' && (
                  <Ligne ton="ok" icone={<CheckCircle2 className="w-4 h-4" />}>
                    Aucune autre fiche n'utilise le numéro {numero}.
                  </Ligne>
                )}
                {!collisionEnCours && collision.etat === 'occupee' && (
                  <Ligne ton="ko" icone={<XCircle className="w-4 h-4" />}>
                    <p className="font-semibold">Le numéro {numero} est déjà utilisé.</p>
                    <p className="mt-1">
                      Fiche « {collision.fiche?.nom || 'sans nom'} »
                      {[collision.fiche?.coordinateur_prenom, collision.fiche?.coordinateur_nom].filter(Boolean).length > 0 && (
                        <>, suivie par {[collision.fiche.coordinateur_prenom, collision.fiche.coordinateur_nom].filter(Boolean).join(' ')}</>
                      )}
                      {collision.fiche?.statut ? ` (${collision.fiche.statut})` : ''}.
                    </p>
                    <p className="mt-1">Choisissez un autre numéro : deux fiches ne peuvent pas porter le même.</p>
                  </Ligne>
                )}
                {!collisionEnCours && collision.etat === 'inconnue' && (
                  <Ligne ton="neutre" icone={<HelpCircle className="w-4 h-4" />}>
                    {collision.message || 'Vérification des autres fiches indisponible.'} Réessayez avant de continuer.
                  </Ligne>
                )}

                {/* Dossier Drive : informatif, jamais bloquant. */}
                {driveEnCours && (
                  <Ligne ton="neutre" icone={<Loader2 className="w-4 h-4 animate-spin" />}>
                    Recherche du dossier Drive du bien {numero}…
                  </Ligne>
                )}
                {!driveEnCours && drive?.etat === 'trouve' && (
                  <Ligne ton="ok" icone={<CheckCircle2 className="w-4 h-4" />}>
                    Dossier Drive trouvé : <strong>{drive.dossier?.nom}</strong>
                    {drive.dossier?.url && (
                      <>
                        {' '}
                        <a href={drive.dossier.url} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                          ouvrir <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}
                  </Ligne>
                )}
                {!driveEnCours && drive?.etat === 'absent' && (
                  <Ligne ton="alerte" icone={<AlertTriangle className="w-4 h-4" />}>{TEXTE_DRIVE_ABSENT}</Ligne>
                )}
                {!driveEnCours && drive?.etat === 'ambigu' && (
                  <Ligne ton="alerte" icone={<AlertTriangle className="w-4 h-4" />}>
                    {drive.raison === 'candidat_non_conforme' ? (
                      <>
                        Aucun dossier Drive ne porte exactement ce numéro, mais «{' '}
                        {drive.dossiers?.[0]?.nom} » le contient : le transfert des médias le prendrait
                        pour le dossier du bien.
                      </>
                    ) : (
                      <>
                        Plusieurs dossiers Drive contiennent ce numéro
                        {drive.dossiers?.length ? ` (${drive.dossiers.map((d) => d.nom).join(', ')})` : ''}.
                        Le transfert des médias cible le premier trouvé, sans garantie que ce soit le bon.
                      </>
                    )}
                  </Ligne>
                )}
                {!driveEnCours && drive?.etat === 'indisponible' && (
                  <Ligne ton="neutre" icone={<HelpCircle className="w-4 h-4" />}>
                    {drive.message || 'Vérification du dossier Drive indisponible.'} On ne peut pas dire s'il existe
                    ou non : la modification reste possible.
                  </Ligne>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded text-gray-700 hover:bg-gray-100">
                Annuler
              </button>
              <button
                onClick={() => {
                  setErreur(null)
                  setSaisieEnAttente(!!modificationsEnAttente?.())
                  setEtape(2)
                }}
                disabled={!evaluation.pret}
                className={`px-4 py-2 rounded text-white font-medium ${evaluation.pret ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                Continuer
              </button>
            </div>
          </>
        )}

        {etape === 2 && (
          <>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Confirmer le changement de numéro</h3>

            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm text-gray-600">Numéro actuel</p>
              <p className="text-xl font-bold text-gray-900">{numeroActuel || '(vide)'}</p>
              <p className="text-sm text-gray-600 mt-3">Nouveau numéro</p>
              <p className="text-xl font-bold text-gray-900">{numero}</p>
            </div>

            <p className="text-sm font-semibold text-gray-900 mb-2">Ce qui reste à faire à la main :</p>
            <ul className="mb-4 space-y-2">
              {CHECKLIST.map((item) => (
                <li key={item.id} className="text-sm text-gray-700 flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>
                    {item.texte}
                    {item.note && <span className="block text-xs text-orange-700 mt-0.5">{item.note}</span>}
                  </span>
                </li>
              ))}
            </ul>

            <label className="flex items-start gap-2 mb-4 text-sm text-gray-800">
              {/* w-4 h-4 obligatoire : la feuille globale applique `w-full` à tout
                  `input`, une case à cocher sans taille explicite s'étire et pousse
                  le libellé (même correctif que les boutons radio du formulaire). */}
              <input
                type="checkbox"
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                checked={checklistLue}
                onChange={(e) => setChecklistLue(e.target.checked)}
              />
              <span>J'ai lu cette liste et je confirme le changement de numéro.</span>
            </label>

            {erreur && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                ❌ {erreur.message}
              </div>
            )}

            {sauvegardeEnCours && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                ⏳ Une sauvegarde de la fiche est en cours. Patientez avant de confirmer.
              </div>
            )}

            {/* La renumérotation coupe la sauvegarde automatique en attente : sans
                ce rappel, une saisie récente disparaîtrait sans que personne ne le
                voie. On informe et on propose de l'enregistrer, sans bloquer :
                un rôle `admin` n'a pas l'UPDATE sur les fiches, sa saisie ne
                pourra de toute façon jamais partir. */}
            {saisieEnAttente && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                <p>
                  Des modifications récentes de la fiche ne sont pas encore enregistrées. La renumérotation
                  ne les emportera pas : enregistrez-les d'abord, ou continuez en les abandonnant.
                </p>
                <button
                  type="button"
                  disabled={enregistrementEnCours || enCours}
                  onClick={async () => {
                    setEnregistrementEnCours(true)
                    setErreur(null)
                    const res = await enregistrer?.()
                    setEnregistrementEnCours(false)
                    if (res && res.success === false) {
                      setErreur({ message: `Enregistrement impossible : ${res.error}` })
                      return
                    }
                    setSaisieEnAttente(false)
                  }}
                  className="mt-2 underline font-medium disabled:opacity-50"
                >
                  {enregistrementEnCours ? 'Enregistrement…' : 'Enregistrer la fiche d\'abord'}
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setEtape(1)} disabled={enCours} className="px-4 py-2 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                Retour
              </button>
              <button
                onClick={confirmer}
                disabled={!checklistLue || enCours || sauvegardeEnCours || enregistrementEnCours}
                className={`px-4 py-2 rounded text-white font-medium ${!checklistLue || enCours || sauvegardeEnCours || enregistrementEnCours ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {enCours ? 'Modification…' : 'Confirmer la modification'}
              </button>
            </div>
          </>
        )}

        {etape === 'succes' && (
          <>
            <h3 className="text-lg font-semibold mb-4 text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Numéro modifié
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              La fiche porte maintenant le numéro <strong>{resultat?.nouveau_numero}</strong> (ancien numéro :{' '}
              {resultat?.ancien_numero || '(vide)'}).
            </p>
            <ul className="text-sm text-gray-700 space-y-1 mb-5 list-disc list-inside">
              <li>
                {resultat?.loomky_reinitialise
                  ? 'Synchronisation Loomky remise à zéro : le parcours est à relancer avec le token de la nouvelle conciergerie.'
                  : "Aucune synchronisation Loomky n'était en place sur cette fiche."}
              </li>
              <li>
                {resultat?.annonces_invalidees > 0
                  ? `${resultat.annonces_invalidees} annonce(s) ne sont plus marquées « synchronisé sur Monday » : à revalider pour repartir vers le nouvel item.`
                  : 'Aucune annonce validée à invalider.'}
              </li>
              <li>PDF logement et ménage, guide d'accès : à régénérer à la main.</li>
            </ul>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded text-white font-medium bg-gray-900 hover:bg-gray-800">
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
