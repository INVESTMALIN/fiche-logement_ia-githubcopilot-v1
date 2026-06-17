// Tests des réconciliations du mapper (partie 4 du contrat). Fixtures
// synthétiques, aucune donnée réelle. Lancer : `deno test mapper_test.ts`.

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { mapFicheToContrat } from './mapper.ts'

Deno.test('RDC ne sort jamais d\'ascenseur (même si equipements_ascenseur=true)', () => {
  const c = mapFicheToContrat({
    logement_type_propriete: 'Appartement',
    logement_appartement_acces: 'RDC',
    equipements_ascenseur: true,
  })
  assertEquals(c.modele.identite.ascenseur, false)
})

Deno.test('Escalier → pas d\'ascenseur ; Ascenseur → ascenseur', () => {
  assertEquals(mapFicheToContrat({ logement_appartement_acces: 'Escalier' }).modele.identite.ascenseur, false)
  assertEquals(mapFicheToContrat({ logement_appartement_acces: 'Ascenseur' }).modele.identite.ascenseur, true)
})

Deno.test('Maison : niveau_maison rempli, etage_appartement null, ascenseur via équipement', () => {
  const c = mapFicheToContrat({
    logement_type_propriete: 'Maison',
    logement_type_niveau: 'Plain-pied',
    logement_appartement_etage: 'Étage : 2',
    equipements_ascenseur: true,
  })
  assertEquals(c.modele.identite.niveau_maison, 'Plain-pied')
  assertEquals(c.modele.identite.etage_appartement, null)
  assertEquals(c.modele.identite.ascenseur, true)
})

Deno.test('Atout piscine sans section piscine ne crée pas de piscine', () => {
  const c = mapFicheToContrat({ avis_atouts_piscine: true, equip_spe_ext_dispose_piscine: false })
  assertEquals(c.modele.equipements.piscine.present, false)
  assert(c.modele.atouts.atouts_logement.includes('piscine')) // reste un signal d'emphase
})

Deno.test('Consommables : positif élargi (toilette + ménage), café exclu, jamais de négatif', () => {
  // Fourni explicitement → produits réellement présents (toilette + ménage).
  const fourni = mapFicheToContrat({
    consommables_fournis_par_prestataire: true,
    consommables_gel_douche: false,
    consommables_shampoing: true,
    consommables_pastilles_lave_vaisselle: true,
  })
  assertEquals(fourni.modele.equipements.consommables.produits, ['Shampoing', 'Pastilles lave-vaisselle'])
  // Cas Codex : ménage seul (pas de toilette) → signal préservé, pas écrasé.
  const menage = mapFicheToContrat({ consommables_fournis_par_prestataire: true, consommables_pastilles_lave_vaisselle: true })
  assertEquals(menage.modele.equipements.consommables.produits, ['Pastilles lave-vaisselle'])
  // Café fourni → JAMAIS exposé (règle de prod), même si fourni=true.
  const cafe = mapFicheToContrat({ consommables_fournis_par_prestataire: true, consommables_cafe_nespresso: true })
  assertEquals(cafe.modele.equipements.consommables.produits, [])
  // Explicitement "non fourni" → aucune liste.
  const nonFourni = mapFicheToContrat({ consommables_fournis_par_prestataire: false, consommables_gel_douche: true })
  assertEquals(nonFourni.modele.equipements.consommables.produits, [])
  // Section non répondue (null/absent) → MÊME résultat, aucune absence.
  const inconnu = mapFicheToContrat({ consommables_gel_douche: true })
  assertEquals(inconnu.modele.equipements.consommables.produits, [])
  // Aucun booléen `fournis` exposé au modèle.
  assert(!('fournis' in fourni.modele.equipements.consommables))
})

Deno.test('Self check-in déduit des 4 sources (sans la mécanique)', () => {
  assertEquals(mapFicheToContrat({ clefs_boite_type: 'TTlock' }).modele.equipements.self_checkin, true)
  assertEquals(mapFicheToContrat({ clefs_digicode: true }).modele.equipements.self_checkin, true)
  assertEquals(mapFicheToContrat({ clefs_interphone: true }).modele.equipements.self_checkin, true)
  assertEquals(mapFicheToContrat({ clefs_tempo_gache: true }).modele.equipements.self_checkin, true)
  assertEquals(mapFicheToContrat({}).modele.equipements.self_checkin, false)
})

