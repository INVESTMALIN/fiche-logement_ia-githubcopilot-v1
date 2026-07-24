// src/lib/mondayFieldConstraints.js
//
// 🎯 Source unique de vérité : contraintes des colonnes `fiches` alimentées par
// les paramètres d'URL Monday (lien "Créer la fiche" du board).
//
// CONTEXTE — Incident du 13/07 (fiche 2084 BARBELLION) : la colonne Monday
// "Nombre de voyageurs" contenait « 5 + 1 bébé + 1 lit bébé » (texte libre saisi
// à la main). Cette chaîne partait telle quelle dans le paramètre `nombreDe`,
// dépassait la colonne varchar(20) et faisait échouer la CRÉATION de la ligne en
// base. La coordinatrice recevait "erreur sauvegarde" sur chaque page sans jamais
// comprendre que la fiche n'avait jamais été créée. Ce module détecte le problème
// au plus tôt (à l'ouverture du lien) et refuse la création tant que la valeur
// est invalide — sans jamais nettoyer la donnée en silence (elle est fausse dans
// Monday, c'est là qu'elle doit être corrigée).
//
// ⚠️ SCHÉMA LIVE — reflète le schéma réel de la table `fiches` au 2026-07-24
// (projet Supabase fiche-logement `qwjgkqxemnpvlhwxexht`). La doc
// `docs/🏗️ ARCHITECTURE.md` est PÉRIMÉE sur ces types (elle annonce du TEXT là
// où la base a des varchar contraints) — ne pas s'y fier.
//
// POUR RÉGÉNÉRER cette table après un changement de schéma :
//   SELECT column_name, data_type, character_maximum_length
//   FROM information_schema.columns
//   WHERE table_name = 'fiches'
//     AND column_name IN (
//       'proprietaire_prenom','proprietaire_nom','proprietaire_email',
//       'proprietaire_adresse_rue','proprietaire_adresse_ville',
//       'proprietaire_adresse_code_postal','logement_numero_bien',
//       'logement_nombre_personnes_max','logement_surface','logement_nombre_lits'
//     )
//   ORDER BY column_name;
//
// DEUX FAMILLES DE VALIDATION (cf. consigne produit) :
//   1. Paramètres à FORME connue (nombreDe, adresse[postal], numeroDu) : on valide
//      la forme attendue, PAS la longueur. Valider la longueur seule déplacerait le
//      bug ("12 bébés" fait 8 caractères, passerait varchar(20) et entrerait en
//      base comme nombre de voyageurs avant de partir dans l'agent annonce).
//   2. Paramètres réellement LIBRES (fullName → prénom/nom, adresse[city], email) :
//      la longueur de colonne est le seul garde-fou pertinent.
//
// NON VALIDÉ VOLONTAIREMENT :
//   - `m2` → logement_surface (integer). Le mapping (supabaseHelpers) applique
//     parseInt() : « 50 m² » → 50 (comportement souhaité), « cinquante » → NaN →
//     null (champ vide, visible à l'écran, se corrige tout seul). La colonne ne
//     peut donc pas faire échouer la création, et la bloquer casserait « 50 m² ».
//     Le nettoyage silencieux de parseInt est un sujet séparé (follow-up).
//   - `adresse[addr_line1]` → proprietaire_adresse_rue (TEXT, illimité).
//   - `lits` → logement_nombre_lits (TEXT, illimité).

const isPositiveIntegerString = (v) => /^\d+$/.test(v.trim())
const isFrenchPostalCode = (v) => /^\d{5}$/.test(v.trim())
const maxLength = (max) => (v) => v.length <= max

