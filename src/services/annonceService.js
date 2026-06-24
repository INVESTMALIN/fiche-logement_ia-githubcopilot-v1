// src/services/annonceService.js
// Front → Edge Function `annonce-generate`. Le JWT de la session est attaché
// automatiquement par supabase-js : l'auth + le check d'ownership RLS-aware
// côté fonction s'appuient dessus (on ne génère que sur une fiche visible par
// l'utilisateur connecté).

import { supabase } from '../lib/supabaseClient'

// Modèles proposés à la comparaison (identifiants OpenRouter relevés sur
// OpenRouter). Gemini est gardé VOLONTAIREMENT : comparer des providers
// différents est tout l'intérêt d'OpenRouter. (La consigne « pas Gemini »
// concernait l'outil de review — Codex, pas Gemini Code Assist — pas les
// modèles de génération.)
export const MODELES_ANNONCE = [
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
  { id: 'openai/gpt-5.5', label: 'GPT-5.5' },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash' },
]

export const MODELE_PAR_DEFAUT = 'anthropic/claude-sonnet-4.6'

// Modèles proposés au COORDINATEUR dans FicheFinalisation (panneau agent annonce,
// « Dev en cours »). Liste curée, distincte de MODELES_ANNONCE : l'outil
// d'inspection super_admin garde GPT pour comparer les providers, mais le
// coordinateur n'a que Gemini (défaut) et Sonnet. `note` = recommandation figée
// affichée sous le sélecteur pour le guider.
export const MODELES_ANNONCE_COORDINATEUR = [
  {
    id: 'google/gemini-3-flash-preview',
    label: 'Gemini Flash 3',
    defaut: true,
    note: 'rapide et efficace, le meilleur rapport qualité-prix',
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    label: 'Sonnet',
    note: 'rédaction plus fine et nuancée, mais plus lent et plus cher',
  },
]

export const MODELE_COORDINATEUR_DEFAUT = 'google/gemini-3-flash-preview'

/**
 * Recherche les fiches par numéro de bien (logement_numero_bien). Sous RLS :
 * ne remonte que les fiches visibles par l'utilisateur connecté. Renvoie une
 * liste (un même numéro peut théoriquement matcher plusieurs fiches).
 */
export async function rechercherFichesParNumero(numero) {
  const valeur = (numero || '').trim()
  if (!valeur) return { ok: true, fiches: [] }
  const { data, error } = await supabase
    .from('fiches')
    .select('id, nom, logement_numero_bien, proprietaire_adresse_ville, statut, updated_at')
    .eq('logement_numero_bien', valeur)
    .order('updated_at', { ascending: false })
  if (error) {
    return { ok: false, message: error.message || 'Erreur lors de la recherche de la fiche.' }
  }
  return { ok: true, fiches: data || [] }
}

/**
 * Normalise la réponse d'une Edge Function annonce. Un échec HTTP non-2xx (ex.
 * MODEL_OUTPUT_INVALID / EDIT_OUTPUT_INVALID, statut `erreur`) arrive dans
 * error.context : on en extrait le JSON { success:false, error, message }. Sur
 * succès, on renvoie le payload tel quel ({ output_assemble, generation_meta… }).
 */
async function normaliserReponseAnnonce(data, error, messageDefaut) {
  if (error) {
    let payload = null
    try {
      payload = await error.context.json()
    } catch {
      payload = null
    }
    return {
      ok: false,
      error: payload?.error || 'EDGE_ERROR',
      message: payload?.message || error.message || messageDefaut,
      // Statut renvoyé par le serveur même en échec (ex. validation : une
      // revalidation ratée RÉTROGRADE la ligne en `genere`). Le caller s'en sert
      // pour garder l'UI alignée sur la base. Absent → l'UI ne touche pas au statut.
      statut: payload?.statut,
    }
  }

  if (!data || data.success !== true) {
    return {
      ok: false,
      error: data?.error || 'UNKNOWN',
      message: data?.message || messageDefaut,
      statut: data?.statut,
    }
  }

  return { ok: true, ...data }
}

/**
 * Lance la génération complète d'une annonce (repart de la fiche). (Ré)initialise
 * le point de retour de l'édition côté serveur.
 */
export async function generateAnnonce({ ficheId, plateforme, modele }) {
  const { data, error } = await supabase.functions.invoke('annonce-generate', {
    body: { ficheId, plateforme, modele },
  })
  return normaliserReponseAnnonce(data, error, 'Réponse inattendue de la génération.')
}

/**
 * Applique une consigne d'édition en langage naturel à une annonce déjà générée.
 * L'édition repart de la PROSE courante (pas de la fiche) : drift minimal, seul
 * le point visé change. Les blocs légaux/déterministes sont réinjectés à
 * l'identique par le serveur (hors de portée de la consigne). En cas d'échec,
 * l'annonce valide existante est préservée (rien n'est écrasé).
 */
export async function editAnnonce({ ficheId, plateforme, modele, consigne }) {
  const { data, error } = await supabase.functions.invoke('annonce-edit', {
    body: { ficheId, plateforme, modele, consigne, action: 'edit' },
  })
  return normaliserReponseAnnonce(data, error, 'Erreur lors de l\'application de la consigne.')
}

/**
 * Restaure la toute première version générée de l'annonce (point de retour).
 * Aucun appel modèle : le serveur ré-assemble la prose d'origine et persiste.
 */
export async function restoreAnnonce({ ficheId, plateforme }) {
  const { data, error } = await supabase.functions.invoke('annonce-edit', {
    body: { ficheId, plateforme, action: 'restore' },
  })
  return normaliserReponseAnnonce(data, error, 'Erreur lors du retour à la version d\'origine.')
}

/**
 * Valide une annonce : pousse son PDF (fabriqué côté front, transmis en base64)
 * sur la colonne fichier Monday de la plateforme, en REMPLAÇANT le précédent
 * (zéro doublon), puis passe le statut à `valide`. Si le push Monday échoue, le
 * statut reste `genere` (préservation) et l'erreur est remontée.
 */
export async function validateAnnonce({ ficheId, plateforme, pdfBase64 }) {
  const { data, error } = await supabase.functions.invoke('annonce-validate', {
    body: { ficheId, plateforme, pdfBase64 },
  })
  return normaliserReponseAnnonce(data, error, 'Erreur lors de la validation (push Monday).')
}

/**
 * Lit l'état des annonces déjà générées pour une fiche, SANS appeler le modèle.
 * Lecture directe de la table `agent_outputs` (RLS : le propriétaire de la fiche
 * voit ses lignes). Renvoie un dictionnaire indexé par plateforme — au plus une
 * ligne par plateforme (PK = (fiche_id, plateforme)). Chaque ligne expose la
 * même forme que la réponse de generateAnnonce (`output_assemble`,
 * `generation_meta`), donc directement consommable par le rendu partagé.
 */
export async function getAnnonceOutputs(ficheId) {
  if (!ficheId) return { ok: true, outputs: {} }
  const { data, error } = await supabase
    .from('agent_outputs')
    .select('plateforme, statut, output_assemble, generation_meta, modele, generated_at')
    .eq('fiche_id', ficheId)
  if (error) {
    return { ok: false, message: error.message || 'Erreur lors de la lecture des annonces générées.' }
  }
  const outputs = {}
  for (const row of data || []) outputs[row.plateforme] = row
  return { ok: true, outputs }
}
