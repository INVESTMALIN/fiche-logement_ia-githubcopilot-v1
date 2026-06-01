// src/lib/phoneHelpers.js
//
// Helpers de normalisation des numéros de téléphone, partagés entre les
// intégrations API qui exigent un format E.164 strict (Loomky pour le
// propriétaire, Monday pour les contacts maintenance, etc.).
//
// La fiche et la base de données conservent toujours la saisie brute du
// coordinateur (lisible). La normalisation se fait juste avant l'envoi
// API, jamais en upstream.

/**
 * Normalise un numéro de téléphone vers le format E.164 strict
 * (`+<indicatif><digits>` sans séparateurs).
 *
 * Hypothèses métier (France-first, le projet cible un parc de logements FR) :
 *  - `+...` (international) → respecté, juste cleané des séparateurs
 *  - `00...` (vieux format intl, sémantiquement équivalent à `+`) → les deux
 *    `0` initiaux sont remplacés par `+`
 *    ex: `0033699999988` → `+33699999988`
 *  - `0...` → assumé français, le `0` initial est remplacé par `+33`
 *    ex: `0699999988` → `+33699999988`
 *  - Tout le reste retourne `''` pour laisser l'appelant gérer (fallback ou
 *    skip selon la sémantique métier).
 *
 * Validation longueur : si le numéro normalisé fait moins de 11 caractères
 * (`+` + indicatif + chiffres), on retourne `''`. Filtre les saisies
 * tronquées type `+33699` ou `06 99`.
 *
 * Cas non couverts par design (à signaler si rencontrés en prod) :
 *  - Numéros sans préfixe `0` ni `+` ni `00` (ex: `33699999999` brut) →
 *    retournent `''`. Signe d'une saisie incomplète côté coordinateur.
 *
 * @param {string|null|undefined} phone - Saisie utilisateur brute
 * @returns {string} - Numéro E.164 (`+...`) ou `''` si non normalisable / trop court
 */
export function normalizePhoneE164(phone) {
    if (!phone || typeof phone !== 'string') return ''
    const trimmed = phone.trim()
    if (!trimmed) return ''

    // On garde la trace d'un `+` initial avant de strip les séparateurs,
    // pour distinguer "+33..." (international) de "0033..." (qui serait
    // perdu sinon).
    const hasPlus = trimmed.startsWith('+')
    const digitsOnly = trimmed.replace(/\D/g, '')

    if (!digitsOnly) return '' // garbage type "abc" ou "+++"

    let normalized = ''
    if (hasPlus) {
        // Déjà international, on respecte tel quel après cleanup des séparateurs
        normalized = `+${digitsOnly}`
    } else if (digitsOnly.startsWith('00')) {
        // Vieux format intl (`00<indicatif><digits>`) équivalent à `+`.
        // ⚠️ Branche `00` testée AVANT `0` sinon `0033...` serait intercepté
        // et deviendrait `+33033...`
        normalized = `+${digitsOnly.slice(2)}`
    } else if (digitsOnly.startsWith('0')) {
        // Assumé français : remplace le 0 initial par +33
        normalized = `+33${digitsOnly.slice(1)}`
    } else {
        // Ni `+` ni `0` ni `00` au début → format non reconnu
        return ''
    }

    // Validation longueur minimale : un E.164 valide fait au moins 11
    // caractères (préfixe pays + chiffres).
    if (normalized.length < 11) return ''

    return normalized
}

/**
 * Prédicat : vrai si la valeur est normalisable en E.164 par `normalizePhoneE164`.
 *
 * À utiliser partout où la sémantique métier est "téléphone valide" — ce qui
 * dans ce projet veut dire "exploitable par les APIs aval (Loomky, Monday)".
 * Un téléphone non vide mais non reconnu (ex: `33699999988` sans `0`, sans
 * `+`, sans `00`) renvoie `false`, exactement comme un téléphone vide :
 * dans les deux cas l'API aval recevrait du vide, ce qui n'est pas ce qu'on
 * veut.
 *
 * Utilisé en deux endroits pour la cohérence amont/aval des contacts
 * maintenance :
 *   - `validateContactsMaintenance` (validationConfig.js) — bloque la
 *     finalisation
 *   - `pickContactsToPush` (mondayContactsService.js) — exclut du push
 *
 * @param {string|null|undefined} phone - Saisie utilisateur brute
 * @returns {boolean}
 */
export function isPhoneE164Normalizable(phone) {
    return normalizePhoneE164(phone) !== ''
}
