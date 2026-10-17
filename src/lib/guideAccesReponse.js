// src/lib/guideAccesReponse.js
//
// Lecture de la réponse du webhook n8n de l'assistant Guide d'accès, partagée
// par la génération initiale et le suivi (src/pages/FicheGuideAcces.jsx).
//
// Pourquoi : le 16/10, le modèle utilisé par le workflow a été retiré par
// OpenRouter et n8n a répondu HTTP 200 avec un corps vide pendant près de 24 h.
// La génération initiale plantait sur `JSON.parse` (« Unexpected end of JSON
// input ») et la coordinatrice voyait un message générique.
//
// Trois cas sont traités comme une réponse inexploitable, jamais comme un guide :
//   - corps vide (ou fait d'espaces) ;
//   - corps qui n'est pas du JSON ;
//   - JSON sans texte de guide (`{}`, `[]`, `null`, champ de sortie vide…).
//     Avant, ce dernier cas affichait « Guide généré (format non reconnu) » comme
//     s'il s'agissait d'un guide, que l'on pouvait ensuite valider en PDF.
//
// ⚠️ Module sans import : il est chargé tel quel par les tests Node
// (scripts/tests/_chargerModule.mjs).

export const CAS_REPONSE_INEXPLOITABLE = {
  VIDE: 'reponse_vide',
  NON_JSON: 'reponse_non_json',
  SANS_GUIDE: 'reponse_sans_guide',
}

export const MESSAGE_GUIDE_NON_GENERE =
  "L'assistant Guide d'accès n'a pas pu générer le guide. Réessayez un peu plus tard."

export const MESSAGE_SUIVI_SANS_REPONSE =
  "L'assistant Guide d'accès n'a pas pu répondre. Réessayez un peu plus tard."

// Longueur maximale du début de corps gardé pour le diagnostic en console.
const APERCU_MAX = 300

export class ReponseGuideAccesInexploitable extends Error {
  constructor(cas, { status, apercu = '' } = {}) {
    super(`Réponse inexploitable de l'assistant Guide d'accès (${cas}, HTTP ${status})`)
    this.name = 'ReponseGuideAccesInexploitable'
    this.cas = cas
    this.status = status
    this.apercu = apercu
  }

  // Trace console pour le prochain diagnostic : statut HTTP, cas, début du corps.
  get diagnostic() {
    return { cas: this.cas, status: this.status, apercu: this.apercu }
  }
}

/**
 * Extrait le texte du guide d'un corps de réponse déjà lu.
 * @param {string} texte corps brut de la réponse
 * @param {number} status statut HTTP (pour le diagnostic uniquement)
 * @returns {string} le texte du guide
 * @throws {ReponseGuideAccesInexploitable} si le corps est vide, non JSON ou sans guide
 */
export function extraireGuide(texte, status) {
  if (!texte || texte.trim() === '') {
    throw new ReponseGuideAccesInexploitable(CAS_REPONSE_INEXPLOITABLE.VIDE, { status })
  }

  const apercu = texte.slice(0, APERCU_MAX)

  let json
  try {
    json = JSON.parse(texte)
  } catch {
    throw new ReponseGuideAccesInexploitable(CAS_REPONSE_INEXPLOITABLE.NON_JSON, { status, apercu })
  }

  // Si c'est un array, prendre le premier élément
  const data = Array.isArray(json) ? json[0] : json
  // Aller chercher dans data.data.output si ça existe
  const guide = data?.data?.output || data?.output || data?.response

  if (typeof guide !== 'string' || guide.trim() === '') {
    throw new ReponseGuideAccesInexploitable(CAS_REPONSE_INEXPLOITABLE.SANS_GUIDE, { status, apercu })
  }

  return guide
}
