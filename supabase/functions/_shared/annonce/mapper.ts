// Mapper fiche brute → contrat d'entrée (transformation PURE).
// Implémente les parties 2, 3 et 4 du contrat + le gap-analysis v3. N'invente
// aucune règle : il déplace/réconcilie des données de la fiche.
//
// Hors périmètre (volontaire) : aucun appel modèle, aucun assemblage de phrases
// (note_etat/note_quartier ne sont QUE des déclencheurs ici), pas d'écriture en
// base, et le bloc localisation est un placeholder (PR suivante).

import { arr, bool, boolish, type FicheRow, isTrue, num, scanTrueKeys, txt } from './fiche.ts'
import type {
  ChambreContrat,
  Contrat,
  CodeZone,
  ModeleZone,
  SalleDeBainContrat,
} from './types.ts'

export const CONTRAT_SCHEMA_VERSION = 1

// Valeurs exactes stockées dans `securite_equipements` (cf. FicheSecurite.jsx).
const CAMERA_EXTERIEURE = 'Caméras de surveillance extérieures'
const CAMERA_INTERIEURE_COMMUNS = 'Caméras de surveillance intérieures (uniquement dans les espaces communs)'

const BED_TYPES: { col: string; label: string }[] = [
  { col: 'lit_simple_90_190', label: 'Lit simple 90×190' },
  { col: 'lit_double_140_190', label: 'Lit double 140×190' },
  { col: 'lit_queen_160_200', label: 'Lit Queen 160×200' },
  { col: 'lit_king_180_200', label: 'Lit King 180×200' },
  { col: 'canape_lit_simple', label: 'Canapé-lit simple' },
  { col: 'canape_lit_double', label: 'Canapé-lit double' },
  { col: 'lits_superposes_90_190', label: 'Lits superposés 90×190' },
  { col: 'lit_gigogne', label: 'Lit gigogne' },
]

const GRILLE_CRITERIA = [
  'proprete_generale', 'sols', 'murs_plafonds', 'cuisine', 'salle_bain',
  'equipements', 'menuiseries', 'odeurs', 'impression_generale',
]

// ───────────────────── Réconciliations (partie 4) ─────────────────────

function isMaison(typePropriete: string | null): boolean {
  return /maison|villa/i.test(typePropriete || '')
}

/**
 * Étage/niveau : on choisit LA source selon le type de bien, jamais les deux.
 * Appart/studio/loft/duplex → `appartement.etage`/`.acces`. Maison/villa →
 * `type_niveau`/`nombre_etages`. Source absente → null (jamais inventé).
 */
function reconcileEtageAcces(f: FicheRow) {
  const maison = isMaison(txt(f, 'logement_type_propriete'))
  return {
    etage_appartement: maison ? null : txt(f, 'logement_appartement_etage'),
    niveau_maison: maison ? txt(f, 'logement_type_niveau') : null,
    nombre_etages_maison: maison ? txt(f, 'logement_nombre_etages') : null,
    acces: maison ? null : txt(f, 'logement_appartement_acces'),
  }
}

/**
 * Ascenseur réconcilié des deux sources, sans jamais en inventer un :
 * - acces 'Ascenseur' → true ; 'RDC'/'Escalier' → false (plain-pied / par
 *   l'escalier = pas d'ascenseur mis en avant, l'acces fait foi) ;
 * - acces absent (maison, ou non renseigné) → on retombe sur la case
 *   `equipements.ascenseur` (bool 3 états, null si rien).
 */
function reconcileAscenseur(f: FicheRow, acces: string | null): boolean | null {
  if (acces === 'Ascenseur') return true
  if (acces === 'RDC' || acces === 'Escalier') return false
  return bool(f, 'equipements_ascenseur')
}

/**
 * Arrivée autonome déduite des 4 sources d'accès autonome listées par la
 * gap-analysis (§3) : boîte à clés / serrure connectée (`boiteType`), digicode,
 * interphone, tempo-gâche. On ne sort QUE le booléen (jamais le type de boîte,
 * ni les codes, ni l'emplacement de la boîte).
 */
function deduceSelfCheckin(f: FicheRow): boolean {
  return (
    !!txt(f, 'clefs_boite_type') ||
    isTrue(f, 'clefs_digicode') ||
    isTrue(f, 'clefs_interphone') ||
    isTrue(f, 'clefs_tempo_gache')
  )
}

/** Doublon cinéma réconcilié en un seul signal. */
function reconcileSalleCinema(f: FicheRow): boolean {
  return isTrue(f, 'equipements_cinema') || isTrue(f, 'equip_spe_ext_dispose_salle_cinema')
}