Deno.test('Doublon cinéma réconcilié en un seul signal', () => {
  assertEquals(mapFicheToContrat({ equipements_cinema: true }).modele.equipements.salle_cinema, true)
  assertEquals(mapFicheToContrat({ equip_spe_ext_dispose_salle_cinema: true }).modele.equipements.salle_cinema, true)
  assertEquals(mapFicheToContrat({}).modele.equipements.salle_cinema, false)
})

Deno.test('PMR : false = déclencheur code (phrase canon), jamais false côté modèle', () => {
  const non = mapFicheToContrat({ equipements_accessible_mobilite_reduite: false })
  assertEquals(non.code.note_etat_triggers.pmr_accessible, false) // déclenche la phrase canon
  assertEquals(non.modele.equipements.pmr.accessible, null) // jamais false côté modèle
  const oui = mapFicheToContrat({ equipements_accessible_mobilite_reduite: true, equipements_pmr_details: 'Rampe + ascenseur' })
  assertEquals(oui.modele.equipements.pmr.accessible, true)
  assertEquals(oui.modele.equipements.pmr.details, 'Rampe + ascenseur')
  assertEquals(oui.code.note_etat_triggers.pmr_accessible, true)
  const inconnu = mapFicheToContrat({})
  assertEquals(inconnu.code.note_etat_triggers.pmr_accessible, null)
  assertEquals(inconnu.modele.equipements.pmr.accessible, null)
})

Deno.test('Fêtes/fumeurs : "non" par défaut, "oui" si explicite, exposés en code ET modèle', () => {
  const vide = mapFicheToContrat({})
  assertEquals(vide.code.regles_calculees.fetes_autorisees, false)
  assertEquals(vide.code.regles_calculees.fumeurs_acceptes, false)
  assertEquals(vide.modele.regles_internes.fetes_autorisees, false)
  assertEquals(vide.modele.regles_internes.fumeurs_acceptes, false)
  const oui = mapFicheToContrat({ equipements_fetes_autorisees: true, equipements_fumeurs_acceptes: true })
  assertEquals(oui.code.regles_calculees.fetes_autorisees, true)
  assertEquals(oui.modele.regles_internes.fetes_autorisees, true)
  assertEquals(oui.modele.regles_internes.fumeurs_acceptes, true)
})

Deno.test('Caméras : détectées en zone code, exclues de securite_rassurante', () => {
  const c = mapFicheToContrat({
    securite_equipements: ['Caméras de surveillance extérieures', 'Détecteur de fumée'],
  })
  assertEquals(c.code.cameras.exterieures, true)
  assert(!c.modele.regles_internes.securite_rassurante.includes('Caméras de surveillance extérieures'))
  assert(c.modele.regles_internes.securite_rassurante.includes('Détecteur de fumée'))
})

Deno.test('Quartier défavorisé : exclu des positifs (modèle), trigger en zone code', () => {
  const c = mapFicheToContrat({ avis_quartier_types: ['quartier_central', 'quartier_defavorise'] })
  assert(!c.modele.localisation.quartier_types.includes('quartier_defavorise'))
  assert(c.modele.localisation.quartier_types.includes('quartier_central'))
  assertEquals(c.code.note_quartier_triggers.quartier_defavorise, true)
})

Deno.test('La rue n\'entre jamais dans la zone modèle', () => {
  const c = mapFicheToContrat({ proprietaire_adresse_rue: '5 Rue de l\'Eau', proprietaire_adresse_ville: 'Colmar' })
  assert(!JSON.stringify(c.modele).includes('Rue de l\'Eau'))
  assertEquals(c.modele.localisation.ville, 'Colmar')
})

Deno.test('animaux_acceptes gère le radio texte "non"/"oui"', () => {
  assertEquals(mapFicheToContrat({ exigences_animaux_acceptes: 'non' }).modele.regles_internes.animaux_acceptes, false)
  assertEquals(mapFicheToContrat({ exigences_animaux_acceptes: 'oui' }).modele.regles_internes.animaux_acceptes, true)
})

Deno.test('Localisation enrichie = placeholder (câblée à la PR suivante)', () => {
  assertEquals(mapFicheToContrat({}).modele.localisation.enrichissement, null)
})
