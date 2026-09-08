// src/components/ChangerNumeroBienModal.jsx
//
// Parcours administrateur en DEUX étapes pour changer le numéro d'une fiche
// existante (logement qui change de conciergerie).
//
//   Étape 1 : saisie, contrôle de collision avec les autres fiches, et deux
//             recherches LECTURE SEULE sur le nouveau numéro — le bien dans
//             Monday, le dossier dans Drive.
//   Étape 2 : récapitulatif, rappels avant / après, et confirmation explicite.
//
// Les contrôles affichés ici sont un CONFORT, pas une garantie : la fonction
// SQL `changer_numero_bien` refait le contrôle de rôle et celui de collision,
// sous verrou, et refuse une confirmation partie d'un numéro périmé.
//
// Le contrôle Drive ne bloque JAMAIS la modification et n'affirme jamais qu'un
// dossier est celui de ce logement : il montre ce que la recherche a trouvé —
// nom exact et lien — et l'administrateur vérifie. Comparer automatiquement le
// nom du dossier au propriétaire et à la ville de la fiche a été tenté puis
// retiré : sur des chaînes libres, la comparaison produisait des verts
// trompeurs, et un vert trompeur envoie les photos dans le dossier d'un autre
// bien sans que personne ne regarde.

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, FolderOpen, HelpCircle, Loader2, XCircle } from 'lucide-react'
import { evaluerChangementNumero, normaliserNumeroBien } from '../lib/numeroBien'
import {
  changerNumeroBien,
  verifierBienMonday,
  verifierCollisionNumero,
  verifierDossierDrive,
} from '../services/numeroBienService'

// À préparer AVANT de changer le numéro : rien de tout cela n'est automatique.
const AVANT_LE_CHANGEMENT = [
  'Le bien avec le nouveau numéro doit être créé dans Monday.',
  'Le dossier Drive du nouveau bien doit être créé pour permettre la synchronisation des photos.',
  'Si la nouvelle conciergerie utilise Loomky, la création du compte doit être refaite depuis Monday.',
]