/**
 * PMR (zone modèle) : cas POSITIF uniquement. accessible=true → exposé avec ses
 * détails ; false ou null → null. Le "non accessible PMR" (false) est un
 * déclencheur de phrase canon en zone code (note_etat_triggers.pmr_accessible),
 * jamais formulé librement par le modèle.
 */
function pmrPositif(f: FicheRow): { accessible: true | null; details: string | null } {
  const accessible = bool(f, 'equipements_accessible_mobilite_reduite') === true
  return {
    accessible: accessible ? true : null,
    details: accessible ? txt(f, 'equipements_pmr_details') : null,
  }
}

// ───────────────────── Sous-mappers ─────────────────────

function mapChambres(f: FicheRow): ChambreContrat[] {
  const count = Math.min(6, Math.max(0, num(f, 'visite_nombre_chambres') ?? 0))
  // Studio : le formulaire (FicheChambre) force 1 "Espace nuit" (chambre_1) même
  // quand nombre_chambres = 0 → on lit chambre_1 pour ne pas perdre le couchage.
  const isStudio = txt(f, 'logement_typologie') === 'Studio'
  const n = isStudio && count === 0 ? 1 : count
  const out: ChambreContrat[] = []
  for (let i = 1; i <= n; i++) {
    const p = `chambres_chambre_${i}_`
    const lits = BED_TYPES
      .map((b) => ({ type: b.label, nombre: num(f, p + b.col) ?? 0 }))
      .filter((l) => l.nombre > 0)
    out.push({ nom: txt(f, p + 'nom_description'), lits, autre_type_lit: txt(f, p + 'autre_type_lit') })
  }
  return out
}

// Set positif "produits toilette + ménage" exposable (contrat L51, présence
// seule). Le café (`consommables_cafe_*`) est VOLONTAIREMENT absent : règle de
// prod (un consommable offert n'est jamais affiché, le prestataire pourrait
// l'oublier) ; la machine à café reste exposée comme équipement (cuisine.cafetiere).
const CONSOMMABLES: { col: string; label: string }[] = [
  { col: 'gel_douche', label: 'Gel douche' },
  { col: 'shampoing', label: 'Shampoing' },
  { col: 'apres_shampoing', label: 'Après-shampoing' },
  { col: 'pastilles_lave_vaisselle', label: 'Pastilles lave-vaisselle' },
]

/**
 * Consommables (zone modèle) : QUE du positif. La liste des consommables
 * réellement présents (toilette + ménage, café exclu), et uniquement si le
 * prestataire fournit explicitement (`=== true`). Section non répondue
 * (null/absent) OU explicitement "non fourni" → même résultat : aucune liste,
 * aucun signal. Pas de booléen `fournis` côté modèle → le modèle ne reçoit
 * jamais d'absence sur les consommables.
 */
function mapConsommables(f: FicheRow): { produits: string[] } {
  if (!isTrue(f, 'consommables_fournis_par_prestataire')) return { produits: [] }
  const produits = CONSOMMABLES.filter((c) => isTrue(f, `consommables_${c.col}`)).map((c) => c.label)
  // "Autre consommable" : présence + libellé saisi (sinon l'item n'a aucun sens).
  if (isTrue(f, 'consommables_autre_consommable')) {
    const detail = txt(f, 'consommables_autre_consommable_details')
    produits.push(detail ? `Autre : ${detail}` : 'Autre consommable')
  }
  return { produits }
}

// Règles calculées : "non" par défaut, "oui" SEULEMENT si la fiche le dit
// explicitement (=== true). Le modèle reçoit le RÉSULTAT et l'habille (zone
// modèle), il ne décide jamais ; le calcul reste déterministe ici.
const fetesAutorisees = (f: FicheRow): boolean => isTrue(f, 'equipements_fetes_autorisees')
const fumeursAcceptes = (f: FicheRow): boolean => isTrue(f, 'equipements_fumeurs_acceptes')

/**
 * Équipement bébé. La présence d'un équipement vient de la VRAIE source : la
 * case cochée dans le tableau `bebe_equipements`. Les sous-détails (type, dispo,
 * prix) sont optionnels et non requis → ne jamais déduire une présence de leur
 * seul remplissage (ex. "Chaise haute" cochée mais type vide = état valide).
 */
