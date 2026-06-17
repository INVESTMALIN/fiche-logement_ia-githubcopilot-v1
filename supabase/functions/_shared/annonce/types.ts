// Contrat d'entrée de l'agent annonce — sortie du mapper (fiche brute → contrat
// propre). Deux zones nettes (cf. contrat-entree-agent-annonce-airbnb-v1.md) :
//   - `modele` : ce que le modèle voit et habille en prose (partie 2).
//   - `code`   : les données déterministes que l'ASSEMBLAGE utilisera plus tard,
//                que le modèle ne voit/ne décide jamais (partie 3).
// Agnostique de plateforme : le split Airbnb/Booking se fait à la génération.
// La rue n'apparaît JAMAIS ici (réservée au géocodage côté code).

export interface LitContrat {
  type: string // libellé lisible (ex. "Lit double 140×190")
  nombre: number
}

export interface ChambreContrat {
  nom: string | null
  lits: LitContrat[]
  autre_type_lit: string | null
}

export interface SalleDeBainContrat {
  nom: string | null
  seche_cheveux: boolean
  baignoire: boolean
  douche: boolean
}

export interface ModeleZone {
  identite: {
    type_propriete: string | null
    typologie: string | null
    surface_m2: number | null
    nombre_chambres: number | null
    chambres: ChambreContrat[]
    nombre_personnes_max: number | null
    // Étage/accès RÉCONCILIÉS (jamais deux sources contradictoires, jamais inventés).
    etage_appartement: string | null // appart/studio/loft/duplex, sinon null
    niveau_maison: string | null // maison/villa (type_niveau), sinon null
    nombre_etages_maison: string | null // maison/villa, sinon null
    acces: string | null // RDC / Escalier / Ascenseur (appartement), sinon null
    ascenseur: boolean | null // réconcilié des deux sources
  }
  localisation: {
    ville: string | null
    quartier_types: string[] // valeurs POSITIVES uniquement (défavorisé exclu → zone code)
    enrichissement: null // PLACEHOLDER — câblé à la PR suivante (bloc localisation)
  }
  equipements: {
    climatisation: boolean | null
    climatisation_types: string[]
    chauffage: boolean | null
    chauffage_types: string[]
    ventilateur: boolean | null
    ventilateur_types: string[]
    lave_linge: boolean | null
    seche_linge: boolean | null
    seche_serviettes: boolean | null
    fer_repasser: boolean | null
    etendoir: boolean | null
    tv: { present: boolean | null; type: string | null; taille: string | null; services: string[]; consoles: string[] }
    coffre_fort: boolean | null
    tourne_disque: boolean | null
    piano: { present: boolean | null; type: string | null }
    compacteur_dechets: boolean | null
    pmr: { accessible: boolean | null; details: string | null }
    wifi_present: boolean // présence seulement (jamais identifiants)
    parking: { type: string | null; sur_place_types: string[]; payant_type: string | null }
    cuisine: {
      four: boolean
      plaque_cuisson: boolean
      cuisiniere: boolean
      micro_ondes: boolean
      lave_vaisselle: boolean
      refrigerateur: boolean
      congelateur: boolean
      cafetiere: boolean
      cafetiere_types: string[]
      bouilloire: boolean
      grille_pain: boolean
      vaisselle_complete: boolean // ≥1 compteur vaisselle/couverts > 0
      verres_a_vin: boolean
    }
    salles_de_bains: SalleDeBainContrat[]
    linge_fourni: boolean | null
    // Absences conditionnelles : rempli SEULEMENT si le prestataire fournit.
    // `produits_toilette` ne liste que les présents — jamais une absence.
    consommables: { fournis: boolean; produits_toilette: string[] }
    table_a_manger: { present: boolean; nombre_places: number | null }
    canape_lit: boolean
    exterieur: {
      present: boolean | null
      types_espace: string[]
      equipements: string[]
      acces: string | null // privé / partagé
      barbecue: { present: boolean; type: string | null }
    }
    piscine: {
      present: boolean | null
      type: string | null
      acces: string | null
      dimensions: string | null
      caracteristiques: string[]
      disponibilite: string | null
    }
    jacuzzi: { present: boolean | null; acces: string | null; taille: string | null }
    sauna: { present: boolean | null; acces: string | null }
    hammam: { present: boolean | null; acces: string | null }
    cuisine_exterieure: { present: boolean | null; type: string | null; caracteristiques: string[] }
    salle_sport: boolean | null
    salle_cinema: boolean // réconcilié (equipements.cinema OU dispose_salle_cinema)
    salle_jeux: { present: boolean | null; equipements: string[] }
    local_velo: { present: boolean | null; acces: string | null }
    self_checkin: boolean // arrivée autonome déduite (jamais la mécanique des serrures)
  }
  atouts: {
    atouts_logement: string[] // clés cochées = signal d'emphase (JAMAIS un fait)
    atouts_autre: string | null
    vue_types: string[]
    exterieur_description: string | null
    renove: boolean
  }
  cible_voyageurs: {
    types_voyageurs: string[]
    types_voyageurs_autre: string | null
    teletravail: { equipements: string[]; debit: { speedtest: string | null; ethernet: boolean | null } }
    bebe: { equipements: string[]; jouets_tranches_age: string[]; lit_bebe_type: string | null; chaise_haute: boolean }
  }
  regles_internes: {
    animaux_acceptes: boolean | null
    animaux_commentaire: string | null
    securite_rassurante: string[] // équipements sécurité HORS caméras
  }
}

export interface CodeZone {
  nombre_voyageurs: number | null // passthrough de nombre_personnes_max
  reglementation: {
    numero_declaration: string | null
    classe_dpe: string | null
    dpe_depenses_min: number | null
    dpe_depenses_max: number | null
  }
  note_etat_triggers: {
    immeuble_etat_general: string | null
    immeuble_proprete: string | null
    immeuble_accessibilite: string | null
    immeuble_niveau_sonore: string | null
    grille_verdict: string | null
    grille_score_total: number | null
    grille_notes: Record<string, number | null>
    securite_dangers: string[]
    securite_danger_detecte: boolean
  }
  note_quartier_triggers: {
    quartier_securite: string | null
    quartier_perturbations: string | null
    quartier_perturbations_details: string | null
    quartier_defavorise: boolean
  }
  cameras: {
    exterieures: boolean
    interieures_communs: boolean
  }
  regles_calculees: {
    // "non" par défaut, "oui" seulement si la fiche l'indique explicitement.
    fetes_autorisees: boolean
    fumeurs_acceptes: boolean
  }
}

export interface Contrat {
  schema_version: number
  fiche_id: string | null
  modele: ModeleZone
  code: CodeZone
}