// À refaire APRÈS le changement. Même liste sur les deux écrans : ce qui est
// annoncé avant est exactement ce qui est rappelé après.
const APRES_LE_CHANGEMENT = [
  'Régénérer les PDF logement et ménage.',
  'Régénérer les annonces Airbnb et Booking, le cas échéant.',
  "Régénérer le guide d'accès, si besoin.",
  'Relancer la synchronisation des photos vers Drive.',
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

function LienDossier({ dossier }) {
  if (!dossier?.url) return null
  return (
    <a
      href={dossier.url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline inline-flex items-center gap-1"
    >
      ouvrir le dossier <ExternalLink className="w-3 h-3" />
    </a>
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
  const [monday, setMonday] = useState(null)
  const [mondayEnCours, setMondayEnCours] = useState(false)
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

  // Vérifications à la frappe, débouncées. Les trois partent en parallèle :
  // aucune ne dépend des autres, et seule la collision entre fiches bloque.
  useEffect(() => {
    if (!formeUtilisable) {
      setCollision({ etat: 'inconnue', fiche: null })
      setDrive(null)
      setMonday(null)
      return
    }

    let actif = true
    setCollisionEnCours(true)
    setDriveEnCours(true)
    setMondayEnCours(true)
    const minuteur = setTimeout(() => {
      verifierCollisionNumero(numero, ficheId).then((res) => {
        if (!actif) return
        setCollision(res)
        setCollisionEnCours(false)
      })
      verifierBienMonday(numero).then((res) => {
        if (!actif) return
        setMonday(res)
        setMondayEnCours(false)
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
                {/* Collision entre fiches : bloquante. */}
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

                {/* Bien dans Monday : informatif, jamais bloquant. La recherche
                    se fait sur la colonne du numéro, côté serveur — le token
                    Monday ne descend jamais dans le navigateur. */}
                {mondayEnCours && (
                  <Ligne ton="neutre" icone={<Loader2 className="w-4 h-4 animate-spin" />}>
                    Recherche du bien {numero} dans Monday…
                  </Ligne>
                )}

                {!mondayEnCours && monday?.etat === 'trouve' && (
                  <Ligne ton="ok" icone={<CheckCircle2 className="w-4 h-4" />}>
                    Le bien {numero} a été trouvé dans Monday : {monday.lignes[0].nom}.
                  </Ligne>
                )}

                {!mondayEnCours && monday?.etat === 'absent' && (
                  <Ligne ton="alerte" icone={<AlertTriangle className="w-4 h-4" />}>
                    Le bien {numero} n'a pas été trouvé dans Monday. Créez-le avant de modifier
                    le numéro.
                  </Ligne>
                )}

                {!mondayEnCours && monday?.etat === 'multiple' && (
                  <Ligne ton="alerte" icone={<AlertTriangle className="w-4 h-4" />}>
                    <p>
                      Plusieurs lignes Monday utilisent le numéro {numero}. Vérifiez-les avant
                      de continuer.
                    </p>
                    <ul className="mt-1 space-y-1">
                      {monday.lignes.map((ligne) => (
                        <li key={ligne.id}>{ligne.nom}</li>
                      ))}
                    </ul>
                  </Ligne>
                )}

                {!mondayEnCours && monday?.etat === 'indisponible' && (
                  <Ligne ton="neutre" icone={<HelpCircle className="w-4 h-4" />}>
                    La vérification Monday n'a pas pu être effectuée. Vous pouvez continuer, mais
                    vérifiez manuellement que le bien existe dans Monday.
                  </Ligne>
                )}

                {/* Dossier Drive : informatif, jamais bloquant. Cinq états,
                    décidés par le nombre de dossiers trouvés et le préfixe de
                    leur nom. */}
                {driveEnCours && (
                  <Ligne ton="neutre" icone={<Loader2 className="w-4 h-4 animate-spin" />}>
                    Recherche du dossier Drive du bien {numero}…
                  </Ligne>
                )}

                {!driveEnCours && drive?.etat === 'absent' && (
                  <Ligne ton="alerte" icone={<AlertTriangle className="w-4 h-4" />}>
                    Le dossier Drive du nouveau bien reste à créer pour permettre la synchronisation
                    des photos.
                  </Ligne>
                )}

                {/* Un seul dossier : on montre son nom exact et son lien, sans
                    dire qu'il correspond — c'est l'administrateur qui le lit. */}
                {!driveEnCours && drive?.etat === 'trouve' && drive.dossiers?.[0] && (
                  <Ligne ton="neutre" icone={<FolderOpen className="w-4 h-4" />}>
                    Dossier Drive trouvé : « {drive.dossiers[0].nom} ». Vérifiez qu'il correspond bien
                    à ce logement avant de continuer. <LienDossier dossier={drive.dossiers[0]} />
                  </Ligne>
                )}

                {/* Un dossier qui contient le numéro sans commencer par
                    « {numero}. » : Make le trouverait quand même. La distinction
                    porte sur le PRÉFIXE du nom, un fait vérifiable — rien n'est
                    comparé au propriétaire ni à la ville. */}
                {!driveEnCours && drive?.etat === 'hors_convention' && drive.dossiers?.[0] && (
                  <Ligne ton="alerte" icone={<AlertTriangle className="w-4 h-4" />}>
                    Un dossier Drive contient ce numéro, mais son nom ne respecte pas la convention
                    attendue : « {drive.dossiers[0].nom} ». Vérifiez manuellement qu'il s'agit du bon
                    dossier avant de continuer. <LienDossier dossier={drive.dossiers[0]} />
                  </Ligne>
                )}

                {!driveEnCours && drive?.etat === 'ambigu' && drive.dossiers?.length > 0 && (
                  <Ligne ton="alerte" icone={<AlertTriangle className="w-4 h-4" />}>
                    <p>
                      Plusieurs dossiers Drive contiennent le numéro {numero}. Vérifiez manuellement
                      lequel correspond à ce logement avant de continuer.
                    </p>
                    <ul className="mt-1 space-y-1">
                      {drive.dossiers.map((dossier) => (
                        <li key={dossier.id}>
                          « {dossier.nom} » <LienDossier dossier={dossier} />
                        </li>
                      ))}
                    </ul>
                  </Ligne>
                )}

                {!driveEnCours && drive?.etat === 'indisponible' && (
                  <Ligne ton="neutre" icone={<HelpCircle className="w-4 h-4" />}>
                    <p>La vérification du dossier Drive n'a pas pu être effectuée.</p>
                    {drive.message && <p className="mt-1">{drive.message}</p>}
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

            <p className="text-sm font-semibold text-gray-900 mb-2">À vérifier avant de continuer :</p>
            <ul className="mb-4 space-y-2">
              {AVANT_LE_CHANGEMENT.map((texte) => (
                <li key={texte} className="text-sm text-gray-700 flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{texte}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm font-semibold text-gray-900 mb-2">Après le changement, vous devrez :</p>
            <ul className="mb-4 space-y-2">
              {APRES_LE_CHANGEMENT.map((texte) => (
                <li key={texte} className="text-sm text-gray-700 flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{texte}</span>
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
              <span>J'ai compris les actions à effectuer après le changement.</span>
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

            <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm text-gray-600">Ancien numéro</p>
              <p className="text-xl font-bold text-gray-900">{resultat?.ancien_numero || '(vide)'}</p>
              <p className="text-sm text-gray-600 mt-3">Nouveau numéro</p>
              <p className="text-xl font-bold text-gray-900">{resultat?.nouveau_numero}</p>
            </div>

            <p className="text-sm font-semibold text-gray-900 mb-2">Actions à effectuer maintenant :</p>
            <ul className="text-sm text-gray-700 space-y-2 mb-5">
              {APRES_LE_CHANGEMENT.map((texte) => (
                <li key={texte} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{texte}</span>
                </li>
              ))}
              {/* Uniquement si la fiche était réellement synchronisée : sur une
                  fiche qui ne l'était pas, parler de Loomky n'apporte rien. */}
              {resultat?.loomky_reinitialise && (
                <li className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>Relancez la synchronisation Loomky avec le token de la nouvelle conciergerie.</span>
                </li>
              )}
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