function mapBebe(f: FicheRow): ModeleZone['cible_voyageurs']['bebe'] {
  const equipements = arr(f, 'bebe_equipements')
  return {
    equipements,
    jouets_tranches_age: arr(f, 'bebe_jouets_tranches_age'),
    lit_bebe_type: txt(f, 'bebe_lit_bebe_type'),
    // Source = case cochée ; le type n'est qu'un détail optionnel (OR pour garder le signal).
    chaise_haute: equipements.includes('Chaise haute') || !!txt(f, 'bebe_chaise_haute_type'),
    stores_occultants: bool(f, 'bebe_lit_stores_occultants'),
  }
}

function mapSallesDeBains(f: FicheRow): SalleDeBainContrat[] {
  const n = Math.min(6, Math.max(0, num(f, 'visite_nombre_salles_bains') ?? 0))
  const out: SalleDeBainContrat[] = []
  for (let i = 1; i <= n; i++) {
    const p = `salle_de_bains_salle_de_bain_${i}_`
    // "Douche et baignoire combinées" (colonne tronquée `_com`) = baignoire avec
    // douche → le voyageur a les DEUX. On l'ajoute aux deux pour qu'une SDB
    // combinée ne ressorte jamais en tout-false (sinon on perd le seul
    // équipement de bain de cette pièce).
    const combine = isTrue(f, p + 'equipements_douche_baignoire_com')
    out.push({
      nom: txt(f, p + 'nom_description'),
      acces: txt(f, p + 'acces'),
      seche_cheveux: isTrue(f, p + 'equipements_seche_cheveux'),
      baignoire: isTrue(f, p + 'equipements_baignoire') || combine,
      douche: isTrue(f, p + 'equipements_douche') || combine,
    })
  }
  return out
}

