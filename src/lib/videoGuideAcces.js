// src/lib/videoGuideAcces.js
//
// Compression « cible livret » de la vidéo du Guide d'accès — logique pure,
// sans import, testable avec `npm test` (scripts/tests/videoGuideAcces.test.mjs).
//
// Contexte : la vidéo du Guide d'accès est ensuite ajoutée à la main dans le
// livret d'accueil Loomky, dont la limite rapportée est « 50 Mb/Mo » (unité
// non vérifiée). On vise donc une cible prudente, unique et modifiable ICI,
// que le service Railway reçoit en paramètre (`targetSizeBytes`). Rien n'est
// garanti : on vise la cible, on ne la promet pas, et l'upload n'échoue jamais
// à cause de la compression.
//
// Seul le champ `section_guide_acces.video_acces` est concerné. Les 33 autres
// champs vidéo gardent leur seuil historique de 95 Mo dans PhotoUpload.

// 40 Mio : sous 50 Mo décimaux (50 000 000) comme sous 50 Mio (52 428 800).
export const VIDEO_GUIDE_ACCES_CIBLE_OCTETS = 40 * 1024 * 1024

// Délai maximal accordé au service Railway pour une compression du guide
// (passe CRF + éventuel encodage 2 passes). Passé ce délai, la vidéo originale
// est conservée avec l'avertissement « échec ». Les autres champs n'ont aucun
// délai aujourd'hui : celui-ci ne les concerne pas.
export const VIDEO_GUIDE_ACCES_DELAI_COMPRESSION_MS = 15 * 60 * 1000

// Valeurs persistées dans `section_guide_acces.video_avertissement`
// (colonne fiches.guide_acces_video_avertissement). null = rien à signaler.
export const AVERTISSEMENT_VIDEO_GUIDE = Object.freeze({
  // Compressée (ou originale plus légère) mais toujours au-dessus de la cible :
  // intrinsèque à la vidéo, refaire à l'identique n'y changera rien.
  TROP_LOURDE: 'trop_lourde',
  // Réseau, timeout, réponse invalide du service : originale conservée telle
  // quelle. Peut être passager, réimporter plus tard peut suffire.
  COMPRESSION_ECHOUEE: 'compression_echouee'
})

/**
 * Le déclenchement se base sur la cible, pas sur l'ancien seuil de 95 Mo :
 * sinon les vidéos entre la cible et 95 Mo passeraient à travers.
 */
export function doitCompresserVideoGuide(tailleOctets, cible = VIDEO_GUIDE_ACCES_CIBLE_OCTETS) {
  return Number.isFinite(tailleOctets) && tailleOctets > cible
}

/**
 * Lit la réponse JSON de /compress-video.
 * Retourne { url, taille } ou null si la réponse est inexploitable (champ
 * manquant, taille non numérique, URL non http) — traité comme un échec.
 */
export function lireReponseCompression(reponse) {
  if (!reponse || typeof reponse !== 'object') return null
  const { compressedUrl, compressedSize } = reponse
  if (typeof compressedUrl !== 'string' || !/^https?:\/\//.test(compressedUrl)) return null
  if (typeof compressedSize !== 'number' || !Number.isFinite(compressedSize) || compressedSize < 0) return null
  return { url: compressedUrl, taille: compressedSize }
}

/**
 * Décide quelle vidéo conserver et quel avertissement persister.
 *
 * @param {{ originale: {url: string, taille: number},
 *           compressee: {url: string, taille: number}|null,
 *           cible?: number }} p
 * @returns {{ url: string, taille: number, avertissement: string|null }}
 *   - compressee null (échec)      → originale + COMPRESSION_ECHOUEE
 *   - sinon la plus légère des deux ; au-dessus de la cible → TROP_LOURDE
 *   - sous la cible                → aucun avertissement
 */
export function choisirVideoGuide({ originale, compressee, cible = VIDEO_GUIDE_ACCES_CIBLE_OCTETS }) {
  if (!compressee) {
    return { url: originale.url, taille: originale.taille, avertissement: AVERTISSEMENT_VIDEO_GUIDE.COMPRESSION_ECHOUEE }
  }
  const retenue = compressee.taille < originale.taille ? compressee : originale
  return {
    url: retenue.url,
    taille: retenue.taille,
    avertissement: retenue.taille > cible ? AVERTISSEMENT_VIDEO_GUIDE.TROP_LOURDE : null
  }
}

/** Affichage humain d'une taille en Mio (ex. 41943040 → "40 Mio"). */
export function formaterMio(octets) {
  const mio = octets / 1024 / 1024
  return `${Number.isInteger(mio) ? mio : mio.toFixed(1)} Mio`
}
