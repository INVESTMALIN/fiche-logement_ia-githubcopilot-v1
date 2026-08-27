// src/lib/countries.js
//
// Liste des pays acceptés par l'API Loomky pour `address.country`, et libellés
// français associés.
//
// ⚠️ Cette liste N'EST PAS la liste ISO 3166-1 complète. Loomky accepte 243 codes
// là où l'ISO en compte 249 : AX, SJ, BQ, BV, TF et HM sont des codes ISO officiels
// que Loomky refuse. Construire le sélecteur à partir d'une librairie ISO générique
// proposerait donc au coordinateur des pays qui déclenchent une 400 à la synchro.
//
// Source : liste extraite du message de validation de Loomky lui-même
// (POST /v1/property-owners, réponse 400 sur `address.country`), le 27/08/2026.
// Contraintes de format vérifiées côté API : code à DEUX LETTRES, en MAJUSCULES
// (`gb` en minuscules → 400), non vide, et présent dans cette liste.

export const DEFAULT_COUNTRY_CODE = 'FR'

export const LOOMKY_COUNTRY_CODES = [
    'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
    'AU', 'AW', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ',
    'BL', 'BM', 'BN', 'BO', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC',
    'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU',
    'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC',
    'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
    'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP',
    'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU',
    'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
    'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY',
    'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
    'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO',
    'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
    'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM',
    'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT',
    'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD',
    'SE', 'SG', 'SH', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST',
    'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM',
    'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY',
    'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT',
    'ZA', 'ZM', 'ZW'
]

const codeSet = new Set(LOOMKY_COUNTRY_CODES)

// Libellés fournis par la plateforme plutôt que recopiés à la main : les 243 codes
// résolvent tous vers un nom français via Intl.DisplayNames (vérifié). La liste des
// codes, elle, reste bornée par Loomky ci-dessus — c'est elle qui compte.
const displayNames = (() => {
    try {
        return new Intl.DisplayNames(['fr'], { type: 'region' })
    } catch (e) {
        return null
    }
})()

/**
 * Libellé français d'un code pays. Retourne le code brut si inconnu ou si
 * Intl.DisplayNames n'est pas disponible (navigateur ancien) : on préfère afficher
 * `GB` qu'une case vide.
 *
 * @param {string} code
 * @returns {string}
 */
export function getCountryLabel(code) {
    if (!code) return ''
    if (!displayNames) return code
    try {
        return displayNames.of(code) || code
    } catch (e) {
        return code
    }
}

/**
 * Options du sélecteur, triées par libellé français.
 * Bornées par LOOMKY_COUNTRY_CODES : le coordinateur ne peut pas choisir un pays
 * que Loomky refuserait.
 */
export const COUNTRY_OPTIONS = LOOMKY_COUNTRY_CODES
    .map(code => ({ code, label: getCountryLabel(code) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))

/**
 * Prédicat : le code est-il exploitable par Loomky ?
 * Strict sur la casse, comme l'API (`gb` → 400).
 *
 * @param {string|null|undefined} code
 * @returns {boolean}
 */
export function isLoomkyCountryCode(code) {
    return typeof code === 'string' && codeSet.has(code)
}
