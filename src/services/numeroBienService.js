// src/services/numeroBienService.js
//
// Parcours administrateur « changer le numéro de bien » : les trois appels dont
// l'interface a besoin. Aucune règle métier ici (elles sont dans
// src/lib/numeroBien.js), aucune écriture directe sur `fiches` : l'écriture
// passe par la fonction SQL `changer_numero_bien`, seule autorité sur le rôle,
// la collision et la cohérence de l'ensemble.

import { supabase } from '../lib/supabaseClient'
import { normaliserNumeroBien } from '../lib/numeroBien'

const MESSAGES_ERREUR = {
  NUMERO_INVALIDE: 'Numéro de bien invalide : attendu un numéro sans espace ni texte autour, 50 caractères maximum.',
  NUMERO_IDENTIQUE: 'Le nouveau numéro est identique au numéro actuel.',
  NUMERO_DEJA_UTILISE: 'Ce numéro est déjà utilisé par une autre fiche.',
  FICHE_INTROUVABLE: "Cette fiche n'existe plus.",
  ROLE_REFUSE: 'Modification réservée aux administrateurs.',
}

/**
 * Une autre fiche porte-t-elle déjà ce numéro ?
 *
 * Passe par `check_fiche_existante` (SECURITY DEFINER, déjà utilisée par
 * l'alerte de doublon à la création) : une lecture directe de `fiches` est
 * soumise aux RLS, qui masqueraient une fiche d'un collègue à un rôle `admin`
 * pour les colonnes non couvertes. La fonction ne rend qu'une ligne, sans aucun
 * contenu de fiche.
 *
 * `inconnue` couvre « lecture en échec » : l'appelant ne doit pas conclure que
 * le numéro est libre. Le serveur revérifie de toute façon, sous verrou.
 *
 * @returns {Promise<{etat: 'libre'|'occupee'|'inconnue', fiche: object|null, message?: string}>}
 */
export async function verifierCollisionNumero(numero, ficheIdCourante = null) {
  const valeur = normaliserNumeroBien(numero)
  if (!valeur) return { etat: 'inconnue', fiche: null }

  const { data, error } = await supabase.rpc('check_fiche_existante', { p_numero_bien: valeur })

  if (error) {
    console.error('verifierCollisionNumero : lecture impossible', error)
    return { etat: 'inconnue', fiche: null, message: 'Vérification des autres fiches impossible pour le moment.' }
  }

  // `id` n'est rendu qu'aux rôles qui peuvent ouvrir la fiche : il peut être
  // nul, on ne peut donc pas toujours écarter la fiche courante par son id.
  // Ce n'est pas gênant : le parcours refuse déjà un numéro identique à
  // l'actuel, donc une ligne trouvée ici désigne forcément une AUTRE fiche.
  const ligne = (data || []).find((f) => !ficheIdCourante || f.id !== ficheIdCourante) || null
  return ligne ? { etat: 'occupee', fiche: ligne } : { etat: 'libre', fiche: null }
}

/**
 * Le dossier Drive du bien existe-t-il ? Lecture seule, jamais bloquante.
 * Trois états rendus par le serveur : `trouve`, `absent`, `indisponible`
 * (+ `multiple`, rare). Une panne réseau est un `indisponible` : on ne dit
 * jamais « absent » quand on n'a pas pu regarder.
 *
 * @returns {Promise<{etat: string, dossier: object|null, dossiers?: object[], message?: string, raison?: string}>}
 */
export async function verifierDossierDrive(numero) {
  const valeur = normaliserNumeroBien(numero)
  if (!valeur) return { etat: 'indisponible', dossier: null, raison: 'numero_absent' }

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) {
      return {
        etat: 'indisponible',
        dossier: null,
        raison: 'session',
        message: 'Vérification impossible : votre session a expiré.',
      }
    }

    const response = await fetch('/api/dossier-bien', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ numeroBien: valeur }),
    })
    const data = await response.json().catch(() => null)

    if (!response.ok || !data?.success) {
      return {
        etat: 'indisponible',
        dossier: null,
        raison: 'serveur',
        message: data?.error || `Vérification impossible (erreur ${response.status}).`,
      }
    }

    return data
  } catch (error) {
    return {
      etat: 'indisponible',
      dossier: null,
      raison: 'reseau',
      message: error.message || 'Vérification impossible : le serveur est injoignable.',
    }
  }
}

/**
 * Applique le changement. Tout se joue côté serveur : rôle, forme, collision
 * sous verrou, remise à zéro Loomky, invalidation de l'état Monday des
 * annonces, et trace dans l'historique via le trigger d'audit.
 *
 * @returns {Promise<{ok: true, ancien_numero: string, nouveau_numero: string,
 *   loomky_reinitialise: boolean, annonces_invalidees: number}
 *   | {ok: false, erreur: string, message: string, fiche_en_conflit?: object}>}
 */
export async function changerNumeroBien({ ficheId, nouveauNumero }) {
  const { data, error } = await supabase.rpc('changer_numero_bien', {
    p_fiche_id: ficheId,
    p_nouveau_numero: normaliserNumeroBien(nouveauNumero),
  })

  if (error) {
    // 42501 = insufficient_privilege, levé par la fonction quand le rôle n'est
    // pas admin / super_admin (ou que le compte est désactivé).
    const erreur = error.code === '42501' ? 'ROLE_REFUSE' : 'ERREUR_SERVEUR'
    return {
      ok: false,
      erreur,
      message: MESSAGES_ERREUR[erreur] || error.message || 'Le changement de numéro a échoué.',
    }
  }

  if (!data?.ok) {
    const erreur = data?.erreur || 'ERREUR_SERVEUR'
    return {
      ok: false,
      erreur,
      message: MESSAGES_ERREUR[erreur] || 'Le changement de numéro a échoué.',
      fiche_en_conflit: data?.fiche_en_conflit,
    }
  }

  return data
}