function mapEquipements(f: FicheRow): ModeleZone['equipements'] {
  const { acces } = reconcileEtageAcces(f)
  const exterieurEquip = arr(f, 'equip_spe_ext_exterieur_equipements')
  return {
    climatisation: bool(f, 'equipements_climatisation'),
    climatisation_types: arr(f, 'equipements_climatisation_type'),
    chauffage: bool(f, 'equipements_chauffage'),
    chauffage_types: arr(f, 'equipements_chauffage_types'),
    ventilateur: bool(f, 'equipements_ventilateur'),
    ventilateur_types: arr(f, 'equipements_ventilateur_types'),
    lave_linge: bool(f, 'equipements_lave_linge'),
    seche_linge: bool(f, 'equipements_seche_linge'),
    seche_serviettes: bool(f, 'equipements_seche_serviettes'),
    fer_repasser: bool(f, 'equipements_fer_repasser'),
    etendoir: bool(f, 'equipements_etendoir'),
    tv: {
      present: bool(f, 'equipements_tv'),
      type: txt(f, 'equipements_tv_type'),
      taille: txt(f, 'equipements_tv_taille'),
      services: arr(f, 'equipements_tv_services'),
      consoles: arr(f, 'equipements_tv_consoles'),
    },
    coffre_fort: bool(f, 'equipements_coffre_fort'),
    tourne_disque: bool(f, 'equipements_tourne_disque'),
    piano: { present: bool(f, 'equipements_piano'), type: txt(f, 'equipements_piano_type') },
    compacteur_dechets: bool(f, 'equipements_compacteur_dechets'),
    pmr: pmrPositif(f),
    wifi_present: txt(f, 'equipements_wifi_statut') === 'oui',
    parking: {
      type: txt(f, 'equipements_parking_type'),
      sur_place_types: arr(f, 'equipements_parking_sur_place_types'),
      payant_type: txt(f, 'equipements_parking_payant_type'),
    },
    cuisine: {
      four: isTrue(f, 'cuisine_1_equipements_four'),
      plaque_cuisson: isTrue(f, 'cuisine_1_equipements_plaque_cuisson'),
      cuisiniere: isTrue(f, 'cuisine_1_equipements_cuisiniere'),
      micro_ondes: isTrue(f, 'cuisine_1_equipements_micro_ondes'),
      lave_vaisselle: isTrue(f, 'cuisine_1_equipements_lave_vaisselle'),
      refrigerateur: isTrue(f, 'cuisine_1_equipements_refrigerateur'),
      congelateur: isTrue(f, 'cuisine_1_equipements_congelateur'),
      cafetiere: isTrue(f, 'cuisine_1_equipements_cafetiere'),
      cafetiere_types: scanTrueKeys(f, 'cuisine_1_cafetiere_type_'),
      bouilloire: isTrue(f, 'cuisine_1_equipements_bouilloire'),
      grille_pain: isTrue(f, 'cuisine_1_equipements_grille_pain'),
      vaisselle_complete:
        (num(f, 'cuisine_2_vaisselle_assiettes_plates') ?? 0) > 0 ||
        (num(f, 'cuisine_2_couverts_verres_eau') ?? 0) > 0,
      verres_a_vin: (num(f, 'cuisine_2_couverts_verres_vin') ?? 0) > 0,
    },
    salles_de_bains: mapSallesDeBains(f),
    linge_fourni: bool(f, 'linge_dispose_de_linge'),
    consommables: mapConsommables(f),
    table_a_manger: {
      present: isTrue(f, 'salon_sam_equipements_table_manger'),
      nombre_places: num(f, 'salon_sam_nombre_places_table'),
    },
    canape_lit: isTrue(f, 'salon_sam_equipements_canape_lit'),
    exterieur: {
      present: bool(f, 'equip_spe_ext_dispose_exterieur'),
      types_espace: arr(f, 'equip_spe_ext_exterieur_type_espace'),
      equipements: exterieurEquip,
      acces: txt(f, 'equip_spe_ext_exterieur_type_acces'),
      barbecue: {
        present: !!txt(f, 'equip_spe_ext_barbecue_type') || exterieurEquip.some((e) => /barbecue/i.test(e)),
        type: txt(f, 'equip_spe_ext_barbecue_type'),
      },
    },
    piscine: {
      // FAIT = section structurée (jamais l'atout coché seul).
      present: bool(f, 'equip_spe_ext_dispose_piscine'),
      type: txt(f, 'equip_spe_ext_piscine_type'),
      acces: txt(f, 'equip_spe_ext_piscine_acces'),
      dimensions: txt(f, 'equip_spe_ext_piscine_dimensions'),
      caracteristiques: arr(f, 'equip_spe_ext_piscine_caracteristiques'),
      disponibilite: txt(f, 'equip_spe_ext_piscine_disponibilite'),
      periode_disponibilite: txt(f, 'equip_spe_ext_piscine_periode_disponibilite'),
      periode_chauffage: txt(f, 'equip_spe_ext_piscine_periode_chauffage'),
    },
    jacuzzi: {
      present: bool(f, 'equip_spe_ext_dispose_jacuzzi'),
      acces: txt(f, 'equip_spe_ext_jacuzzi_acces'),
      taille: txt(f, 'equip_spe_ext_jacuzzi_taille'),
    },
    sauna: { present: bool(f, 'equip_spe_ext_dispose_sauna'), acces: txt(f, 'equip_spe_ext_sauna_acces') },
    hammam: { present: bool(f, 'equip_spe_ext_dispose_hammam'), acces: txt(f, 'equip_spe_ext_hammam_acces') },
    cuisine_exterieure: {
      present: bool(f, 'equip_spe_ext_dispose_cuisine_exterieure'),
      type: txt(f, 'equip_spe_ext_cuisine_ext_type'),
      superficie: txt(f, 'equip_spe_ext_cuisine_ext_superficie'),
      caracteristiques: arr(f, 'equip_spe_ext_cuisine_ext_caracteristiques'),
    },
    salle_sport: bool(f, 'equip_spe_ext_dispose_salle_sport'),
    salle_cinema: reconcileSalleCinema(f),
    salle_jeux: {
      present: bool(f, 'equip_spe_ext_dispose_salle_jeux'),
      equipements: arr(f, 'equip_spe_ext_salle_jeux_equipements'),
    },
    local_velo: {
      present: bool(f, 'equip_spe_ext_dispose_local_velo'),
      acces: txt(f, 'equip_spe_ext_local_velo_type_acces'),
    },
    self_checkin: deduceSelfCheckin(f),
  }
}

