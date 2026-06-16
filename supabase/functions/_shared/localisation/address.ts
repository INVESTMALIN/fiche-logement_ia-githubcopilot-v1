// Normalisation d'adresse : texte de géocodage + clé de détection de changement.

import type { Adresse } from './types.ts'
import { PAYS } from './config.ts'

/** Texte envoyé au géocodeur Geoapify (rue = ancre, jamais en sortie publique). */
export function geocodeText(a: Adresse): string {
  const ligneVille = `${a.code_postal || ''} ${a.ville || ''}`.trim()
  return [a.rue, ligneVille, PAYS]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(', ')
}

function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Clé stable d'une adresse (rue|code_postal|ville normalisés). Sert à décider
 * du recompute : clé identique = adresse inchangée → on réutilise les faits
 * sans rappeler Geoapify. Le complément est volontairement ignoré (n'influe
 * pas sur la position géocodée).
 */
export function adresseKey(a: Adresse): string {
  return [norm(a.rue), norm(a.code_postal), norm(a.ville)].join('|')
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
