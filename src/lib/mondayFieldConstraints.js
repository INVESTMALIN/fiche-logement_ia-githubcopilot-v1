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
//      la forme attendue EN PLUS de la longueur de colonne. Valider la longueur
//      seule déplacerait le bug ("12 bébés" fait 8 caractères, passerait
//      varchar(20) et entrerait en base comme nombre de voyageurs avant de partir
//      dans l'agent annonce) ; valider la forme seule laisserait passer un entier
//      qui déborde la colonne ("123…21 chiffres" > varchar(20) → INSERT en échec).
//      Les deux vérifications sont donc combinées.
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

// ⚠️ La validation de FORME ne dispense PAS de la limite de longueur de la
// colonne : « 123456789012345678901 » (21 chiffres) est un entier valide mais
// dépasse varchar(20) et ferait échouer l'INSERT — exactement le bug qu'on
// corrige. Les règles à forme connue combinent donc forme ET longueur.
const digitsOnly = (v) => /^\d+$/.test(v.trim())
const isFrenchPostalCode = (v) => /^\d{5}$/.test(v.trim())
const maxLength = (max) => (v) => v.length <= max
// Identifiant compact : lettres/chiffres + séparateurs usuels, mais NI espace NI
// texte libre. Autorise les formats à préfixe que le service Monday supporte
// déjà comme identifiants exacts (ex : « PAR-2189 », « A2189 ») — on ne veut
// jamais coincer un coordinateur sur un numéro légitime — tout en rejetant la
// contamination réelle type « 2084 BARBELLION » (espace) ou « 5 + 1 bébé ».
const isCompactIdentifier = (v) => /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(v.trim())

// Chaque règle : où lire la valeur brute (même arbre que le mapping Supabase),
// comment la valider, et quoi afficher au coordinateur.
const RULES = [
  // — Forme connue —
  {
    id: 'logement_nombre_personnes_max',
    sectionLabel: 'Logement',
    fieldLabel: 'Nombre de voyageurs',
    getValue: (fd) => fd?.section_logement?.nombre_personnes_max,
    isValid: (v) => digitsOnly(v) && v.length <= 20,
    expected: 'un nombre (20 chiffres maximum)',
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
    isValid: (v) => isCompactIdentifier(v) && v.length <= 50,
    expected: 'un numéro sans espace ni texte autour (ex : 2189)',
    // DB: logement_numero_bien varchar(50) — param Monday `numeroDu`
    // On valide la LONGUEUR (varchar 50) + l'absence d'espace/texte libre, PAS
    // "chiffres uniquement". Les données live au 2026-07-24 sont à 100 %
    // numériques, mais le service Monday (FormContext.triggerMondaySync) supporte
    // explicitement des identifiants à préfixe non numérique selon les
    // conventions Letahost : exiger des chiffres seuls coincerait pour toujours
    // un coordinateur sur un numéro légitime type « PAR-2189 » (la création est
    // bloquée tant que la valeur est invalide). isCompactIdentifier laisse passer
    // ces formats et ne rejette que la contamination réelle (espaces, texte).
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