function mapModele(f: FicheRow): ModeleZone {
  const eta = reconcileEtageAcces(f)
  return {
    identite: {
      type_propriete: txt(f, 'logement_type_propriete'),
      type_precision: txt(f, 'logement_type_autre_precision'),
      typologie: txt(f, 'logement_typologie'),
      surface_m2: num(f, 'logement_surface'),
      nombre_chambres: num(f, 'visite_nombre_chambres'),
      chambres: mapChambres(f),
      nombre_personnes_max: num(f, 'logement_nombre_personnes_max'),
      etage_appartement: eta.etage_appartement,
      niveau_maison: eta.niveau_maison,
      nombre_etages_maison: eta.nombre_etages_maison,
      acces: eta.acces,
      ascenseur: reconcileAscenseur(f, eta.acces),
    },
    localisation: {
      ville: txt(f, 'proprietaire_adresse_ville'),
      // POSITIFS uniquement : "quartier_defavorise" part en disclosure (zone code).
      quartier_types: arr(f, 'avis_quartier_types').filter((k) => k !== 'quartier_defavorise'),
      enrichissement: null,
    },
    equipements: mapEquipements(f),
    atouts: {
      // Clés cochées = signal d'emphase. JAMAIS un fait : aucun équipement n'est
      // déduit d'un atout (les faits viennent des sections structurées).
      atouts_logement: scanTrueKeys(f, 'avis_atouts_'),
      atouts_autre: txt(f, 'avis_atouts_logement_autre'),
      vue_types: arr(f, 'avis_vue_types'),
      exterieur_description: txt(f, 'equip_spe_ext_exterieur_description_generale'),
      renove: isTrue(f, 'avis_atouts_renove'),
    },
    cible_voyageurs: {
      types_voyageurs: scanTrueKeys(f, 'avis_voyageurs_'),
      types_voyageurs_autre: txt(f, 'avis_voyageurs_autre'),
      teletravail: {
        equipements: arr(f, 'teletravail_equipements'),
        debit: { speedtest: txt(f, 'teletravail_speedtest_resultat'), ethernet: bool(f, 'teletravail_ethernet_disponible') },
      },
      bebe: mapBebe(f),
    },
    regles_internes: {
      animaux_acceptes: boolish(f, 'exigences_animaux_acceptes'),
      animaux_commentaire: txt(f, 'exigences_animaux_commentaire'),
      // Résultats calculés (mêmes valeurs qu'en zone code) : le modèle les habille.
      fetes_autorisees: fetesAutorisees(f),
      fumeurs_acceptes: fumeursAcceptes(f),
      // Équipements sécurité HORS caméras (les caméras = zone code, traitement déterministe).
      securite_rassurante: arr(f, 'securite_equipements').filter(
        (e) => e !== CAMERA_EXTERIEURE && e !== CAMERA_INTERIEURE_COMMUNS,
      ),
    },
  }
}

function mapCode(f: FicheRow): CodeZone {
  const grilleNotes: Record<string, number | null> = {}
  for (const crit of GRILLE_CRITERIA) grilleNotes[crit] = num(f, `avis_grille_${crit}_note`)

  const securiteEquip = arr(f, 'securite_equipements')

  return {
    nombre_voyageurs: num(f, 'logement_nombre_personnes_max'),
    reglementation: {
      numero_declaration: txt(f, 'reglementation_numero_declaration'),
      classe_dpe: txt(f, 'reglementation_classe_dpe'),
      dpe_depenses_min: num(f, 'reglementation_dpe_depenses_min'),
      dpe_depenses_max: num(f, 'reglementation_dpe_depenses_max'),
    },
    note_etat_triggers: {
      immeuble_etat_general: txt(f, 'avis_immeuble_etat_general'),
      immeuble_proprete: txt(f, 'avis_immeuble_proprete'),
      immeuble_accessibilite: txt(f, 'avis_immeuble_accessibilite'),
      immeuble_niveau_sonore: txt(f, 'avis_immeuble_niveau_sonore'),
      grille_verdict: txt(f, 'avis_grille_verdict'),
      grille_score_total: num(f, 'avis_grille_score_total'),
      grille_notes: grilleNotes,
      securite_dangers: arr(f, 'avis_securite_dangers'),
      securite_danger_detecte: isTrue(f, 'avis_securite_danger_detecte') || arr(f, 'avis_securite_dangers').length > 0,
      // Tri-état : false → phrase canon "non accessible PMR" ; true/null → rien.
      pmr_accessible: bool(f, 'equipements_accessible_mobilite_reduite'),
    },
    note_quartier_triggers: {
      quartier_securite: txt(f, 'avis_quartier_securite'),
      quartier_perturbations: txt(f, 'avis_quartier_perturbations'),
      quartier_perturbations_details: txt(f, 'avis_quartier_perturbations_details'),
      quartier_defavorise: arr(f, 'avis_quartier_types').includes('quartier_defavorise'),
    },
    cameras: {
      exterieures: securiteEquip.includes(CAMERA_EXTERIEURE),
      interieures_communs: securiteEquip.includes(CAMERA_INTERIEURE_COMMUNS),
    },
    regles_calculees: {
      // Source déterministe ; le résultat est aussi exposé en zone modèle (regles_internes).
      fetes_autorisees: fetesAutorisees(f),
      fumeurs_acceptes: fumeursAcceptes(f),
    },
  }
}

/** Transforme une ligne brute `fiches` en contrat d'entrée propre (pur). */
export function mapFicheToContrat(fiche: FicheRow): Contrat {
  return {
    schema_version: CONTRAT_SCHEMA_VERSION,
    fiche_id: txt(fiche, 'id'),
    modele: mapModele(fiche),
    code: mapCode(fiche),
  }
}