// Chaque règle : où lire la valeur brute (même arbre que le mapping Supabase),
// comment la valider, et quoi afficher au coordinateur.
const RULES = [
  // — Forme connue —
  {
    id: 'logement_nombre_personnes_max',
    sectionLabel: 'Logement',
    fieldLabel: 'Nombre de voyageurs',
    getValue: (fd) => fd?.section_logement?.nombre_personnes_max,
    isValid: isPositiveIntegerString,
    expected: 'un nombre (ex : 4)',
    // DB: logement_nombre_personnes_max varchar(20) — param Monday `nombreDe`
  },
  {
    id: 'proprietaire_adresse_code_postal',
    sectionLabel: 'Propriétaire',
    fieldLabel: 'Code postal',
    getValue: (fd) => fd?.section_proprietaire?.adresse?.codePostal,
    isValid: isFrenchPostalCode,
    expected: 'un code postal à 5 chiffres (ex : 75011)',
    // DB: proprietaire_adresse_code_postal varchar(10) — param Monday `adresse[postal]`
  },
  {
    id: 'logement_numero_bien',
    sectionLabel: 'Logement',
    fieldLabel: 'Numéro de bien',
    getValue: (fd) => fd?.section_logement?.numero_bien,
    isValid: isPositiveIntegerString,
    expected: 'un numéro composé de chiffres (ex : 2189)',
    // DB: logement_numero_bien varchar(50) — param Monday `numeroDu`
    // ⚠️ CHOIX : "chiffres uniquement". Les données live au 2026-07-24 sont à
    // 100 % numériques (majorité de nombres à 4 chiffres). Un commentaire du
    // service Monday (FormContext.triggerMondaySync) évoque d'éventuels préfixes
    // non numériques selon les conventions Letahost — non observés en base. Si un
    // tel format apparaît, élargir le regex ici (ex : /^[A-Za-z0-9-]+$/).
  },

  // — Champs libres : longueur de colonne —
  {
    id: 'proprietaire_prenom',
    sectionLabel: 'Propriétaire',
    fieldLabel: 'Prénom du propriétaire',
    getValue: (fd) => fd?.section_proprietaire?.prenom,
    isValid: maxLength(100),
    expected: 'au maximum 100 caractères',
    // DB: proprietaire_prenom varchar(100) — param Monday `fullName` (avant l'espace)
  },
  {
    id: 'proprietaire_nom',
    sectionLabel: 'Propriétaire',
    fieldLabel: 'Nom du propriétaire',
    getValue: (fd) => fd?.section_proprietaire?.nom,
    isValid: maxLength(100),
    expected: 'au maximum 100 caractères',
    // DB: proprietaire_nom varchar(100) — param Monday `fullName` (après l'espace)
  },
  {
    id: 'proprietaire_adresse_ville',
    sectionLabel: 'Propriétaire',
    fieldLabel: 'Ville',
    getValue: (fd) => fd?.section_proprietaire?.adresse?.ville,
    isValid: maxLength(100),
    expected: 'au maximum 100 caractères',
    // DB: proprietaire_adresse_ville varchar(100) — param Monday `adresse[city]`
  },
  {
    id: 'proprietaire_email',
    sectionLabel: 'Propriétaire',
    fieldLabel: 'Email du propriétaire',
    getValue: (fd) => fd?.section_proprietaire?.email,
    isValid: maxLength(255),
    expected: 'au maximum 255 caractères',
    // DB: proprietaire_email varchar(255) — param Monday `email`
  },
]

/**
 * Valide les champs de `formData` adossés à une colonne contrainte alimentée par
 * Monday. Ne signale QUE les valeurs non vides et invalides (un champ vide n'est
 * pas un problème de contrainte ici — le caractère obligatoire du numéro de bien
 * est géré séparément dans handleSave).
 *
 * @param {object} formData - état FormContext
 * @returns {Array<{id:string, sectionLabel:string, fieldLabel:string, value:string, expected:string}>}
 */
export function validateMondayConstrainedFields(formData) {
  const issues = []
  for (const rule of RULES) {
    const raw = rule.getValue(formData)
    const value = raw == null ? '' : String(raw)
    if (value.trim() === '') continue // vide = pas de blocage à ce niveau
    if (rule.isValid(value)) continue
    issues.push({
      id: rule.id,
      sectionLabel: rule.sectionLabel,
      fieldLabel: rule.fieldLabel,
      value,
      expected: rule.expected,
    })
  }
  return issues
}
