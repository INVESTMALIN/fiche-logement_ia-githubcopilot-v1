// src/lib/clefsSecours.js
//
// Boîte à clés de SECOURS (section Clés, septembre 2026, demande Victoria).
// Module PUR, sans import : chargeable tel quel par les tests Node
// (scripts/tests/_chargerModule.mjs).
//
// Certains logements ont une deuxième boîte à clés, de secours. Le bloc suit
// le déroulé de la boîte principale, limité à deux types (TTlock, Masterlock) :
//
//   section_clefs.secours                          true / false / null
//   section_clefs.secoursType                      'TTlock' | 'Masterlock' | ''
//   section_clefs.secoursEmplacement               texte
//   section_clefs.secoursEmplacementPhoto          photos (jamais effacées)
//   section_clefs.secoursEmplacementEmballage      texte
//   section_clefs.secoursEmplacementEmballagePhoto photos (jamais effacées)
//   section_clefs.secoursTtlock.{masterpinConciergerie, codeProprietaire, codeMenage}
//   section_clefs.secoursMasterlock.code
//
// Pas de données fantômes (BUG #007) : repasser à « non » vide les textes et
// les codes de la branche, changer de type vide les codes de l'autre type.
// Les PHOTOS ne sont jamais effacées (règle du repo : une photo téléversée est
// du travail de terrain) ; elles sont masquées dans les PDF et l'aperçu tant
// que la réponse n'est pas « oui » (`masquerSecoursInactif`).

export const SECOURS_TYPES = Object.freeze(['TTlock', 'Masterlock'])

export const SECOURS_PHOTOS = Object.freeze(['secoursEmplacementPhoto', 'secoursEmplacementEmballagePhoto'])

const CODES_VIDES = Object.freeze({
  secoursTtlock: Object.freeze({ masterpinConciergerie: '', codeProprietaire: '', codeMenage: '' }),
  secoursMasterlock: Object.freeze({ code: '' })
})

// Clé du sous-objet de codes propre à chaque type
const CODES_DU_TYPE = Object.freeze({ TTlock: 'secoursTtlock', Masterlock: 'secoursMasterlock' })

/**
 * Nouvelle section après la réponse à « boîte à clés de secours ? ».
 * `non` ou réponse retirée → type, emplacements (texte) et codes vidés ; les
 * photos restent. `oui` → rien n'est touché.
 */
export function appliquerReponseSecours(section, reponse) {
  const base = { ...(section || {}), secours: reponse }
  if (reponse === true) return base
  return {
    ...base,
    secoursType: '',
    secoursEmplacement: '',
    secoursEmplacementEmballage: '',
    secoursTtlock: { ...CODES_VIDES.secoursTtlock },
    secoursMasterlock: { ...CODES_VIDES.secoursMasterlock }
  }
}

/**
 * Nouvelle section après le choix du type de la boîte de secours : les codes
 * de l'AUTRE type sont vidés, ceux du type choisi sont conservés.
 */
export function appliquerTypeSecours(section, type) {
  const base = { ...(section || {}), secoursType: type }
  for (const [t, cle] of Object.entries(CODES_DU_TYPE)) {
    if (t !== type) base[cle] = { ...CODES_VIDES[cle] }
  }
  return base
}

// Libellés des champs dans les PDF et l'aperçu (le libellé générique tiré du
// nom de clé donnerait « Secours », « Secours Ttlock »…)
export const LIBELLES_SECOURS = Object.freeze({
  secours: 'Boîte à clés de secours',
  secoursType: 'Type de la boîte de secours',
  secoursEmplacement: 'Emplacement de la boîte de secours',
  secoursEmplacementPhoto: 'Emplacement boîte de secours',
  secoursEmplacementEmballage: 'Emplacement de l\'emballage (secours)',
  secoursEmplacementEmballagePhoto: 'Emballage boîte de secours',
  secoursTtlock: 'Codes TTlock (boîte de secours)',
  secoursMasterlock: 'Code Masterlock (boîte de secours)'
})

/**
 * Données de section à RENDRE (PDF logement, PDF ménage, aperçu). Tant que la
 * réponse n'est pas « oui », tout le bloc de secours est retiré du rendu,
 * photos comprises — sauf la réponse elle-même. Les autres sections passent
 * telles quelles.
 */
export function masquerSecoursInactif(sectionKey, sectionData) {
  if (sectionKey !== 'section_clefs' || !sectionData || typeof sectionData !== 'object') return sectionData
  if (sectionData.secours === true) return sectionData
  const visible = {}
  for (const [cle, valeur] of Object.entries(sectionData)) {
    if (cle !== 'secours' && cle.startsWith('secours')) continue
    visible[cle] = valeur
  }
  return visible
}

/**
 * Valeur de la colonne Monday « BAC secours » :
 *   - oui + type reconnu → 'TTlock' | 'Masterlock' ;
 *   - non (ou oui sans type) → null : la colonne est vidée ;
 *   - question jamais répondue (null / absente) → `undefined` : le champ n'est
 *     PAS FOURNI au sync, qui ne touche donc pas la colonne. Toutes les fiches
 *     antérieures au champ sont dans ce cas : l'équipe peut renseigner la
 *     colonne à la main pour ces biens sans qu'une sauvegarde l'efface.
 */
export function valeurMondayBacSecours(section) {
  if (section?.secours === true) return SECOURS_TYPES.includes(section?.secoursType) ? section.secoursType : null
  if (section?.secours === false) return null
  return undefined
}
