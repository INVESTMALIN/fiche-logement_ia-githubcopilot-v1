// src/lib/verificationMonday.js
//
// 🎯 Que dit la réponse de la vérification Monday ?
//
// L'Edge Function `monday-bien` rend les lignes du board dont la colonne
// `num_ro` porte le numéro cherché. Cette règle traduit cette réponse en l'un
// des quatre états affichés par le parcours « changer le numéro de bien ».
//
// L'INVARIANT à tenir : ne jamais conclure « absent » quand on n'a pas pu
// regarder. Une panne Monday, une session expirée, un rôle refusé ou une
// réponse malformée doivent donner « indisponible » — dire « le bien n'existe
// pas dans Monday » enverrait l'administrateur créer un doublon d'une ligne qui
// existe déjà.
//
// Module volontairement SANS import : règle pure, testable directement
// (scripts/tests/mondayBien.test.mjs).

/**
 * @param {{success?: boolean, lignes?: Array<{id: string, nom: string}>}} reponse
 *   la réponse de l'Edge Function, telle quelle
 * @returns {{etat: 'trouve'|'absent'|'multiple'|'indisponible',
 *            lignes: Array<{id: string, nom: string}>}}
 */
export function evaluerReponseMonday(reponse) {
  // `Array.isArray` et pas seulement `success` : une réponse qui se dit réussie
  // sans porter de lignes n'est pas une absence, c'est une réponse qu'on ne sait
  // pas lire.
  if (!reponse || reponse.success !== true || !Array.isArray(reponse.lignes)) {
    return { etat: 'indisponible', lignes: [] }
  }

  const lignes = reponse.lignes
  if (lignes.length === 0) return { etat: 'absent', lignes }
  if (lignes.length === 1) return { etat: 'trouve', lignes }
  // Plusieurs lignes au même numéro : c'est un doublon dans Monday, et les
  // synchronisations qui cherchent ce numéro en prendraient une au hasard.
  return { etat: 'multiple', lignes }
}
