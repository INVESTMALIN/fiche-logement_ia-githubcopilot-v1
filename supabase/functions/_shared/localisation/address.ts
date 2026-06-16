// Normalisation d'adresse : texte de géocodage + clé de détection de changement.

import type { Adresse } from './types.ts'
import { PAYS } from './config.ts'
import { normalizeText } from './util.ts'

/** Texte envoyé au géocodeur Geoapify (rue = ancre, jamais en sortie publique). */
export function geocodeText(a: Adresse): string {
  const ligneVille = `${a.code_postal || ''} ${a.ville || ''}`.trim()
  return [a.rue, ligneVille, PAYS]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * Clé stable d'une adresse (rue|code_postal|ville normalisés). Sert à décider
 * du recompute : clé identique = adresse inchangée → on réutilise les faits
 * sans rappeler Geoapify. Le complément est volontairement ignoré (n'influe
 * pas sur la position géocodée). Utilise le normaliseur partagé `normalizeText`.
 */
export function adresseKey(a: Adresse): string {
  return [normalizeText(a.rue), normalizeText(a.code_postal), normalizeText(a.ville)].join('|')
}

/**
 * Adresse suffisante pour un géocodage exploitable : au minimum la ville, plus
 * une rue ou un code postal. Sans ça, on refuse plutôt que de géocoder du vide.
 */
export function isGeocodable(a: Adresse): boolean {
  const ville = (a.ville || '').trim()
  const rue = (a.rue || '').trim()
  const cp = (a.code_postal || '').trim()
  return ville !== '' && (rue !== '' || cp !== '')
}
