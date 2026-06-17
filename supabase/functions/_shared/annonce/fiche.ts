// Accès bas niveau à une ligne brute de la table `fiches` (colonnes à plat,
// pattern `{section}_{champ}`). Le mapper lit ces colonnes ; ces helpers
// normalisent les valeurs (null/vide, booléens 3 états, arrays, nombres).

// deno-lint-ignore no-explicit-any
export type FicheRow = Record<string, any>

/** Texte non vide, sinon null (trim). */
export function txt(f: FicheRow, col: string): string | null {
  const v = f[col]
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/** Booléen 3 états : true / false / null (les colonnes bool de la fiche sont déjà en `?? null`). */
export function bool(f: FicheRow, col: string): boolean | null {
  const v = f[col]
  return v === true ? true : v === false ? false : null
}

/**
 * Booléen tolérant : gère les booléens natifs ET les chaînes radio "oui"/"non"
 * (certains champs, ex. `exigences_animaux_acceptes`, sont stockés en texte).
 * Superset sûr de `bool` (true→true, false→false, null→null).
 */
export function boolish(f: FicheRow, col: string): boolean | null {
  const v = f[col]
  if (v === true) return true
  if (v === false) return false
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'oui' || s === 'true') return true
    if (s === 'non' || s === 'false') return false
  }
  return null
}

/** Présence stricte : true uniquement si la colonne vaut exactement `true`. */
export function isTrue(f: FicheRow, col: string): boolean {
  return f[col] === true
}

/** Array de chaînes non vides (les colonnes TEXT[] de la fiche). */
export function arr(f: FicheRow, col: string): string[] {
  const v = f[col]
  if (!Array.isArray(v)) return []
  return v.filter((x) => x != null && String(x).trim() !== '').map((x) => String(x))
}

/** Nombre fini, sinon null (colonnes int ou texte numérique). */
export function num(f: FicheRow, col: string): number | null {
  const v = f[col]
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Suffixes des colonnes `${prefix}*` valant exactement true (cases cochées).
 * Ex. scanTrueKeys(f, 'avis_atouts_') → ['central','renove',...]. Les colonnes
 * texte voisines (ex. `avis_atouts_logement_autre`) sont écartées (valeur ≠ true).
 */
export function scanTrueKeys(f: FicheRow, prefix: string): string[] {
  const out: string[] = []
  for (const k of Object.keys(f)) {
    if (k.startsWith(prefix) && f[k] === true) out.push(k.slice(prefix.length))
  }
  return out
}
